"""FINAL MIX local engine. Never bind this service to a public interface."""
from __future__ import annotations
import asyncio, importlib.util, json, os, secrets, shutil, sys, tempfile, threading, time, uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Literal
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field
from . import dsp
import numpy as np

TOKEN=secrets.token_urlsafe(32)
ROOT=Path(__file__).resolve().parent.parent
# A private per-launch directory, removed on orderly shutdown. TTL cleanup during runtime.
STORE=Path(tempfile.mkdtemp(prefix='finalmix-')); STORE.chmod(0o700)
POOL=ThreadPoolExecutor(max_workers=1)
JOBS={}; LOCK=threading.Lock()
app=FastAPI(title='FINAL MIX Local Engine',version='0.1.0',docs_url=None,redoc_url=None,openapi_url=None)

class Settings(BaseModel):
    model_config=ConfigDict(extra='forbid',allow_inf_nan=False)
    target_lufs:float=Field(default=-14,ge=-24,le=-8)
    ceiling_db:float=Field(default=-1,ge=-6,le=-.3)
    low_db:float=Field(default=0,ge=-6,le=6)
    mid_db:float=Field(default=0,ge=-6,le=6)
    high_db:float=Field(default=0,ge=-6,le=6)
    width:float=Field(default=1,ge=0,le=1.5)
    compression:float=Field(default=0,ge=0,le=1)
    auto_correct:bool=True
    strategy:Literal['stereo','stems','hybrid']='stereo'
    stem_gains:dict[str,float]=Field(default_factory=dict)
    bit_depth:Literal[16,24,32]=24
    sample_rate:Literal[0,44100,48000,96000]=0
    format:Literal['wav','mp3']='wav'
    reference_intensity:float=Field(default=.5,ge=0,le=1)
    model_consent:bool=False

def available(): return importlib.util.find_spec('demucs') is not None

@app.middleware('http')
async def protect(request:Request,call_next):
    host=request.headers.get('host','')
    allowed={'127.0.0.1:8765','localhost:8765','[::1]:8765'}
    if host not in allowed: return JSONResponse({'detail':'Local engine Host rejected'},403)
    origin=request.headers.get('origin')
    if origin and origin not in {'http://127.0.0.1:8765','http://localhost:8765','http://[::1]:8765'}:
        return JSONResponse({'detail':'Cross-origin engine access rejected'},403)
    if request.headers.get('sec-fetch-site')=='cross-site': return JSONResponse({'detail':'Cross-site access rejected'},403)
    if request.url.path.startswith('/api/') and request.url.path not in ('/api/health','/api/session'):
        supplied=request.headers.get('x-final-mix-token','')
        if not secrets.compare_digest(supplied,TOKEN): return JSONResponse({'detail':'Session token required'},401)
    length=request.headers.get('content-length')
    if request.method=='POST' and (not length or not length.isdigit() or int(length)>2*dsp.MAX_BYTES+16384):
        return JSONResponse({'detail':'Valid Content-Length required; upload maximum 300 MiB'},413)
    response=await call_next(request)
    response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Content-Security-Policy']="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; worker-src 'self' blob:; frame-src https://www.youtube-nocookie.com; frame-ancestors 'none'"
    return response

@app.get('/api/health')
def health():
    return {'mode':'local','version':'0.1.0','separation_available':available(),'ffmpeg_available':bool(shutil.which('ffmpeg') and shutil.which('ffprobe')),'max_seconds':dsp.MAX_SECONDS,'max_bytes':dsp.MAX_BYTES,'model_status':'experimental; separate weight licensing review required','storage':'temporary; 6-hour TTL; never uploaded for training'}

@app.get('/api/session')
def session(): return {'token':TOKEN}

def find_job(id):
    with LOCK: job=JOBS.get(id)
    if not job: raise HTTPException(404,'Unknown or deleted job')
    return job

def progress(job,stage,pct):
    if job['cancel'].is_set(): raise RuntimeError('Processing cancelled')
    job.update(stage=stage,progress=pct)

