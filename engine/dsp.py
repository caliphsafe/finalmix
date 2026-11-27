"""Measured, conservative stereo DSP; float64 working arrays."""
from __future__ import annotations
import json, math, re, subprocess, tempfile
from pathlib import Path
import numpy as np
from scipy import signal, ndimage
MAX_SECONDS=600
MAX_BYTES=150*1024*1024

def run(command,cancel=None,timeout=600):
    with tempfile.TemporaryFile() as stdout, tempfile.TemporaryFile() as stderr:
        p=subprocess.Popen(command,stdout=stdout,stderr=stderr)
        import time
        start=time.monotonic()
        while p.poll() is None:
            if (cancel and cancel.is_set()) or time.monotonic()-start>timeout:
                p.kill(); p.wait(); raise RuntimeError('Processing cancelled' if cancel and cancel.is_set() else 'Processing timed out')
            time.sleep(.05)
        stdout.seek(0); stderr.seek(0); out,err=stdout.read(),stderr.read().decode(errors='replace')
        if p.returncode: raise RuntimeError(err[-1800:] or 'Audio subprocess failed')
        return out,err

def probe(path,cancel=None):
    out,_=run(['ffprobe','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','mp3,wav,flac,aiff,mov,ogg','-show_streams','-show_format','-of','json',str(path)],cancel,30)
    info=json.loads(out); tracks=[s for s in info.get('streams',[]) if s.get('codec_type')=='audio']
    if not tracks: raise ValueError('No audio stream found')
    s=tracks[0]; duration=float(s.get('duration') or info.get('format',{}).get('duration') or 0)
    if not 0<duration<=MAX_SECONDS: raise ValueError('Audio must be between 0 and 600 seconds')
    rate=int(s['sample_rate']); channels=int(s['channels'])
    if duration*rate*channels>60_000_000: raise ValueError('Decoded audio exceeds the 60-million-sample memory limit; use a shorter file or lower sample rate')
    if not 8000<=rate<=192000 or channels not in (1,2): raise ValueError('Only mono/stereo audio at 8–192 kHz is supported')
    return {'sample_rate':rate,'channels':channels,'duration':duration,'codec':s.get('codec_name'),'bits':int(s.get('bits_per_raw_sample') or s.get('bits_per_sample') or 0)}

def decode(path,cancel=None,rate=None):
    info=probe(path,cancel); sr=rate or info['sample_rate']
    raw,_=run(['ffmpeg','-v','error','-protocol_whitelist','file,pipe','-format_whitelist','mp3,wav,flac,aiff,mov,ogg','-i',str(path),'-map','0:a:0','-t',str(MAX_SECONDS),'-ar',str(sr),'-f','f64le','-acodec','pcm_f64le','-'],cancel)
    x=np.frombuffer(raw,dtype='<f8').reshape(-1,info['channels']).copy()
    if not len(x) or not np.isfinite(x).all(): raise ValueError('Invalid decoded samples')
    return x,sr

def write_float(path,x,sr):
    from scipy.io import wavfile
    wavfile.write(path,sr,np.asarray(x,dtype=np.float32))
def db(value): return float(20*np.log10(max(float(value),1e-12)))
def finite(value):
    try:
        f=float(value); return f if math.isfinite(f) else None
    except (TypeError,ValueError): return None

def loudness(path,cancel=None):
    _,err=run(['ffmpeg','-hide_banner','-nostats','-protocol_whitelist','file,pipe','-format_whitelist','mp3,wav,flac,aiff,mov,ogg','-i',str(path),'-af','loudnorm=I=-14:TP=-1:LRA=11:print_format=json','-f','null','-'],cancel)
    matches=re.findall(r'\{\s*"input_i".*?\}',err,re.S)
    if not matches: raise ValueError('Loudness measurement failed')
    d=json.loads(matches[-1]); return {'integrated_lufs':finite(d['input_i']),'true_peak_db':finite(d['input_tp']),'loudness_range_lu':finite(d['input_lra'])}

def analyze(x,sr,path=None,cancel=None):
    if cancel and cancel.is_set(): raise RuntimeError('Processing cancelled')
    rms=np.sqrt(np.mean(x*x)); peak=np.max(np.abs(x)); mono=x.mean(axis=1)
    f,p=signal.welch(x,fs=sr,nperseg=min(8192,len(x)),axis=0); p=p.mean(axis=1); total=float(np.sum(p))+1e-30
    bands={name:float(p[(f>=lo)&(f<hi)].sum()/total) for name,lo,hi in [('sub',20,60),('bass',60,250),('low_mid',250,500),('mid',500,2000),('presence',2000,6000),('air',6000,24000)]}
    correlation=1.; width=0.
    if x.shape[1]==2:
        l,r=x.T; denom=np.sqrt(np.sum(l*l)*np.sum(r*r)); correlation=float(np.sum(l*r)/denom) if denom>1e-20 else 1.
        mid=(l+r)/2; side=(l-r)/2; width=float(np.sqrt(np.mean(side*side)/(np.mean(mid*mid)+1e-20)))
    window=max(1,int(sr*.4)); energies=np.array([np.mean(x[i:i+window]**2) for i in range(0,len(x),window)]); nonzero=energies[energies>1e-12]
    result={'duration':len(x)/sr,'sample_rate':sr,'channels':x.shape[1],'sample_peak_db':db(peak),'rms_db':db(rms),'crest_db':db(peak)-db(rms),'clipped_samples':int(np.sum(np.abs(x)>=1)),'phase_correlation':correlation,'side_mid_ratio':width,'mono_rms_db':db(np.sqrt(np.mean(mono*mono))),'spectral_centroid_hz':float(np.sum(f*p)/total),'bands':bands,'silence_fraction':float(np.mean(energies<1e-8)),'quiet_window_rms_db':float(10*np.log10(max(np.percentile(energies,10),1e-24))),'window_dynamic_range_db':float(10*np.log10(np.percentile(nonzero,95)/max(np.percentile(nonzero,10),1e-24))) if len(nonzero) else 0.,'measurement_notes':['Quiet-window RMS is not an isolated noise-floor measurement.','Band energy is not proof of masking, vocal presence, sibilance or distortion.','BPM, key, section and genre detection are not implemented.']}
    if path: result.update(loudness(path,cancel))
    return result

