import type {Database,Identity} from './api.ts';
import {isAdministrator} from './admin-auth.ts';
import {discoveryUpdateSchema,saveDiscoveryUpdate,readDiscoveries} from './discovery.ts';
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Site service access and a caller-supplied writer header are not visitor identity.
export async function handleDiscoveryUpdate(request:Request,db:Database,user:Identity|null,config:{adminEmail?:string}={}){
 if(request.method!=='POST')return json({error:'Use POST to update discoveries.'},405);
 if(!user)return json({error:'Sign in as the site administrator.'},401);
 if(!isAdministrator(user,config.adminEmail))return json({error:'Administrator access required.'},403);
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Start this action on this website.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Send JSON.'},415);
 if(Number(request.headers.get('content-length'))>400000)return json({error:'Update exceeds limit.'},413);
 const raw=await request.text();if(raw.length>400000)return json({error:'Update exceeds limit.'},413);
 let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid JSON.'},400);}
 const parsed=discoveryUpdateSchema.safeParse(input);if(!parsed.success)return json({error:'Invalid discovery update.'},400);
 try{
  if(parsed.data.crawl){const window=Math.floor(Date.now()/60000),key=`discovery-crawl:${window}`,quota=await db.prepare('INSERT INTO rate_limits (id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(key,(window+1)*60000).first();if(Number(quota?.count)>1)return json({error:'Wait one minute between official calendar refreshes.'},429);}
  const result=await saveDiscoveryUpdate(db,parsed.data);return json({...result,feed:await readDiscoveries(db)});
 }catch(error){console.error('Discovery update failed',error instanceof Error?error.message:'Unknown');return json({error:'Update failed; retry the same data.'},500);}
}