def separation(job,path,x,sr,settings):
    if not available(): raise ValueError('Demucs is not installed. Use the optional model installer, or choose Stereo.')
    if not settings['model_consent']: raise ValueError('Explicit model download/license consent is required for experimental separation.')
    progress(job,'Separating estimated stems with HTDemucs (first run downloads model)',25)
    directory=job['directory']/'separated'
    dsp.run([sys.executable,'-m','demucs','-n','htdemucs','--float32','--device','cpu','--out',str(directory),str(path)],job['cancel'],7200)
    stems={}; total=np.zeros_like(x)
    for name in ('vocals','drums','bass','other'):
        matches=list(directory.glob(f'htdemucs/*/{name}.wav'))
        if len(matches)!=1: raise RuntimeError('Model did not produce the expected four stems')
        a,_=dsp.decode(matches[0],job['cancel'],sr)
        if a.shape[1]!=x.shape[1]: a=a.mean(axis=1,keepdims=True) if x.shape[1]==1 else np.repeat(a,2,axis=1)
        a=np.pad(a,((0,max(0,len(x)-len(a))),(0,0)))[:len(x)]
        stems[name]=a; total+=a
        export=job['directory']/f'{name}.wav'; dsp.write_float(export,a,sr); job['files'][name]=export
    error=float(np.sqrt(np.mean((total-x)**2))/(np.sqrt(np.mean(x*x))+1e-12))
    if error>.25:
        return x,['Stem sum differs from source by more than 25% RMS; conservative stereo fallback.'],{'reconstruction_error_ratio':error,'fallback':True}
    remixed=sum(stems[k]*10**(float(settings['stem_gains'].get(k,0))/20) for k in stems)
    if settings['strategy']=='hybrid': remixed=.5*x+.5*remixed
    return remixed,['Estimated AI stems; not original tracks. Explicit stem gain adjustments applied. Reconstruction error cannot certify absence of audible artifacts.'],{'reconstruction_error_ratio':error,'fallback':False}

def process(job):
    try:
        job['status']='running'; settings=job['settings']; cancel=job['cancel']; directory=job['directory']
        progress(job,'Decoding original',5); x,sr=dsp.decode(job['files']['original'],cancel)
        original=directory/'original.wav'; dsp.write_float(original,x,sr); job['files']['original']=original
        progress(job,'Measuring original recording',12); before=dsp.analyze(x,sr,original,cancel); decisions=[]; separation_report=None
        if 'reference' in job['files']:
            progress(job,'Measuring authorized reference',18); ref,rr=dsp.decode(job['files']['reference'],cancel); reference=dsp.analyze(ref,rr,job['files']['reference'],cancel)
            intensity=settings['reference_intensity']
            for param,band in [('low_db','bass'),('mid_db','low_mid'),('high_db','presence')]:
                correction=10*np.log10((reference['bands'][band]+1e-8)/(before['bands'][band]+1e-8)); settings[param]=float(np.clip(settings[param]+np.clip(correction,-3,3)*intensity,-6,6))
            if reference['integrated_lufs'] is not None: settings['target_lufs']=float(np.clip((1-intensity)*settings['target_lufs']+intensity*reference['integrated_lufs'],-24,-8))
            decisions.append('Reference matching uses bounded broad-band energy ratios and loudness only, not vocal or instrument matching.')
        if settings['strategy']!='stereo': x,notes,separation_report=separation(job,original,x,sr,settings); decisions+=notes
        progress(job,'Corrective mix and gain staging',55); mixed,notes=dsp.mix(x,sr,settings,before); decisions+=notes
        mixed_path=directory/'mix.wav'; dsp.write_float(mixed_path,mixed,sr); job['files']['mix']=mixed_path
        progress(job,'Measuring mix',65); mix_analysis=dsp.analyze(mixed,sr,mixed_path,cancel)
        mastered,notes=dsp.master(mixed,sr,settings['target_lufs'],settings['ceiling_db']-.15,mix_analysis); decisions+=notes
        progress(job,'Exporting master',77); output=directory/('master.'+settings['format']); metadata=dsp.export_audio(mastered,sr,output,settings,cancel)
        progress(job,'Verifying exported audio',88); checked,cr=dsp.decode(output,cancel); after=dsp.analyze(checked,cr,output,cancel)
        # Recheck after sample-rate conversion, dither or lossy encoding. Up to 3 attenuation passes.
        for _ in range(3):
            if after['true_peak_db'] is None or after['true_peak_db']<=settings['ceiling_db']+.02: break
            attenuation=settings['ceiling_db']-after['true_peak_db']-.2; mastered*=10**(attenuation/20)
            decisions.append(f'Post-export true peak exceeded ceiling; attenuated {attenuation:.2f} dB and re-exported.')
            metadata=dsp.export_audio(mastered,sr,output,settings,cancel); checked,cr=dsp.decode(output,cancel); after=dsp.analyze(checked,cr,output,cancel)
        duration_ok=abs(after['duration']-before['duration'])<max(.05,2/cr)
        peak_ok=after['true_peak_db'] is None or after['true_peak_db']<=settings['ceiling_db']+.02
        if not duration_ok or not peak_ok or after['clipped_samples']: raise RuntimeError('Export failed duration/clipping/true-peak verification; output withheld.')
        job['files']['master']=output
        job['report']={'before':before,'mix':mix_analysis,'after':after,'export':metadata,'decisions':decisions,'settings':settings,'separation':separation_report,'quality':{'duration_consistent':duration_ok,'true_peak_pass':peak_ok,'no_clipping':after['clipped_samples']==0,'listening_test':'Required; technical checks do not establish professional sonic quality.'}}
        progress(job,'Complete',100); job['status']='complete'
    except Exception as exc:
        job['status']='cancelled' if job['cancel'].is_set() else 'error'; job['error']=str(exc)
    finally:
        job['finished']=time.time()
        if job['cancel'].is_set(): shutil.rmtree(job['directory'],ignore_errors=True)

