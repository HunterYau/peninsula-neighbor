import {z} from 'zod';
import {areas,eventCategories} from './validation.ts';
import {discoverySources,evidenceUrl,sourceFor} from './discovery-sources.ts';
import type {Database} from './api.ts';
const text=(min:number,max:number)=>z.string().trim().min(min).max(max);
export const discoveryEventSchema=z.object({source:text(1,60),occurrence:z.string().max(200).default(''),url:z.string().max(1000),title:text(4,160),body:text(10,2000),area:z.enum(areas),location:text(4,200),starts:z.string().datetime(),ends:z.string().datetime(),category:z.enum(eventCategories),cost:text(1,120).default('Check organizer'),status:z.enum(['published','cancelled','review']).default('published')}).refine(e=>evidenceUrl(e.url,e.source),'Use a matching approved organizer source.').refine(e=>Date.parse(e.ends)>Date.parse(e.starts)&&Date.parse(e.ends)-Date.parse(e.starts)<=7*86400000,'Use a timed event lasting up to seven days.');
export const discoveryUpdateSchema=z.object({crawl:z.boolean().default(false),events:z.array(discoveryEventSchema).max(120).default([]),checks:z.array(z.object({source:text(1,60).refine(s=>!!sourceFor(s)),state:z.enum(['ok','unavailable']),note:text(1,240)})).max(20).default([])});
export type DiscoveredEvent=z.infer<typeof discoveryEventSchema>;
export const sightingSchema=z.object({title:text(4,100),body:text(10,1000),area:z.enum(areas),location:text(4,160),url:z.string().max(1000).default('').refine(s=>{if(!s)return true;try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}},'Use a public https link.'),hours:z.number().int().min(1).max(24).default(4)});
const clean=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();
export const eventKey=(event:Pick<DiscoveredEvent,'title'|'starts'|'location'>)=>`${event.title.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}|${new Date(event.starts).toISOString()}|${event.location.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()}`;

