import type {AudioData} from './types';
import {validateAudio,clamp} from './dsp';
export function encodeWav(audio:AudioData,bits:16|24|32=24):ArrayBuffer {
 validateAudio(audio);if(![16,24,32].includes(bits))throw Error('WAV supports 16-bit PCM, 24-bit PCM or 32-bit float.');
 const channels=audio.channels.length,n=audio.channels[0].length,bytes=bits/8,dataSize=n*channels*bytes,buffer=new ArrayBuffer(44+dataSize),view=new DataView(buffer);
 const str=(offset:number,s:string)=>{for(let i=0;i<s.length;i++)view.setUint8(offset+i,s.charCodeAt(i));};
 str(0,'RIFF');view.setUint32(4,36+dataSize,true);str(8,'WAVE');str(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,bits===32?3:1,true);view.setUint16(22,channels,true);view.setUint32(24,audio.sampleRate,true);view.setUint32(28,audio.sampleRate*channels*bytes,true);view.setUint16(32,channels*bytes,true);view.setUint16(34,bits,true);str(36,'data');view.setUint32(40,dataSize,true);
 let offset=44;for(let i=0;i<n;i++)for(let c=0;c<channels;c++){const v=audio.channels[c][i];if(bits===32)view.setFloat32(offset,v,true);else{const scale=2**(bits-1),dither=Math.random()-Math.random(),q=Math.round(clamp(v*scale+dither,-scale,scale-1));if(bits===16)view.setInt16(offset,q,true);else{view.setUint8(offset,q&255);view.setUint8(offset+1,(q>>8)&255);view.setUint8(offset+2,(q>>16)&255);}}offset+=bytes;}return buffer;
}
