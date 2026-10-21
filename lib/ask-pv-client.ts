import type {WebWorkerMLCEngine} from '@mlc-ai/web-llm';
import type {ModelTurn} from './ask-pv.ts';
import {modelRevisions} from './ask-pv-model-assets.ts';

function aborted(){return new DOMException('Stopped','AbortError');}
export function abortable<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted)return Promise.reject(aborted());
 return new Promise((resolve,reject)=>{const stop=()=>reject(aborted());signal.addEventListener('abort',stop,{once:true});promise.then(resolve,reject).finally(()=>signal.removeEventListener('abort',stop));});
}
export class LocalPVModel{
 private worker:Worker|null=null;
 private engine:WebWorkerMLCEngine|null=null;
 get ready(){return !!this.engine;}
 async load(progress:(fraction:number,text:string)=>void,signal:AbortSignal){
  if(this.engine)return;
  const gpu=(navigator as Navigator&{gpu?:{requestAdapter:()=>Promise<{features:ReadonlySet<string>}|null>}}).gpu;
  if(!gpu)throw Error('This browser does not support on-device AI. Use quick source answers, or try a current browser with WebGPU.');
  const adapter=await abortable(gpu.requestAdapter(),signal);if(!adapter)throw Error('A compatible GPU is not available. Quick source answers still work.');
  const model=adapter.features.has('shader-f16')?'Qwen3-0.6B-q4f16_1-MLC':'Qwen3-0.6B-q4f32_1-MLC';
  const {CreateWebWorkerMLCEngine,prebuiltAppConfig}=await abortable(import('@mlc-ai/web-llm'),signal);
  if(signal.aborted)throw aborted();
  const {default:ModelWorker}=await abortable(import('./ask-pv.worker?worker'),signal);
  this.worker=new ModelWorker();
  const worker=this.worker;
  const failure=new Promise<never>((_,reject)=>{worker.onerror=()=>reject(Error('The AI worker could not start. Quick source answers still work.'));});
  const variant=model.includes('q4f16')?'q4f16_1':'q4f32_1';
  const record=prebuiltAppConfig.model_list.find(r=>r.model_id===model);if(!record)throw Error('The local model configuration is unavailable.');
  const appConfig={...prebuiltAppConfig,model_list:[{...record,model:`${window.location.origin}/api/ask-pv/model/${variant}/resolve/${modelRevisions[variant]}/`}]};
  try{this.engine=await abortable(Promise.race([CreateWebWorkerMLCEngine(worker,model,{appConfig,initProgressCallback:r=>progress(r.progress,r.text),logLevel:'ERROR'},{context_window_size:4096}),failure]),signal);}
  catch(error){this.dispose();throw error;}
 }
 async stream(messages:ModelTurn[],onToken:(token:string)=>void,signal:AbortSignal){
  if(!this.engine)throw Error('The local model is not ready.');
  const engine=this.engine;
  const stream=await abortable(engine.chat.completions.create({messages,stream:true,max_tokens:200,temperature:0.2,top_p:0.8,extra_body:{enable_thinking:false}}),signal);
  const iterator=stream[Symbol.asyncIterator]();
  for(;;){const next=await abortable(iterator.next(),signal);if(next.done)break;const token=next.value.choices[0]?.delta?.content;if(token)onToken(token);}
 }
 dispose(){this.worker?.terminate();this.worker=null;this.engine=null;}
}