// CivicEngage uses local wall times with TZID. Never let the server's timezone decide.
export function calendarTime(value:string,tz='America/Los_Angeles'):string|null{
  const m=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(value);if(!m)return null;
  const expected=`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  const utc=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]);
  if(new Date(utc).toISOString().slice(0,19)!==expected)return null;
  if(m[7])return new Date(utc).toISOString();
  try{
    const fmt=new Intl.DateTimeFormat('sv-SE',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
    let adjusted=utc;
    for(let i=0;i<3;i++){const local=Date.parse(fmt.format(new Date(adjusted)).replace(' ','T')+'Z');adjusted+=utc-local;}
    if(fmt.format(new Date(adjusted)).replace(' ','T')!==expected)return null;
    return new Date(adjusted).toISOString();
  }catch{return null;}
}
const unescapeIcs=(v:string)=>v.replace(/\\[nN]/g,'\n').replace(/\\([,;\\])/g,'$1');
export function parseCalendar(ics:string,source:string,now=Date.now()):DiscoveredEvent[]{
  const events:DiscoveredEvent[]=[];
  for(const block of ics.replace(/\r?\n[ \t]/g,'').split('BEGIN:VEVENT').slice(1,501)){
    const fields:Record<string,{value:string;tz?:string}>={};
    for(const line of block.split(/\r?\n/)){const i=line.indexOf(':');if(i<1)continue;const [name,...params]=line.slice(0,i).split(';');fields[name]={value:unescapeIcs(line.slice(i+1)),tz:params.find(p=>p.startsWith('TZID='))?.slice(5).replace(/^"|"$/g,'')};}
    const start=fields.DTSTART,end=fields.DTEND;if(!start||!end)continue;
    const starts=calendarTime(start.value,start.tz),ends=calendarTime(end.value,end.tz);if(!starts||!ends||Date.parse(ends)<=now||Date.parse(starts)>now+366*86400000)continue;
    const location=clean(fields.LOCATION?.value||'');if(!location||/zoom|virtual|https?:/i.test(location))continue;
    const body=clean(fields.DESCRIPTION?.value||'');
    const listedUrl=fields.URL?.value||'';
    const url=evidenceUrl(listedUrl,source)&&!listedUrl.includes('iCalendar.aspx')?listedUrl:body.match(/https:\/\/www\.rpvca\.gov\/[^\s<>]+/i)?.[0]||(source==='pvld'&&/^\d+$/.test(fields.UID?.value||'')?`https://pvld.libnet.info/event/${fields.UID.value}`:'');
    const area=source==='pvld'?(location.includes('Peninsula Center')?'Rolling Hills Estates':location.includes('Malaga Cove')?'Palos Verdes Estates':'Rancho Palos Verdes'):'Rancho Palos Verdes';
    const title=clean(fields.SUMMARY?.value||'');
    const description=body.replace(/https?:\/\/\S+/g,'').trim()||'Published in the organizer calendar. Check the original listing for participation details.';
    const parsed=discoveryEventSchema.safeParse({source,occurrence:fields.UID?`${fields.UID.value}|${fields['RECURRENCE-ID']?.value||''}`:'',url,title,body:description.slice(0,2000),area,location:location.slice(0,200),starts,ends,category:source==='pvld'?(/craft|story|read|art|learn|book|fiber|trivia/i.test(title)?'Arts & learning':'Community'):source==='rpv-recreation'?'Community':'Civic',status:fields.STATUS?.value==='CANCELLED'?'cancelled':'published'});
    if(parsed.success)events.push(parsed.data);
  }
  return events;
}
export function robotsAllows(body:string,path:string){
  const groups:{agents:string[];rules:{allow:boolean;path:string}[]}[]=[];let group:typeof groups[number]|null=null,hasRules=false;
  for(const raw of body.split(/\r?\n/)){const line=raw.split('#')[0].trim(),i=line.indexOf(':');if(i<0)continue;const k=line.slice(0,i).toLowerCase(),v=line.slice(i+1).trim();
    if(k==='user-agent'){if(!group||hasRules){group={agents:[],rules:[]};groups.push(group);hasRules=false;}group.agents.push(v.toLowerCase());}
    else if(group&&(k==='allow'||k==='disallow')){hasRules=true;if(v)group.rules.push({allow:k==='allow',path:v});}
  }
  const specific=groups.filter(g=>g.agents.some(a=>a!=='*'&&'peninsulaneighbor'.includes(a)));
  const rules=(specific.length?specific:groups.filter(g=>g.agents.includes('*'))).flatMap(g=>g.rules).filter(r=>new RegExp('^'+r.path.split('*').map(p=>p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('.*').replace(/\\\$$/,'$')).test(path)).sort((a,b)=>b.path.length-a.path.length||Number(b.allow)-Number(a.allow));
  return !rules.length||rules[0].allow;
}
async function boundedFetch(url:string){
  // Workers does not implement redirect:error. Manual + non-2xx rejection keeps
  // every request on its fixed approved host without following Location.
  const response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'PeninsulaNeighbor/2.1 (+https://peninsula-neighbor.hunteryau.chatgpt.site)'},signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Source returned ${response.status}`);
  const reader=response.body?.getReader();if(!reader)throw new Error('Empty source response');let size=0,result='';const decoder=new TextDecoder();
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw new Error('Source exceeds download limit');result+=decoder.decode(value,{stream:true});}return result+decoder.decode();}finally{await reader.cancel();}
}
export async function crawlCalendars(){
  const events:DiscoveredEvent[]=[],checks:{source:string;state:'ok'|'unavailable';note:string}[]=[];
  // Sequential requests keep load low. Cache robots once for each host per run.
  const robots=new Map<string,string>();
  for(const source of discoverySources.filter(s=>s.mode==='calendar')){
    try{const url=new URL(source.feed);if(!robots.has(url.origin))robots.set(url.origin,await boundedFetch(url.origin+'/robots.txt'));if(!robotsAllows(robots.get(url.origin)!,url.pathname+url.search))throw new Error('Source robots policy excludes this feed');
      const content=await boundedFetch(source.feed);if(!content.includes('BEGIN:VCALENDAR'))throw new Error('Source did not return a calendar');
      const parsed=parseCalendar(content,source.id);events.push(...parsed);checks.push({source:source.id,state:'ok',note:`Calendar checked; ${parsed.length} upcoming timed listings found.`});
    }catch(error){checks.push({source:source.id,state:'unavailable',note:(error instanceof Error?error.message:'Source unavailable').slice(0,240)});}
  }
  return {events,checks};
}
export async function saveDiscoveryUpdate(db:Database,data:z.infer<typeof discoveryUpdateSchema>,now=new Date()){
  const checked=now.toISOString(),time=now.valueOf();const crawled=data.crawl?await crawlCalendars():{events:[],checks:[]};
  const events=[...crawled.events,...data.events],checks=[...crawled.checks,...data.checks];
  const accepted=events.filter(e=>Date.parse(e.ends)>time&&Date.parse(e.starts)<=time+366*86400000);
  const queries=accepted.map(e=>db.prepare('INSERT INTO discoveries (id,dedupe,source,url,title,body,area,location,starts,ends,category,cost,status,checked,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(dedupe) DO UPDATE SET source=excluded.source,url=excluded.url,title=excluded.title,body=excluded.body,area=excluded.area,location=excluded.location,starts=excluded.starts,ends=excluded.ends,category=excluded.category,cost=excluded.cost,status=excluded.status,checked=excluded.checked').bind(crypto.randomUUID(),e.occurrence?`${e.source}|${e.occurrence}`:eventKey(e),e.source,e.url,e.title,e.body,e.area,e.location,new Date(e.starts).toISOString(),new Date(e.ends).toISOString(),e.category,e.cost,e.status,checked,checked));
  // A failed check never removes old events or advances their checked timestamp.
  for(const c of checks)queries.push(db.prepare('INSERT INTO discovery_checks (source,attempted,succeeded,state,note,count) VALUES (?,?,?,?,?,?) ON CONFLICT(source) DO UPDATE SET attempted=excluded.attempted,succeeded=COALESCE(excluded.succeeded,discovery_checks.succeeded),state=excluded.state,note=excluded.note,count=excluded.count').bind(c.source,checked,c.state==='ok'?checked:null,c.state,c.note,accepted.filter(e=>e.source===c.source).length));
  queries.push(db.prepare('DELETE FROM discoveries WHERE ends<?').bind(new Date(time-30*86400000).toISOString()));
  queries.push(db.prepare('DELETE FROM sightings WHERE expires<?').bind(new Date(time-7*86400000).toISOString()));
  for(let i=0;i<queries.length;i+=60)await db.batch(queries.slice(i,i+60));
  return {accepted:accepted.length,review:accepted.filter(e=>e.status==='review').length,checks};
}
export async function readDiscoveries(db:Database,now=new Date()){
  const checked=now.toISOString();
  const rows=(await db.prepare("SELECT id,source,url,title,body,area,location,starts,ends,category,cost,status,checked,created FROM discoveries WHERE ends>? AND status<>'review' ORDER BY starts LIMIT 200").bind(checked).all()).results;
  const checks=(await db.prepare('SELECT * FROM discovery_checks').all()).results;
  const seen=new Set<string>();
  const unique=rows.filter((e:any)=>{const key=eventKey(e);if(seen.has(key))return false;seen.add(key);return true;});
  return {events:unique.map((e:any)=>({...e,stale:now.valueOf()-Date.parse(e.checked)>48*3600000})),sources:discoverySources.map(s=>({...s,feed:undefined,check:checks.find(c=>c.source===s.id)||null})),updated:checks.reduce((v:string,c:any)=>c.succeeded&&c.succeeded>v?c.succeeded:v,'')||null};
}
