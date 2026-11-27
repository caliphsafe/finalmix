import type {AudioData,ProcessOptions,ProcessResult,Progress,Decision} from './types';
import {analyze} from './analysis';
import {validateOptions,genreProfiles} from './profiles';
import {cloneAudio,biquad,eq,compress,limit,amp,db,truePeak,clamp} from './dsp';
export function processAudio(audio:AudioData,input:Partial<ProcessOptions>={},reference?:AudioData,progress:Progress=()=>{}):ProcessResult {
 const options=validateOptions(input),decisions:Decision[]=[],warnings:string[]=[];
 const before=analyze(audio,(p,s)=>progress(p*.24,s));let mix=cloneAudio(audio);
 if(before.integratedLufs===null)throw Error('The recording is silent or below the loudness measurement gate. No useful master can be made.');
 let bass=options.bassDb,warmth=options.warmthDb,presence=options.presenceDb,air=options.airDb,width=options.width,target=options.targetLufs,compression=options.compression;
 const add=(processor:string,reason:string,adjustment:string)=>decisions.push({processor,reason,adjustment});
 if(options.mode==='AUTO'){target=clamp(-14-(Math.max(0,(before.crestFactor||12)-15)*.35),-18,-12);add('Loudness intention',`Source crest factor ${(before.crestFactor||0).toFixed(1)} dB` ,`${target.toFixed(1)} LUFS aim, subject to dynamics and peak limits`);}
 if(options.mode==='GENRE'){const g=genreProfiles[options.genre];target=g.target;bass+=g.bass;air+=g.air;add('Genre priorities',g.priority,`Broad tone offsets within ±0.5 dB; ${target} LUFS aim`);}
 const styles:Record<string,{bass?:number;warmth?:number;air?:number;width?:number;target?:number;compression?:number;presence?:number}>={Warm:{warmth:.8,air:-.5},Analog:{warmth:.7,air:-.7},Punchy:{compression:0,target:-14},Dynamic:{compression:0,target:-17},Loud:{target:-10},Wide:{width:1.15},Aggressive:{target:-10,presence:.6},Radio:{target:-13},Club:{target:-11,bass:.5},Streaming:{target:-14},Clean:{air:.2}};
 const style=styles[options.style];if(style){bass+=style.bass||0;warmth+=style.warmth||0;air+=style.air||0;presence+=style.presence||0;if(style.width)width=style.width;if(style.target!==undefined)target=style.target;if(style.compression!==undefined)compression=style.compression;add('Style',`User selected ${options.style}`,options.style==='Analog'?'Warm tone shaping only; no modeled analog circuitry':'Bounded tone, width or loudness preference');}
 if(options.mode==='REFERENCE'||options.style==='Reference Matched'){
 if(!reference)throw Error('Upload authorized reference audio for acoustic matching. A YouTube link is a listening reference only.');
 const r=analyze(reference,(p,s)=>progress(.24+p*.15,`Reference: ${s}`));if(r.integratedLufs===null)throw Error('Reference audio is silent.');
 const ratio=(i:number)=>clamp(10*Math.log10(Math.max(1e-9,r.bands[i].energy)/Math.max(1e-9,before.bands[i].energy)),-2,2)*options.referenceIntensity;
 bass+=ratio(1);warmth+=ratio(2);presence+=ratio(4);air+=ratio(5);target=clamp(before.integratedLufs+(r.integratedLufs-before.integratedLufs)*options.referenceIntensity,-20,-10);
 add('Reference matching','Measured broad-band energy proportions and integrated loudness','Broad tone changes capped at ±2 dB before intensity; no reference audio incorporated');
 }
 if(options.autoCorrect){
 if(before.bands[2].energy>.38){warmth-=Math.min(1.5,(before.bands[2].energy-.38)*5);add('Low-mid balance',`${(before.bands[2].energy*100).toFixed(1)}% of measured spectral energy in 250–500 Hz`,'Conservative broad low-mid reduction; inspect by ear');}
 if(before.bands[4].energy>.36){presence-=1;add('Presence balance','High proportion of 2–5 kHz energy','Reduce broad presence by 1 dB; not a vocal de-esser');}
 if((before.correlation??1)<0&&width>1){width=1;add('Mono compatibility','Negative stereo correlation','Declined additional widening');}
 }
 progress(.41,'Rendering corrective mix');
 for(const [frequency,gain,type,label] of [[100,bass,'low','Bass'],[320,warmth,'bell','Warmth'],[3200,presence,'bell','Presence'],[8500,air,'high','Air']] as const){const gainDb=clamp(gain,-4,4);if(Math.abs(gainDb)>.01){mix.channels=mix.channels.map(c=>biquad(c,eq(type,frequency,gainDb,audio.sampleRate)));add(`${label} EQ`,'User preference and/or bounded measured adjustment',`${gainDb.toFixed(2)} dB at ${frequency} Hz`);}}
 if(mix.channels.length===2&&width!==1){for(let i=0;i<mix.channels[0].length;i++){const m=(mix.channels[0][i]+mix.channels[1][i])/2,s=(mix.channels[0][i]-mix.channels[1][i])/2*width;mix.channels[0][i]=m+s;mix.channels[1][i]=m-s;}add('Stereo width','User width preference',`${Math.round(width*100)}% mid-side width; mono sum preserved before mastering`);}
 if(compression>0){mix=compress(mix,compression);add('Linked compression','Explicit user dynamics preference',`Amount ${compression}/10; max 4 dB gain reduction, 25 ms attack / 150 ms release`);}else add('Dynamics preservation','No explicit compression requested','Broadband compression bypassed');
 // Preserve headroom in the intermediate mix without altering original.
 let mixPeak=0;for(const c of mix.channels)for(let i=0;i<c.length;i++)mixPeak=Math.max(mixPeak,Math.abs(c[i]));if(mixPeak>amp(-3)){const g=amp(-3)/mixPeak;mix.channels.forEach(c=>{for(let i=0;i<c.length;i++)c[i]*=g;});add('Mix headroom','Peak exceeded -3 dBFS',`${db(g).toFixed(2)} dB trim`);}
 const measured=analyze(mix,(p,s)=>progress(.45+p*.2,`Mix: ${s}`));
 // Avoid unlimited boosting into a limiter; reserve at most 3 dB peak reduction.
 const desired=target-(measured.integratedLufs??target),peakGain=options.ceilingDb-(measured.truePeakDb??0)+3,gainDb=Math.min(desired,peakGain,12);
 let master=cloneAudio(mix);const gain=amp(gainDb);master.channels.forEach(c=>{for(let i=0;i<c.length;i++)c[i]*=gain;});
 progress(.67,'Rendering look-ahead limiter');master=limit(master,options.ceilingDb-.15);
 const reconstructed=truePeak(master.channels),allowed=amp(options.ceilingDb-.05);if(reconstructed>allowed){const trim=allowed/reconstructed;master.channels.forEach(c=>{for(let i=0;i<c.length;i++)c[i]*=trim;});add('Reconstructed peak safety','4× estimated peak exceeded reserved ceiling',`${db(trim).toFixed(2)} dB post-limiter trim`);}
 add('Master gain',`Measured mix ${(measured.integratedLufs??0).toFixed(1)} LUFS; peak headroom limits gain`,`${gainDb.toFixed(2)} dB gain; ${target.toFixed(1)} LUFS is an aim, not a guarantee`);
 add('Peak protection','User export ceiling',`5 ms look-ahead, stereo-linked limiter; ${options.ceilingDb.toFixed(1)} dBTP estimated ceiling`);
 const after=analyze(master,(p,s)=>progress(.75+p*.25,`Quality check: ${s}`));
 if(after.truePeakDb!==null&&after.truePeakDb>options.ceilingDb+.01)warnings.push('Estimated true peak exceeds ceiling.');
 if(after.clippingSamples)warnings.push('Clipping detected in master.');
 if((after.correlation??1)<-.1)warnings.push('Negative stereo correlation: audition in mono.');
 if((after.crestFactor??99)<6)warnings.push('Low crest factor: the result may sound too dense.');
 if(after.integratedLufs!==null&&Math.abs(after.integratedLufs-target)>1)warnings.push('Loudness aim was not reached; headroom and dynamics were prioritized.');
 if(before.clippingSamples)add('Source limitation',`${before.clippingSamples} near-full-scale input samples`,'Original clipped detail cannot be reconstructed by this engine');
 return {mix,master,before,after,decisions,options,qc:{passed:!after.clippingSamples&&(after.truePeakDb??-Infinity)<=options.ceilingDb+.01,warnings}};
}