def equalize(x,sr,frequency,gain,q=.707,kind='peak'):
    if abs(gain)<.001 or frequency>=sr*.45: return x
    A=10**(gain/40); w=2*np.pi*frequency/sr; c=np.cos(w); s=np.sin(w); alpha=s/(2*q)
    if kind=='peak': b=[1+alpha*A,-2*c,1-alpha*A]; a=[1+alpha/A,-2*c,1-alpha/A]
    else:
        beta=2*np.sqrt(A)*alpha
        if kind=='low': b=[A*((A+1)-(A-1)*c+beta),2*A*((A-1)-(A+1)*c),A*((A+1)-(A-1)*c-beta)]; a=[(A+1)+(A-1)*c+beta,-2*((A-1)+(A+1)*c),(A+1)+(A-1)*c-beta]
        else: b=[A*((A+1)+(A-1)*c+beta),-2*A*((A-1)+(A+1)*c),A*((A+1)+(A-1)*c-beta)]; a=[(A+1)-(A-1)*c+beta,2*((A-1)-(A+1)*c),(A+1)-(A-1)*c-beta]
    return signal.lfilter(np.array(b)/a[0],np.array(a)/a[0],x,axis=0)

def mix(x,sr,settings,analysis):
    y=x.copy(); decisions=[]; low=float(settings.get('low_db',0)); mid=float(settings.get('mid_db',0)); high=float(settings.get('high_db',0))
    if settings.get('auto_correct',True):
        if analysis['bands']['low_mid']>.30: mid-=min(2,(analysis['bands']['low_mid']-.30)*10); decisions.append('Reduced 250–500 Hz energy because it exceeded 30% of spectral energy; heuristic, review by ear.')
        if analysis['bands']['presence']>.45: high-=1.5; decisions.append('Gentle high shelf cut: presence-band energy exceeded 45%; heuristic, review by ear.')
    for f,g,k in [(140,low,'low'),(350,mid,'peak'),(4500,high,'high')]:
        y=equalize(y,sr,f,float(np.clip(g,-6,6)),kind=k)
        if abs(g)>.001: decisions.append(f'{k} EQ at {f} Hz: {g:+.2f} dB')
    width=float(settings.get('width',1))
    if y.shape[1]==2:
        if analysis['phase_correlation']<0 and width>1: width=1; decisions.append('Declined widening because input correlation is negative.')
        m=y.mean(axis=1); s=(y[:,0]-y[:,1])/2*width; y=np.stack([m+s,m-s],axis=1)
        if width!=1: decisions.append(f'Mid/side width multiplier {width:.2f}')
    amount=float(settings.get('compression',0))
    if amount>0:
        env=np.sqrt(ndimage.uniform_filter1d(np.mean(y*y,axis=1),max(1,int(sr*.02)),mode='nearest')+1e-20)
        threshold=max(.05,float(np.percentile(env,70))); ratio=1+amount*2
        reduction=np.maximum(0,20*np.log10(env/threshold))*(1-1/ratio); reduction=ndimage.uniform_filter1d(reduction,max(1,int(sr*.01)),mode='nearest')
        y*=10**(-reduction[:,None]/20); decisions.append(f'Linked RMS compression, ratio {ratio:.2f}:1, measured threshold {db(threshold):.1f} dBFS; no makeup gain.')
    peak=float(np.max(np.abs(y)))
    if peak>10**(-3/20):
        gain=10**(-3/20)/peak; y*=gain; decisions.append(f'Mix headroom: {db(gain):.2f} dB attenuation.')
    return y,decisions

def master(x,sr,target,ceiling,analysis):
    measured=analysis.get('integrated_lufs'); decisions=[]
    if measured is None: return x.copy(),['Silence: loudness gain bypassed.']
    gain_db=float(np.clip(target-measured,-18,12)); y=x*10**(gain_db/20)
    tp=0.
    for start in range(0,len(y),sr*4):
        block=y[max(0,start-32):min(len(y),start+sr*4+32)]
        tp=max(tp,float(np.max(np.abs(signal.resample_poly(block,4,1,axis=0)))))
    limit=10**(ceiling/20)
    if tp>limit:
        y*=limit/tp; gain_db+=db(limit/tp); decisions.append('Requested loudness limited by peak headroom; dynamics preserved with linear gain.')
    decisions.append(f'Master gain {gain_db:+.2f} dB; 4× oversampled peak ceiling {ceiling:.1f} dBTP.')
    return y,decisions

def export_audio(x,sr,destination,settings,cancel=None):
    destination=Path(destination); source=destination.parent/'export-source.wav'; write_float(source,x,sr)
    rate=int(settings.get('sample_rate') or sr); depth=int(settings.get('bit_depth',24)); fmt=settings.get('format','wav'); codec={16:'pcm_s16le',24:'pcm_s24le',32:'pcm_f32le'}[depth]
    args=['ffmpeg','-v','error','-y','-i',str(source),'-map','0:a:0','-ar',str(rate)]
    if fmt=='mp3': args+=['-c:a','libmp3lame','-b:a','320k']
    else: args+=['-af','aresample=dither_method=triangular','-c:a',codec]
    run(args+[str(destination)],cancel); source.unlink(missing_ok=True); return probe(destination,cancel)
