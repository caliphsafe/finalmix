'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Activity, AudioLines, Check, Cloud, Download, FileAudio, FolderOpen, LockKeyhole, LogOut, Pause, Play, Plus, RefreshCw, ShieldCheck, SlidersHorizontal, Upload, X } from 'lucide-react';
import type { JobManifest, ProjectManifest } from '@/lib/cloud-types';

type Services = { access: boolean; r2: boolean; modal: boolean; processingEnabled: boolean };
type Mode = 'auto' | 'genre' | 'reference' | 'director' | 'pro';
const terminal = new Set(['completed', 'failed', 'canceled']);
const genres = ['Hip-Hop', 'Boom Bap', 'Trap', 'Drill', 'Afrobeats', 'Afro-Fusion', 'Amapiano', 'Dancehall', 'Reggae', 'R&B', 'Neo-Soul', 'Soul', 'Pop', 'Rock', 'Alternative', 'Jazz', 'Gospel', 'Acoustic', 'Electronic', 'House', 'Techno', 'Classical', 'Experimental'];
const styles = ['balanced', 'clean', 'warm', 'analog', 'punchy', 'dynamic', 'loud', 'wide', 'aggressive', 'streaming', 'radio', 'club', 'reference_matched'];

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Request failed');
  return data as T;
}

function uploadDirect(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url);
    request.setRequestHeader('Content-Type', file.type);
    request.upload.onprogress = (event) => event.lengthComputable && onProgress(Math.round(event.loaded / event.total * 100));
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error(`Storage rejected upload (${request.status})`));
    request.onerror = () => reject(new Error('Upload connection failed'));
    request.send(file);
  });
}

function Access({ configured }: { configured: boolean }) {
  const [key, setKey] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { await json('/api/auth/login', { method: 'POST', body: JSON.stringify({ accessKey: key }) }); location.reload(); }
    catch (cause) { setError((cause as Error).message); setBusy(false); }
  }
  return <main className="gate"><div className="gate-brand"><AudioLines size={31}/><span>FINAL MIX<small>A PROPRIETARY 43DOU PRODUCT</small></span></div><section className="gate-card"><span className="eyebrow">PRIVATE CLOUD STUDIO</span><h1>Finish the record.</h1><p>Autonomous audio analysis, mixing and mastering. Your recordings stay in private cloud storage and processing starts only when you request it.</p>{configured?<form onSubmit={submit}><label>Studio access key<input type="password" value={key} onChange={(event) => setKey(event.target.value)} autoComplete="current-password" required/></label>{error&&<p className="gate-error" role="alert">{error}</p>}<button className="primary" disabled={busy}>{busy?'Opening studio…':'Enter FINAL MIX'}</button></form>:<div className="setup-hold"><LockKeyhole size={20}/><div><strong>Private access is not configured yet.</strong><p>Complete the Vercel environment setup before the studio can open.</p></div></div>}</section></main>;
}

