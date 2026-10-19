import type {Database,Identity} from './api.ts';
import {CommunityError} from './community-api.ts';
import {mapReportSchema,heatCells,coverageScores} from './map-community.ts';
import {decisionSchema} from './community-model.ts';
import {communityCatalog} from './community-catalog.ts';
import {accessFeatures,emergencyFeatures,mapSources} from './map-resources.ts';
import {readMapSources} from './map-sources.ts';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function mapCommunityApi(req:Request,db:Database,user:Identity|null,path:string[],admin:boolean):Promise<Response|null>{
 if(!['map-data','map-reports','map-admin'].includes(path[0]))return null;
 const now=new Date().toISOString(),uid=user?.userId||'';
 const stmt=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args),one=(sql:string,...args:unknown[])=>stmt(sql,...args).first(),all=async(sql:string,...args:unknown[]):Promise<any[]> =>(await stmt(sql,...args).all()).results,run=(sql:string,...args:unknown[])=>stmt(sql,...args).run();
 async function input(schema:any){if(!req.headers.get('content-type')?.includes('application/json'))throw new CommunityError(415,'Send JSON.');const raw=await req.text();if(raw.length>12000)throw new CommunityError(413,'Report is too large.');let data;try{data=JSON.parse(raw);}catch{throw new CommunityError(400,'Invalid JSON.');}const result=schema.safeParse(data);if(!result.success)throw new CommunityError(400,result.error.issues.map((i:any)=>i.message).join(' '));return result.data;}
 if(path[0]==='map-data'&&req.method==='GET'){
  const rows=await all("SELECT id,title,details,area,category,lat,lng,observed,source_url,reviewed,status FROM map_reports WHERE status='approved' AND kind='accessibility' ORDER BY reviewed DESC LIMIT 500");
  const community=rows.map(r=>({id:`access:${r.id}`,title:r.title,body:r.details,area:r.area,category:r.category,lat:Number(r.lat),lng:Number(r.lng),url:r.source_url,checked:r.observed,verification:'Community report · administrator reviewed; not an access certification'}));
  const coyotes=await all("SELECT lat,lng,observed,status,created FROM map_reports WHERE kind='coyote' AND status='approved' AND observed>=?",new Date(Date.now()-30*86400000).toISOString());
  const sources=await readMapSources(db,new URL(req.url).searchParams.get('refresh')==='1');
  return json({accessible:[...accessFeatures,...community,...sources.accessible],emergency:emergencyFeatures,coyotes:heatCells(coyotes),officialCoyotes:sources.officialCoyotes,sourceStatus:sources.status,sources:mapSources,delayHours:24,windowDays:30,checked:now});
 }
 if(!user)throw new CommunityError(401,'Sign in to submit or manage map reports.');
 if(path[0]==='map-reports'){
  if(req.method==='GET')return json({reports:await all('SELECT id,kind,category,area,title,details,lat,lng,observed,status,note,created,reviewed,source_url AS sourceUrl FROM map_reports WHERE author=? ORDER BY created DESC LIMIT 200',uid)});
  if(req.method==='POST'){
   const data=await input(mapReportSchema),date=Date.parse(data.observed);if(date>Date.now()+60000||date<Date.now()-30*86400000)throw new CommunityError(400,'Choose an observation within the past 30 days.');
   if(Number((await one('SELECT COUNT(*) AS n FROM map_reports WHERE author=? AND created>?',uid,new Date(Date.now()-86400000).toISOString()))?.n)>=20)throw new CommunityError(429,'Please limit map reports to 20 per day.');
   const id=crypto.randomUUID();await run("INSERT INTO map_reports (id,author,kind,category,area,title,details,lat,lng,observed,source_url,status,note,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,'pending','',?)",id,uid,data.kind,data.category,data.area,data.title,data.details,String(data.lat),String(data.lng),data.observed,data.sourceUrl,now);return json({id,status:'pending'},201);
  }
  if(req.method==='DELETE'&&path[1]){const row=await one('SELECT author FROM map_reports WHERE id=?',path[1]);if(!row)throw new CommunityError(404,'Report not found.');if(row.author!==uid)throw new CommunityError(403,'Only your own report can be withdrawn.');await run("UPDATE map_reports SET status='withdrawn' WHERE id=?",path[1]);return json({ok:true});}
 }
 if(path[0]==='map-admin'){
  if(!admin)throw new CommunityError(403,'Administrator access required.');
  if(req.method==='GET'){
   const reports=await all('SELECT id,kind,category,area,title,details,lat,lng,observed,status,note,created,reviewed,source_url AS sourceUrl FROM map_reports ORDER BY created DESC LIMIT 1000');
   const sources=await readMapSources(db,false);
   return json({reports,problemCells:heatCells(reports.filter(r=>r.kind==='problem'&&r.status==='approved'),Date.now(),0),coverage:coverageScores((await communityCatalog(db)).listings,[...accessFeatures,...sources.accessible,...reports.filter(r=>r.kind==='accessibility'&&r.status==='approved'&&r.category!=='Access barrier').map(r=>({...r,body:r.details,lat:Number(r.lat),lng:Number(r.lng),url:r.sourceUrl,checked:r.observed,verification:'Community report'}))],emergencyFeatures),method:'Catalog coverage, not a population or equity measurement. 20 points for each category with at least one local record: events, mapped accessibility features, volunteering, emergency resources, and stated youth eligibility. Region-wide and unknown-location records are excluded. Missing records may reflect missing data. OSM neighborhood assignments use nearest-center estimates, not official city boundaries.'});
  }
  if(req.method==='PATCH'&&path[1]){const data=await input(decisionSchema);const row=await one('SELECT status FROM map_reports WHERE id=?',path[1]);if(!row)throw new CommunityError(404,'Report not found.');if(row.status==='withdrawn')throw new CommunityError(409,'The author withdrew this report.');const changed=await stmt("UPDATE map_reports SET status=?,note=?,reviewed=? WHERE id=? AND status<>'withdrawn' RETURNING id",data.status,data.note,now,path[1]).first();if(!changed)throw new CommunityError(409,'Report was withdrawn.');return json({ok:true});}
 }
 return json({error:'Method not allowed.'},405);
}
