/// <reference lib="webworker" />
import {analyze,processAudio,encodeWav} from './index';
import type {AudioData,ProcessOptions} from './types';
const ctx=self as unknown as DedicatedWorkerGlobalScope;
ctx.onmessage=(event:MessageEvent<{id:string;type:'analyze'|'process'|'export';audio:AudioData;options?:Partial<ProcessOptions>;reference?:AudioData;bits?:16|24|32}>)=>{
 const {id,type,audio,options,reference,bits}=event.data;try{
 const progress=(progress:number,stage:string)=>ctx.postMessage({id,type:'progress',progress,stage});
 const result=type==='analyze'?analyze(audio,progress):type==='process'?processAudio(audio,options,reference,progress):encodeWav(audio,bits);
 ctx.postMessage({id,type:'result',result},result instanceof ArrayBuffer?[result]:[]);
 }catch(error){ctx.postMessage({id,type:'error',error:error instanceof Error?error.message:String(error)});}
};
// Cancel by terminating this worker; no upload or server task is involved.
