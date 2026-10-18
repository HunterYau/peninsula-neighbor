import {photoSchema,publicImageLink,type Photo} from './photos.ts';
import {discoverySources,evidenceUrl} from './discovery-sources.ts';
import {robotsAllows} from './discovery.ts';
import type {Database} from './api.ts';
const entities=(s:string)=>s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
function attributes(tag:string){const attrs:Record<string,string>={};for(const m of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[m[1].toLowerCase()]=entities(m[2]??m[3]);return attrs;}
export function extractEventPhoto(html:string,event:{url:string;title:string;source:string}):Photo|null{
 if(!evidenceUrl(event.url,event.source))return null;const candidates:string[]=[],meta:Record<string,string>={};
 for(const tag of html.match(/<meta\b[^>]*>/gi)||[]){const a=attributes(tag),key=a.property||a.name||a.itemprop;if(key&&a.content)meta[key.toLowerCase()]=a.content;}
 // Prefer Event JSON-LD image; never use Organization logos from a graph.
 const visit=(node:any)=>{if(!node||typeof node!=='object')return;if(Array.isArray(node)){node.forEach(visit);return;}if(node['@graph'])visit(node['@graph']);const types=Array.isArray(node['@type'])?node['@type']:[node['@type']];if(types.some((t:unknown)=>typeof t==='string'&&/(?:^|:)\w*Event$/.test(t))){const images=Array.isArray(node.image)?node.image:[node.image];for(const image of images){const value=typeof image==='string'?image:image?.contentUrl||image?.url;if(typeof value==='string')candidates.push(value);}}};
 for(const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{visit(JSON.parse(script[1]));}catch{}}
 if(meta['og:image'])candidates.push(meta['og:image']);if(meta['twitter:image'])candidates.push(meta['twitter:image']);
 const source=discoverySources.find(s=>s.id===event.source);if(!source)return null;
 for(const candidate of candidates){if(!candidate.trim())continue;let src;try{src=new URL(candidate,event.url).href;}catch{continue;}
  const imageUrl=new URL(src),pageUrl=new URL(event.url);
  // Some calendar systems emit image:"" or use the event page as og:image.
  // Resolving that value would otherwise turn HTML into a broken image request.
  if(imageUrl.origin===pageUrl.origin&&imageUrl.pathname===pageUrl.pathname)continue;
  if(!publicImageLink(src)||/(?:logo|favicon|placeholder|default[-_]?image|social[-_]?share|apple-touch-icon)/i.test(src))continue;
  const parsed=photoSchema.safeParse({src,alt:(meta['og:image:alt']||`Organizer image for ${event.title}`).slice(0,240),credit:`${source.name} · organizer image`.slice(0,200),source:event.url});if(parsed.success)return parsed.data;
 }
 return null;
}
async function getText(url:string,timeout:number){const response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'PeninsulaNeighbor/2.2 (+https://peninsula-neighbor.hunteryau.chatgpt.site)'},signal:AbortSignal.timeout(timeout)});if(!response.ok)throw new Error(`Source returned ${response.status}`);const reader=response.body?.getReader();if(!reader)throw new Error('Empty response');let size=0,text='';const decoder=new TextDecoder();try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1_500_000)throw new Error('Page exceeds image-discovery limit');text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{await reader.cancel();}}
export async function refreshEventPhotos(db:Database,now=new Date()){
 const cutoff=new Date(now.valueOf()-7*86400000).toISOString(),end=new Date(now.valueOf()+30*86400000).toISOString();
 const rows=(await db.prepare("SELECT id,source,url,title FROM discoveries WHERE ends>? AND starts<? AND status='published' AND photo_checked<? ORDER BY starts LIMIT 8").bind(now.toISOString(),end,cutoff).all()).results;
 const robots=new Map<string,string>(),deadline=Date.now()+25000;let checked=0,found=0,failed=0;
 for(const event of rows){if(Date.now()>deadline-500)break;try{
   if(!evidenceUrl(event.url,event.source))continue;const url=new URL(event.url);
   const timeout=()=>Math.max(100,Math.min(5000,deadline-Date.now()));
   if(!robots.has(url.origin))robots.set(url.origin,await getText(url.origin+'/robots.txt',timeout()));
   if(!robotsAllows(robots.get(url.origin)!,url.pathname+url.search))throw new Error('Page is excluded by source robots policy');
   const photo=extractEventPhoto(await getText(event.url,timeout()),event);const timestamp=new Date().toISOString();
   await db.prepare("UPDATE discoveries SET photo=CASE WHEN ?<>'' THEN ? ELSE photo END,photo_checked=? WHERE id=?").bind(photo?JSON.stringify(photo):'',photo?JSON.stringify(photo):'',timestamp,event.id).run();checked++;if(photo)found++;
  }catch{failed++;}
 }
 return {checked,found,failed};
}
