import accessSnapshot from './data/access-snapshot.json' with {type:'json'};
import type {Database} from './api.ts';
import {areaCenters} from './community-model.ts';
import {heatCells,type HeatCell,type MapFeature} from './map-community.ts';
export const coyoteLayer='https://services6.arcgis.com/ujpK9Y5GvE6XyZF1/arcgis/rest/services/RPV_Coyote_Sightings_-_3_view/FeatureServer/0';
const bbox=(lat:unknown,lng:unknown)=>typeof lat==='number'&&typeof lng==='number'&&Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=33.70&&lat<=33.86&&lng>=-118.46&&lng<=-118.27;
export function parseAccessNodes(data:any,checked:string):MapFeature[]{
 if(!Array.isArray(data?.elements)||data.remark)throw new Error('Accessibility source did not return a complete response.');
 return data.elements.flatMap((n:any)=>{
  const t=n.tags||{};if(n.type!=='node'||!Number.isSafeInteger(n.id)||!bbox(n.lat,n.lon)||!(t.kerb==='lowered'||t.kerb==='flush'||t['ramp:wheelchair']==='yes'||t.entrance&&t.wheelchair==='yes'))return [];
  const category=t.entrance?'Step-free entrance':'Curb ramp',area=Object.entries(areaCenters).sort(([,a],[,b])=>Math.hypot(a.lat-n.lat,a.lng-n.lon)-Math.hypot(b.lat-n.lat,b.lng-n.lon))[0][0];
  const access=Object.fromEntries(['kerb','wheelchair','tactile_paving','surface','incline','width','entrance','ramp:wheelchair'].filter(k=>typeof t[k]==='string').map(k=>[k,t[k]]));
  return [{id:`osm:node:${n.id}`,osmId:String(n.id),title:t.name||`${category} · OpenStreetMap ${n.id}`,lat:n.lat,lng:n.lon,area,category,body:`Community-mapped ${category.toLowerCase()}. ${Object.entries(access).map(([k,v])=>`${k}: ${v}`).join('; ')}. Missing tags are unknown. No city inspection or whole-route accessibility certification. Neighborhood is estimated from the nearest center.`,url:`https://www.openstreetmap.org/node/${n.id}`,verification:'OpenStreetMap community data · not field verified',checked,access}];
 });
}
export async function fetchOfficialCoyoteCells(fetcher:typeof fetch=fetch,now=Date.now()):Promise<HeatCell[]>{
 const stamp=(n:number)=>new Date(n).toISOString().slice(0,19).replace('T',' '),until=stamp(now-86400000),from=stamp(now-30*86400000);const rows:any[]=[];
 for(let offset=0;offset<10000;offset+=1000){
  const p=new URLSearchParams({f:'json',where:`FormDate >= TIMESTAMP '${from}' AND FormDate <= TIMESTAMP '${until}' AND CreationDate <= TIMESTAMP '${until}'`,outFields:'objectid,FormDate,CreationDate',returnGeometry:'true',outSR:'4326',geometry:'-118.455,33.70,-118.27,33.84',geometryType:'esriGeometryEnvelope',inSR:'4326',spatialRel:'esriSpatialRelIntersects',orderByFields:'objectid ASC',resultRecordCount:'1000',resultOffset:String(offset)});
  const response=await fetcher(`${coyoteLayer}/query?${p}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Official coyote source HTTP ${response.status}`);const data=await response.json() as any;if(data.error||!Array.isArray(data.features))throw new Error('Official coyote source unavailable.');
  for(const f of data.features){const a=f.attributes||{},g=f.geometry||{};if(bbox(g.y,g.x)&&typeof a.FormDate==='number'&&typeof a.CreationDate==='number'&&a.CreationDate<=now-86400000)rows.push({lat:g.y,lng:g.x,observed:new Date(a.FormDate).toISOString()});}
  if(!data.exceededTransferLimit)return heatCells(rows,now);
 }throw new Error('Official coyote response exceeded the safe limit.');
}
export type SourceStatus={name:string;status:'loaded'|'stale'|'unavailable';checked:string|null;url:string;message:string};
const pending=new Map<string,Promise<any>>();
const retryAfter=new Map<string,number>();
export async function readMapSources(db:Database,force=false,fetcher:typeof fetch=fetch){
 const status:SourceStatus[]=[];
 async function source<T>(id:string,name:string,url:string,load:()=>Promise<T>,empty:T,ttl:number):Promise<T>{
  let row=await db.prepare('SELECT data,checked FROM map_source_cache WHERE id=?').bind(id).first();
  if(!row&&id==='osm-access-v1'){const data=parseAccessNodes(accessSnapshot,accessSnapshot.checked);row={data:JSON.stringify(data),checked:accessSnapshot.checked};await db.prepare('INSERT OR IGNORE INTO map_source_cache (id,data,checked) VALUES (?,?,?)').bind(id,row.data,row.checked).run();}
  const age=row?Date.now()-Date.parse(row.checked):Infinity;
  if(row&&age<ttl&&(!force||age<3600000)){status.push({name,status:'loaded',checked:row.checked,url,message:'Last successful source check.'});return JSON.parse(row.data);}
  if((retryAfter.get(id)||0)>Date.now()){status.push({name,status:row&&age<7*86400000?'stale':'unavailable',checked:row?.checked||null,url,message:'Source retry is cooling down; last successful data shown when available.'});return row&&age<7*86400000?JSON.parse(row.data):empty;}
  try{
   let job=pending.get(id);if(!job){job=load();pending.set(id,job);}const data=await job;const checked=new Date().toISOString();await db.prepare('INSERT INTO map_source_cache (id,data,checked) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,checked=excluded.checked').bind(id,JSON.stringify(data),checked).run();status.push({name,status:'loaded',checked,url,message:'Source checked successfully.'});return data;
  }catch(error){retryAfter.set(id,Date.now()+300000);console.warn('Map source unavailable',id,error instanceof Error?error.message:'Unknown upstream failure');status.push({name,status:row&&age<7*86400000?'stale':'unavailable',checked:row?.checked||null,url,message:row&&age<7*86400000?'Source refresh failed; showing older data.':'Source could not be loaded or cached data expired; no sightings or ramps have been invented.'});return row&&age<7*86400000?JSON.parse(row.data):empty;}
  finally{pending.delete(id);}
 }
 const [accessible,officialCoyotes]=await Promise.all([
 source<MapFeature[]>('osm-access-v1','OpenStreetMap ramps & entrances','https://www.openstreetmap.org/copyright',async()=>{const query='[out:json][timeout:20];(node["kerb"~"lowered|flush"](33.70,-118.43,33.82,-118.30);node["ramp:wheelchair"="yes"](33.70,-118.43,33.82,-118.30);node["entrance"]["wheelchair"="yes"](33.70,-118.43,33.82,-118.30););out tags center;';const r=await fetcher('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','User-Agent':'PeninsulaNeighbor/2.0 (community map)'},body:new URLSearchParams({data:query}).toString(),signal:AbortSignal.timeout(25000)});if(!r.ok)throw new Error(`OSM data unavailable: HTTP ${r.status}`);return parseAccessNodes(await r.json(),new Date().toISOString());},[],86400000),
 source<HeatCell[]>('official-coyotes-v1','Peninsula city coyote reports',coyoteLayer,()=>fetchOfficialCoyoteCells(fetcher),[],6*3600000)
 ]);
 return {accessible,officialCoyotes,status};
}