async def save_upload(upload,destination):
    total=0
    with destination.open('wb') as f:
        while chunk:=await upload.read(1024*1024):
            total+=len(chunk)
            if total>dsp.MAX_BYTES: raise HTTPException(413,'Each audio file must be under 150 MiB')
            f.write(chunk)
    await upload.close()
    if not total: raise HTTPException(400,'Empty audio file')

@app.post('/api/jobs')
async def create_job(audio:UploadFile=File(...),reference:UploadFile|None=File(None),settings:str=Form('{}')):
    try: config=Settings.model_validate_json(settings).model_dump()
    except Exception as exc: raise HTTPException(422,'Invalid processing settings') from exc
    if any(k not in ('vocals','drums','bass','other') or not isinstance(v,(float,int)) or not np.isfinite(v) or not -12<=v<=12 for k,v in config['stem_gains'].items()): raise HTTPException(422,'Stem gains must be -12 to +12 dB')
    with LOCK:
        if len(JOBS)>=12 or sum(j['status'] in ('queued','running') for j in JOBS.values())>=3: raise HTTPException(429,'Local job limit reached; delete completed jobs first')
        id=uuid.uuid4().hex; directory=STORE/id; directory.mkdir()
        job={'id':id,'directory':directory,'status':'queued','stage':'Queued','progress':0,'settings':config,'cancel':threading.Event(),'files':{},'created':time.time()}; JOBS[id]=job
    try:
        path=directory/'input.audio'; await save_upload(audio,path); job['files']['original']=path
        if reference:
            ref=directory/'reference.audio'; await save_upload(reference,ref); job['files']['reference']=ref
        POOL.submit(process,job)
    except Exception:
        shutil.rmtree(directory,ignore_errors=True)
        with LOCK: JOBS.pop(id,None)
        raise
    return {'id':id}

@app.get('/api/jobs/{id}')
def get_job(id:str):
    job=find_job(id); return {k:job[k] for k in ('id','status','stage','progress','report','error') if k in job}

@app.delete('/api/jobs/{id}')
def delete_job(id:str):
    job=find_job(id); job['cancel'].set()
    if job['status'] not in ('queued','running'): shutil.rmtree(job['directory'],ignore_errors=True)
    with LOCK: JOBS.pop(id,None)
    return {'deleted':True}

@app.get('/api/jobs/{id}/audio')
def get_audio(id:str,kind:str='master'):
    job=find_job(id)
    if job['status']!='complete': raise HTTPException(409,'Audio is available only after processing completes')
    if kind not in ('master','mix','original','vocals','drums','bass','other'): raise HTTPException(400,'Unknown audio kind')
    path=job['files'].get(kind)
    if not path or not path.exists(): raise HTTPException(404,'Audio kind not available')
    return FileResponse(path,media_type='audio/mpeg' if path.suffix=='.mp3' else 'audio/wav',filename=f'finalmix-{kind}{path.suffix}')

@app.on_event('startup')
async def start_cleanup():
    async def cleanup():
        while True:
            await asyncio.sleep(60)
            with LOCK: stale=[k for k,j in JOBS.items() if j.get('finished',time.time())<time.time()-21600]
            for k in stale:
                try: delete_job(k)
                except HTTPException: pass
    app.state.cleanup=asyncio.create_task(cleanup())

@app.on_event('shutdown')
def stop():
    for job in list(JOBS.values()): job['cancel'].set()
    POOL.shutdown(wait=True,cancel_futures=True); shutil.rmtree(STORE,ignore_errors=True)

if (ROOT/'out').exists(): app.mount('/',StaticFiles(directory=ROOT/'out',html=True),name='frontend')
else:
    @app.get('/')
    def missing_frontend(): return {'detail':'Build the frontend with pnpm build, then restart the engine. API is available.'}
