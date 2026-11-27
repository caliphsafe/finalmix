import type {ProcessOptions} from './types';
export const genreProfiles:Record<string,{target:number;bass:number;air:number;priority:string}>={
 'Hip-Hop':{target:-12,bass:.5,air:0,priority:'Vocal clarity and low-end weight'},'Boom Bap':{target:-13,bass:.2,air:-.4,priority:'Drum dynamics and warm mids'},Trap:{target:-11,bass:.5,air:0,priority:'Sub headroom and vocal presence'},Drill:{target:-11,bass:.5,air:-.2,priority:'Controlled low end'},Afrobeats:{target:-12,bass:.3,air:.3,priority:'Percussive detail and movement'},'Afro-Fusion':{target:-13,bass:.2,air:.2,priority:'Balance and dynamics'},Amapiano:{target:-12,bass:.4,air:.1,priority:'Bass space and percussion'},Dancehall:{target:-12,bass:.5,air:0,priority:'Rhythm and low-end clarity'},Reggae:{target:-14,bass:.5,air:-.2,priority:'Warm low end and dynamics'},'R&B':{target:-13,bass:.2,air:.2,priority:'Smooth presence and vocal space'},'Neo-Soul':{target:-14,bass:.2,air:-.2,priority:'Warmth and dynamic phrasing'},Soul:{target:-14,bass:0,air:0,priority:'Natural vocal dynamics'},Pop:{target:-12,bass:0,air:.3,priority:'Translation and clarity'},Rock:{target:-12,bass:0,air:-.2,priority:'Midrange and punch'},Alternative:{target:-13,bass:0,air:0,priority:'Arrangement preservation'},Jazz:{target:-17,bass:0,air:0,priority:'Natural dynamics'},Gospel:{target:-14,bass:0,air:.1,priority:'Vocal dynamics'},Acoustic:{target:-17,bass:0,air:0,priority:'Natural transients'},Electronic:{target:-12,bass:.2,air:.1,priority:'Controlled impact'},House:{target:-12,bass:.3,air:.1,priority:'Kick and bass headroom'},Techno:{target:-11,bass:.3,air:0,priority:'Rhythmic impact'},Classical:{target:-20,bass:0,air:0,priority:'Wide dynamic range'},Experimental:{target:-16,bass:0,air:0,priority:'Conservative preservation'}
};
export const styleNames=['Balanced','Clean','Warm','Analog','Punchy','Dynamic','Loud','Wide','Aggressive','Radio','Club','Streaming','Reference Matched'];
export const defaultOptions:ProcessOptions={mode:'AUTO',genre:'Hip-Hop',style:'Balanced',targetLufs:-14,ceilingDb:-1,bassDb:0,warmthDb:0,presenceDb:0,airDb:0,width:1,compression:0,referenceIntensity:.5,autoCorrect:true};
export function validateOptions(input:Partial<ProcessOptions>):ProcessOptions {
 const x={...defaultOptions,...input}; const ranges:Partial<Record<keyof ProcessOptions,[number,number]>>={targetLufs:[-24,-8],ceilingDb:[-3,-.3],bassDb:[-4,4],warmthDb:[-4,4],presenceDb:[-4,4],airDb:[-4,4],width:[0,1.4],compression:[0,10],referenceIntensity:[0,1]};
 for(const [key,range] of Object.entries(ranges)){const k=key as keyof ProcessOptions,v=x[k];if(typeof v!=='number'||!Number.isFinite(v)||v<range![0]||v>range![1])throw Error(`Invalid ${key}; permitted range ${range!.join(' to ')}.`);}
 if(!['AUTO','REFERENCE','GENRE','DIRECTOR','PRO'].includes(x.mode)||!styleNames.includes(x.style)||!genreProfiles[x.genre])throw Error('Unknown engineering mode, genre or style.');if(typeof x.autoCorrect!=='boolean')throw Error('Invalid auto-correction setting.');return x;
}
export function interpretCommand(text:string,current:ProcessOptions):{supported:boolean;options:ProcessOptions;message:string}{
 const t=text.toLowerCase().trim();const x:ProcessOptions={...current,mode:'DIRECTOR'};const bound=(n:number)=>Math.max(-4,Math.min(4,n));
 if(/vocal|chorus|background|reverb|depth|drum/.test(t))return{supported:false,options:current,message:'That request needs stem or section-specific processing. Use Full Studio; browser mode cannot isolate that element.'};
 if(/warm/.test(t)){x.warmthDb=bound(x.warmthDb+1);x.airDb=bound(x.airDb-.5);}
 else if(/bass.*(hard|more|up)|more bass|low.end.*(up|more)/.test(t))x.bassDb=bound(x.bassDb+1);
 else if(/less bass|reduce.*bass/.test(t))x.bassDb=bound(x.bassDb-1);
 else if(/less harsh|reduce.*harsh|smooth/.test(t))x.presenceDb=bound(x.presenceDb-1);
 else if(/bright|air/.test(t))x.airDb=bound(x.airDb+1);
 else if(/wider|wide/.test(t))x.width=Math.min(1.4,x.width+.1);
 else if(/narrow|mono/.test(t))x.width=t.includes('mono')?0:Math.max(0,x.width-.1);
 else if(/reduce.*compress|less compress|more dynamic/.test(t))x.compression=Math.max(0,x.compression-2);
 else if(/louder/.test(t))x.targetLufs=Math.min(-8,x.targetLufs+1);
 else if(/quieter|softer/.test(t))x.targetLufs=Math.max(-24,x.targetLufs-1);
 else if(/closer.*reference/.test(t)){x.mode='REFERENCE';x.referenceIntensity=Math.min(1,x.referenceIntensity+.15);}
 else return{supported:false,options:current,message:'Supported here: warmer, brighter, more/less bass, less harsh, wider, mono, less compression, louder, quieter, or closer to my reference. Undo and redo are in History.'};
 return{supported:true,options:validateOptions(x),message:'Bounded adjustment prepared. Render a new version to hear it; your original is unchanged.'};
}
