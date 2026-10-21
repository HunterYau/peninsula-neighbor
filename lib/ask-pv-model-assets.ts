// Fixed, public Apache-2.0 model revisions. This is not a general URL proxy.
export const modelRevisions={q4f16_1:'8c14ce481d4c692769976ad52afea453a102df19',q4f32_1:'9b4f0b05b08c692ea86fe151ea878406ad22f428'} as const;
const files=new Set(['mlc-chat-config.json','tensor-cache.json','ndarray-cache.json','tokenizer.json','tokenizer_config.json','vocab.json','merges.txt',...Array.from({length:9},(_,i)=>`params_shard_${i}.bin`)]);
export function modelAssetURL(path:string[]){
 const [variant,resolve,revision,file]=path;
 if(path.length!==4||!Object.hasOwn(modelRevisions,variant)||resolve!=='resolve'||revision!==modelRevisions[variant as keyof typeof modelRevisions]||!files.has(file))return null;
 return `https://huggingface.co/mlc-ai/Qwen3-0.6B-${variant}-MLC/resolve/${revision}/${file}`;
}
export async function handleModelAsset(request:Request,path:string[],fetcher:typeof fetch=fetch){
 const url=modelAssetURL(path);if(!url)return new Response('Unknown model file.',{status:404});
 if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed.',{status:405});
 const range=request.headers.get('range');if(range&&!/^bytes=\d+-\d*$/.test(range))return new Response('Unsupported range.',{status:416});
 try{
  const upstream=await fetcher(url,{method:request.method,headers:range?{Range:range}:{},redirect:'follow',signal:AbortSignal.any([request.signal,AbortSignal.timeout(120000)]),...{cf:{cacheEverything:true,cacheTtl:31536000}}});
  if(!upstream.ok)return new Response('The model download is temporarily unavailable.',{status:upstream.status===404?404:503,headers:{'Cache-Control':'no-store'}});
  const headers=new Headers({'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff'});
  for(const key of ['content-type','content-length','content-range','accept-ranges','etag']){const value=upstream.headers.get(key);if(value)headers.set(key,value);}
  // Stream each shard through; never buffer model weights inside the 128 MB Worker.
  return new Response(request.method==='HEAD'?null:upstream.body,{status:upstream.status,headers});
 }catch{return new Response('The model download could not be reached. Please retry or choose quick source answers.',{status:503,headers:{'Cache-Control':'no-store'}});}
}
