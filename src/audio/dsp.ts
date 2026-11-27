import type {AudioData} from './types';
export const clamp=(x:number,a:number,b:number)=>Math.min(b,Math.max(a,x));
export const db=(x:number)=>20*Math.log10(Math.max(1e-15,x));
export const amp=(x:number)=>10**(x/20);
export type Coefficients = [number,number,number,number,number];
export function biquad(input:Float32Array, c:Coefficients):Float32Array {
 const out=new Float32Array(input.length); let x1=0,x2=0,y1=0,y2=0;
 const [b0,b1,b2,a1,a2]=c;
 for(let i=0;i<input.length;i++){const x=input[i],y=b0*x+b1*x1+b2*x2-a1*y1-a2*y2; out[i]=y;x2=x1;x1=x;y2=y1;y1=y;}
 return out;
}
export function eq(type:'low'|'high'|'bell'|'highpass', frequency:number,gain:number,sr:number,q=.707):Coefficients {
 const w=2*Math.PI*Math.min(frequency,sr*.45)/sr,c=Math.cos(w),s=Math.sin(w),A=10**(gain/40),alpha=s/(2*q),b=2*Math.sqrt(A)*alpha;
 let b0:number,b1:number,b2:number,a0:number,a1:number,a2:number;
 if(type==='bell'){b0=1+alpha*A;b1=-2*c;b2=1-alpha*A;a0=1+alpha/A;a1=-2*c;a2=1-alpha/A;}
 else if(type==='highpass'){b0=(1+c)/2;b1=-(1+c);b2=b0;a0=1+alpha;a1=-2*c;a2=1-alpha;}
 else if(type==='low'){b0=A*((A+1)-(A-1)*c+b);b1=2*A*((A-1)-(A+1)*c);b2=A*((A+1)-(A-1)*c-b);a0=(A+1)+(A-1)*c+b;a1=-2*((A-1)+(A+1)*c);a2=(A+1)+(A-1)*c-b;}
 else {b0=A*((A+1)+(A-1)*c+b);b1=-2*A*((A-1)+(A+1)*c);b2=A*((A+1)+(A-1)*c-b);a0=(A+1)-(A-1)*c+b;a1=2*((A-1)-(A+1)*c);a2=(A+1)-(A-1)*c-b;}
 return [b0/a0,b1/a0,b2/a0,a1/a0,a2/a0];
}
// De Man's bilinear coefficients retain BS.1770 reference response at non-48 kHz rates.
export function kWeight(x:Float32Array,sr:number):Float32Array {
 let K=Math.tan(Math.PI*1681.974450955533/sr),Vh=10**(3.999843853973347/20),Vb=Vh**.4996667741545416,Q=.7071752369554196,a=1+K/Q+K*K;
 const shelf:Coefficients=[(Vh+Vb*K/Q+K*K)/a,2*(K*K-Vh)/a,(Vh-Vb*K/Q+K*K)/a,2*(K*K-1)/a,(1-K/Q+K*K)/a];
 K=Math.tan(Math.PI*38.13547087602444/sr);Q=.5003270373238773;a=1+K/Q+K*K;
 return biquad(biquad(x,shelf),[1,-2,1,2*(K*K-1)/a,(1-K/Q+K*K)/a]);
}
export function validateAudio(a:AudioData) {
 if(!Number.isFinite(a.sampleRate)||a.sampleRate<8000||a.sampleRate>192000||a.channels.length<1||a.channels.length>2) throw Error('Use mono or stereo audio between 8 and 192 kHz.');
 const n=a.channels[0].length;if(n<Math.ceil(a.sampleRate*.4)||n>a.sampleRate*600)throw Error('Audio must be between 0.4 seconds and 10 minutes.');
 for(const c of a.channels){if(c.length!==n)throw Error('Channel lengths differ.');for(let i=0;i<n;i++)if(!Number.isFinite(c[i]))throw Error('Audio contains invalid samples.');}
}
export function cloneAudio(a:AudioData):AudioData{return{sampleRate:a.sampleRate,channels:a.channels.map(c=>c.slice())};}
// Four-times, windowed-sinc reconstruction. Estimate, not a certified meter.
export function truePeak(channels:Float32Array[]):number {
 const radius=8, phases:number[][]=[];
 for(let p=1;p<4;p++){const f=p/4, taps:number[]=[];let total=0;
 for(let k=-radius+1;k<=radius;k++){const t=k-f,v=Math.sin(Math.PI*t)/(Math.PI*t)*(.5+.5*Math.cos(Math.PI*t/radius));taps.push(v);total+=v;}
 phases.push(taps.map(x=>x/total));}
 let peak=0;
 for(const x of channels){for(let i=0;i<x.length;i++){peak=Math.max(peak,Math.abs(x[i]));
 // A cheap local bound avoids expensive interpolation in silent/quiet regions.
 let bound=0;for(let k=-radius+1;k<=radius;k++)bound=Math.max(bound,Math.abs(x[i+k]||0));
 if(bound*2.2<peak)continue;
 for(const taps of phases){let v=0;for(let j=0;j<16;j++)v+=(x[i+j-radius+1]||0)*taps[j];peak=Math.max(peak,Math.abs(v));}
 }} return peak;
}
export function compress(a:AudioData,amount:number):AudioData {
 if(amount<=0)return a;const out=cloneAudio(a),sr=a.sampleRate;
 const attack=Math.exp(-1/(.025*sr)),release=Math.exp(-1/(.15*sr)),threshold=-16,ratio=1+amount*.12;
 let envelope=0;
 for(let i=0;i<a.channels[0].length;i++){let peak=0;for(const c of a.channels)peak=Math.max(peak,Math.abs(c[i]));const coeff=peak>envelope?attack:release;envelope=coeff*envelope+(1-coeff)*peak;
 const over=Math.max(0,db(envelope)-threshold),gain=amp(-Math.min(4,over*(1-1/ratio)));for(let c=0;c<out.channels.length;c++)out.channels[c][i]*=gain;}
 return out;
}
export function limit(a:AudioData,ceilingDb:number):AudioData {
 const out=cloneAudio(a),n=a.channels[0].length,look=Math.ceil(.005*a.sampleRate),ceiling=amp(ceilingDb),release=Math.exp(-1/(.1*a.sampleRate));
 const peaks=new Float32Array(n);for(let i=0;i<n;i++)for(const c of a.channels)peaks[i]=Math.max(peaks[i],Math.abs(c[i]));
 const queue=new Int32Array(n);let head=0,tail=0,next=0,gain=1;
 for(let i=0;i<n;i++){while(next<Math.min(n,i+look+1)){while(tail>head&&peaks[queue[tail-1]]<=peaks[next])tail--;queue[tail++]=next++;}while(tail>head&&queue[head]<i)head++;
 const required=Math.min(1,ceiling/Math.max(1e-15,peaks[queue[head]]));gain=required<gain?required:release*gain+(1-release)*required;
 for(let c=0;c<out.channels.length;c++)out.channels[c][i]*=gain;
 }return out;
}