export default function CloudStudio({ authenticated, services }: { authenticated: boolean; services: Services }) {
  const [projects, setProjects] = useState<ProjectManifest[]>([]);
  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [assetId, setAssetId] = useState('');
  const [mode, setMode] = useState<Mode>('auto');
  const [genre, setGenre] = useState('Hip-Hop');
  const [style, setStyle] = useState('balanced');
  const [strategy, setStrategy] = useState<'stereo'|'hybrid'|'stems'>('stereo');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [job, setJob] = useState<JobManifest | null>(null);
  const [jobs, setJobs] = useState<JobManifest[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [listen, setListen] = useState<'original'|'master'>('original');
  const [audioUrl, setAudioUrl] = useState('');
  const audio = useRef<HTMLAudioElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const operational = services.access && services.r2 && services.modal && services.processingEnabled;

  useEffect(() => {
    if (!authenticated || !services.r2) return;
    Promise.all([
      json<{ projects: ProjectManifest[] }>('/api/projects'),
      json<{ jobs: JobManifest[] }>('/api/jobs'),
    ]).then(([a, b]) => { setProjects(a.projects); setProject(a.projects[0] ?? null); setJobs(b.jobs); }).catch((cause) => setError(cause.message));
  }, [authenticated, services.r2]);

  useEffect(() => {
    if (!job || terminal.has(job.state)) return;
    const timer = setInterval(() => json<{ job: JobManifest }>(`/api/jobs/${job.id}`).then(({ job: updated }) => {
      setJob(updated);
      setJobs((current) => [updated, ...current.filter((item) => item.id !== updated.id)]);
    }).catch((cause) => setError(cause.message)), 2000);
    return () => clearInterval(timer);
  }, [job]);

  if (!authenticated) return <Access configured={services.access}/>;

  async function createProject() {
    const name = window.prompt('Name this project', file?.name.replace(/\.[^.]+$/, '') || 'Untitled recording');
    if (!name?.trim()) return null;
    const { project: created } = await json<{ project: ProjectManifest }>('/api/projects', { method: 'POST', body: JSON.stringify({ name }) });
    setProject(created); setProjects((current) => [created, ...current]); return created;
  }

  async function upload() {
    if (!file || !services.r2) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const target = project ?? await createProject();
      if (!target) return;
      const signed = await json<{ assetId: string; uploadUrl: string }>('/api/uploads/sign', { method: 'POST', body: JSON.stringify({ projectId: target.id, filename: file.name, contentType: file.type, bytes: file.size, kind: 'source' }) });
      await uploadDirect(signed.uploadUrl, file, setUploadProgress);
      await json('/api/uploads/complete', { method: 'POST', body: JSON.stringify({ assetId: signed.assetId }) });
      setAssetId(signed.assetId); setNotice('Upload verified in private cloud storage. Choose an engineering approach and start processing.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function process() {
    if (!project || !assetId) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await json<{ job: JobManifest }>('/api/jobs', { method: 'POST', body: JSON.stringify({ projectId: project.id, inputAssetId: assetId, referenceAssetIds: [], idempotencyKey: crypto.randomUUID(), mode, genre: mode === 'genre' ? genre : null, strategy, style, targetLufs: null, truePeakCeiling: -1, outputBitDepth: '24', outputSampleRate: 'source' }) });
      setJob(response.job); setJobs((current) => [response.job, ...current]); setNotice('The cloud job was accepted. Progress below reflects completed worker stages.');
    } catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  }

  async function selectAudio(kind: 'original'|'master', download = false) {
    if (!job) return;
    try {
      const time = audio.current?.currentTime ?? 0;
      const { url } = await json<{ url: string }>(`/api/jobs/${job.id}/audio?kind=${kind}&download=${download ? '1' : '0'}`);
      if (download) { const link = document.createElement('a'); link.href = url; link.click(); return; }
      setListen(kind); setAudioUrl(url);
      setTimeout(() => { if (audio.current) { audio.current.currentTime = time; void audio.current.play(); } }, 0);
    } catch (cause) { setError((cause as Error).message); }
  }

  return <div className="cloud-app"><aside className="cloud-side"><div className="brand cloud-brand"><AudioLines/><span>FINAL MIX<small>A 43DOU PRODUCT</small></span></div><nav><button className="active"><SlidersHorizontal/>Studio</button><button><FolderOpen/>Projects</button><button><Activity/>Analysis</button></nav><div className="side-bottom"><div className="private-card"><ShieldCheck/><strong>Private cloud processing</strong><p>Direct encrypted uploads. No browser or local audio processing.</p></div><button className="settings-nav" onClick={async()=>{await fetch('/api/auth/logout',{method:'POST'});location.reload()}}><LogOut/>Lock studio</button></div></aside><main className="cloud-main"><header className="topbar"><span className="breadcrumb">FINAL MIX V3 <span>/</span> PRIVATE STUDIO</span><span className={`engine-badge ${operational?'ready':''}`}><span/>{operational?'CLOUD ENGINE READY':'SETUP REQUIRED'}</span></header><div className="main-content"><div className="page-heading"><div><span className="eyebrow">43DOU AUDIO ENGINE</span><h1>Your sound, finished.</h1><p>Upload once. The cloud analyzes, separates when useful, mixes, masters and verifies the final print.</p></div></div>{error&&<div className="notice error" role="alert">{error}<button onClick={()=>setError('')}><X/></button></div>}{notice&&<div className="notice" role="status">{notice}<button onClick={()=>setNotice('')}><X/></button></div>}
  {!operational&&<section className="service-rack"><h2>Cloud infrastructure status</h2><p>The interface is deployed safely, but processing remains locked until every required service is connected and the administrative processing switch is enabled.</p><div className="service-grid">{[['Private access',services.access],['Cloudflare R2 storage',services.r2],['Modal audio worker',services.modal],['Processing switch',services.processingEnabled]].map(([label,ready])=><div key={String(label)} className={ready?'connected':''}>{ready?<Check/>:<Cloud/>}<span>{label}</span><b>{ready?'CONNECTED':'REQUIRED'}</b></div>)}</div></section>}
  <div className="cloud-grid"><section className="panel cloud-session"><div className="panel-head"><div><span className="eyebrow">SOURCE RECORDING</span><h2>{file?.name || 'Start with your rough mix'}</h2></div>{file&&<span className="muted">{(file.size/1048576).toFixed(1)} MB</span>}</div><input ref={input} className="hidden" type="file" accept=".mp3,.wav,.flac,.aiff,.aif,.m4a,.ogg,audio/*" onChange={(event)=>{const chosen=event.target.files?.[0];if(chosen){setFile(chosen);setAssetId('');setUploadProgress(0);setJob(null)}}}/>{!file?<button className="cloud-drop" disabled={!services.r2} onClick={()=>input.current?.click()}><span><Upload/></span><strong>Choose an audio recording</strong><small>MP3, WAV, FLAC, AIFF, M4A or OGG · Up to 150 MB</small></button>:<div className="upload-stage"><FileAudio/><div><strong>{assetId?'Stored privately':'Ready to upload'}</strong><p>{assetId?'The object size and content type were verified in R2.':'The file will transfer directly from this browser to private storage.'}</p>{busy&&uploadProgress>0&&<progress max="100" value={uploadProgress}/>}</div><div>{!assetId?<button className="primary" disabled={busy||!services.r2} onClick={upload}>{busy?'Uploading…':'Upload securely'}</button>:<button className="secondary" onClick={()=>input.current?.click()}>Replace</button>}</div></div>}
  <div className="panel-head"><h2>Engineering approach</h2><span className="subtle-label">NO FADERS REQUIRED</span></div><div className="cloud-controls"><div className="mode-tabs">{(['auto','genre','reference','director','pro'] as Mode[]).map((item)=><button key={item} className={mode===item?'selected':''} onClick={()=>setMode(item)}><span>{item.toUpperCase()}</span><small>{item==='auto'?'Let the recording lead':item==='genre'?'Honor the musical language':item==='reference'?'Follow an authorized reference':item==='director'?'Describe the change':'Open advanced controls'}</small></button>)}</div><div className="field-row">{mode==='genre'&&<label>Genre<select value={genre} onChange={(event)=>setGenre(event.target.value)}>{genres.map((item)=><option key={item}>{item}</option>)}</select></label>}<label>Mastering character<select value={style} onChange={(event)=>setStyle(event.target.value)}>{styles.map((item)=><option key={item} value={item}>{item.replace('_',' ')}</option>)}</select></label><label>Processing strategy<select value={strategy} onChange={(event)=>setStrategy(event.target.value as typeof strategy)}><option value="stereo">Stereo processing · available first</option><option value="hybrid" disabled>Hybrid stem-assisted · pending validation</option><option value="stems" disabled>Stem remix · pending model clearance</option></select></label></div>{mode==='reference'&&<p className="help">Reference upload is the next active milestone. YouTube URLs will remain identification and playback only; FINAL MIX will not extract restricted audio.</p>}<button className="primary process-cloud" disabled={!operational||!assetId||busy||Boolean(job&&!terminal.has(job.state))} onClick={process}><AudioLines/>{job&&!terminal.has(job.state)?'Processing in cloud…':'Start autonomous engineering'}</button></div></section>
  <aside><section className="panel job-panel"><div className="panel-head"><h2>Processing job</h2><span className="muted">ACTUAL WORKER STATE</span></div>{job?<div className="job-body"><span className={`job-state state-${job.state}`}>{job.state.replaceAll('_',' ')}</span><h3>{job.stage}</h3><progress max="100" value={job.progress}/><div className="job-progress"><span>{job.progress}%</span><span>Attempt {job.attempt} of {job.maxAttempts}</span></div>{!terminal.has(job.state)&&<button className="secondary" onClick={async()=>{const response=await json<{job:JobManifest}>(`/api/jobs/${job.id}`,{method:'DELETE'});setJob(response.job)}}>Cancel eligible job</button>}{job.state==='failed'&&<p className="gate-error">{job.error?.message}</p>}</div>:<div className="empty"><Cloud/><h3>No cloud job yet</h3><p>Upload a source recording to begin.</p></div>}</section><section className="panel job-panel"><div className="panel-head"><h2>Listen and compare</h2></div>{job?.state==='completed'?<div className="job-body"><div className="segmented"><button className={listen==='original'?'selected':''} onClick={()=>selectAudio('original')}>Original</button><button className={listen==='master'?'selected':''} onClick={()=>selectAudio('master')}>Master</button></div>{audioUrl?<audio ref={audio} src={audioUrl} controls preload="metadata"/>:<button className="secondary" onClick={()=>selectAudio('original')}><Play/>Load private audio</button>}<button className="primary" onClick={()=>selectAudio('master',true)}><Download/>Download 24-bit master</button></div>:<div className="empty"><Pause/><p>Audio becomes available only after the worker stores and verifies real output files.</p></div>}</section></aside></div>
  {jobs.length>0&&<section className="panel history"><div className="panel-head"><h2>Recent processing history</h2><button className="icon-button" onClick={()=>json<{jobs:JobManifest[]}>('/api/jobs').then((data)=>setJobs(data.jobs))}><RefreshCw/></button></div>{jobs.slice(0,8).map((item)=><button key={item.id} onClick={()=>setJob(item)}><span>{item.settings.mode as string} / {item.settings.style as string}</span><span>{item.stage}</span><b>{item.state.replaceAll('_',' ')}</b></button>)}</section>}
  <footer><span>FINAL MIX V3 <i>/</i> A Proprietary 43DOU Product</span><span>Cloud processing only. No local installation.</span></footer></div></main></div>;
}
