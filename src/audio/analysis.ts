import type {AudioData,Analysis,Progress} from './types';
import {validateAudio,kWeight,db,truePeak} from './dsp';
const mean=(xs:number[])=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
const loudness=(p:number)=>-.691+10*Math.log10(Math.max(1e-30,p));
const finite=(x:number):number|null=>x<=-150?null:x;
function fft(re:Float64Array,im:Float64Array){const n=re.length;for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
 for(let size=2;size<=n;size*=2){const angle=-2*Math.PI/size;for(let start=0;start<n;start+=size){let wr=1,wi=0;const cr=Math.cos(angle),ci=Math.sin(angle);for(let j=0;j<size/2;j++){const a=start+j,b=a+size/2,tr=wr*re[b]-wi*im[b],ti=wr*im[b]+wi*re[b];re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const nw=wr*cr-wi*ci;wi=wr*ci+wi*cr;wr=nw;}}}}
export function analyze(audio:AudioData,progress:Progress=()=>{}):Analysis {
 validateAudio(audio);const {channels,sampleRate:sr}=audio,n=channels[0].length;
 progress(0,'Measuring sample levels');let peak=0,sum=0,cross=0,l2=0,r2=0,side2=0,mid2=0,clipping=0,silent=0;
 const wave=new Array(600).fill(0);
 for(let i=0;i<n;i++){let framePeak=0;for(const c of channels){const v=c[i];peak=Math.max(peak,Math.abs(v));framePeak=Math.max(framePeak,Math.abs(v));sum+=v*v;if(Math.abs(v)>=.999999)clipping++;}
 if(framePeak<.0000316228)silent++;wave[Math.min(599,Math.floor(i*600/n))]=Math.max(wave[Math.min(599,Math.floor(i*600/n))],framePeak);
 if(channels.length===2){const l=channels[0][i],r=channels[1][i];cross+=l*r;l2+=l*l;r2+=r*r;mid2+=((l+r)/2)**2;side2+=((l-r)/2)**2;}}
 progress(.15,'Measuring gated loudness');
 // Accumulate 100 ms energy bins from EVERY sample, retaining exact nominal time windows.
 const hop=Math.round(sr*.1),binCount=Math.ceil(n/hop),bins=new Float64Array(binCount),counts=new Uint32Array(binCount);
 for(let c=0;c<channels.length;c++){const weighted=kWeight(channels[c],sr);for(let i=0;i<n;i++){const b=Math.floor(i/hop);bins[b]+=weighted[i]*weighted[i];if(c===0)counts[b]++;}}
 const powers=(width:number)=>{const result:number[]=[];for(let i=0;i+width<=bins.length;i++){let e=0,count=0;for(let j=0;j<width;j++){e+=bins[i+j];count+=counts[i+j];}if(count>=width*hop)result.push(e/count);}return result;};
 const momentPower=powers(4),absolute=momentPower.filter(p=>loudness(p)>-70),relative=loudness(mean(absolute))-10,passed=absolute.filter(p=>loudness(p)>relative),integrated=passed.length?loudness(mean(passed)):null;
 const shortPower=powers(30),short=shortPower.map(loudness),lraAbsolute=shortPower.filter(p=>loudness(p)>-70),lraThreshold=loudness(mean(lraAbsolute))-20,lraValues=lraAbsolute.filter(p=>loudness(p)>lraThreshold).map(loudness).sort((a,b)=>a-b);
 const percentile=(v:number[],p:number)=>v[Math.floor((v.length-1)*p)];
 progress(.35,'Measuring spectral balance');const size=2048,power=new Float64Array(size/2),step=Math.max(size,Math.round(sr*.1));let frames=0;
 for(let start=0;start+size<=n;start+=step){for(const c of channels){const re=new Float64Array(size),im=new Float64Array(size);for(let i=0;i<size;i++)re[i]=c[start+i]*(.5-.5*Math.cos(2*Math.PI*i/(size-1)));fft(re,im);for(let k=1;k<size/2;k++)power[k]+=re[k]**2+im[k]**2;frames++;}}
 const edges=[20,60,250,500,2000,5000,10000,sr/2],names=['Sub','Bass','Low mids','Mids','Presence','Highs','Air'];const energy=new Array(7).fill(0);let weightedFrequency=0,total=0;
 for(let k=1;k<power.length;k++){const f=k*sr/size;total+=power[k];weightedFrequency+=power[k]*f;for(let b=0;b<7;b++)if(f>=edges[b]&&f<edges[b+1])energy[b]+=power[k];}
 const spectrum:Array<{frequency:number;db:number}>=[];for(let b=0;b<80;b++){const lo=20*(sr/40)**(b/80),hi=20*(sr/40)**((b+1)/80);let e=0,count=0;for(let k=Math.max(1,Math.floor(lo*size/sr));k<Math.min(size/2,Math.ceil(hi*size/sr));k++){e+=power[k];count++;}spectrum.push({frequency:Math.sqrt(lo*hi),db:10*Math.log10(Math.max(1e-12,e/Math.max(1,count*frames*size*size/4)))});}
 progress(.6,'Measuring reconstructed peaks');const tp=truePeak(channels),rms=Math.sqrt(sum/(n*channels.length));progress(1,'Analysis complete');
 return {duration:n/sr,sampleRate:sr,channels:channels.length,integratedLufs:integrated,samplePeakDb:finite(db(peak)),truePeakDb:finite(db(tp)),rmsDb:finite(db(rms)),crestFactor:rms>1e-12?db(peak/rms):null,correlation:channels.length===2&&l2*r2>1e-20?cross/Math.sqrt(l2*r2):null,stereoWidth:channels.length===2?Math.sqrt(side2/Math.max(1e-20,mid2+side2)):0,clippingSamples:clipping,silencePercent:100*silent/n,loudnessRange:lraValues.length>1?percentile(lraValues,.95)-percentile(lraValues,.1):null,momentary:momentPower.map(loudness),shortTerm:short,waveform:wave,spectrum,bands:names.map((name,i)=>({name,energy:total>0?energy[i]/total:0})),spectralCentroid:total>0?weightedFrequency/total:null,notes:['Integrated loudness uses K-weighting and 400 ms absolute/relative gating; mono is measured as one channel.','True peak is a 4× windowed-sinc estimate, not a certified BS.1770 conformance result.','Spectrum uses 2048-sample Hann windows every 100 ms; loudness and sample statistics cover the full recording.','LRA is a gated 3-second distribution estimate; it is unreliable for short recordings.','Stereo-only analysis does not reliably identify vocals, sibilance, masking, noise, genre, BPM, key or distortion. These are not fabricated.']};
}
