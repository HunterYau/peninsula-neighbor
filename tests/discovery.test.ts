import test from 'node:test';
import assert from 'node:assert/strict';
import {calendarTime,parseCalendar,robotsAllows,discoveryUpdateSchema,saveDiscoveryUpdate,readDiscoveries,eventKey,crawlCalendars} from '../lib/discovery.ts';
import {evidenceUrl} from '../lib/discovery-sources.ts';
import {handleApi} from '../lib/api.ts';
import {database} from './database.ts';
const now=new Date('2026-10-18T05:00:00.000Z');
const event={source:'pvld',url:'https://pvld.libnet.info/event/17400324',title:'Library pop-up and crafts',body:'Join the public craft activities and local bookshop pop-up.',area:'Palos Verdes Estates' as const,location:'Malaga Cove Library',starts:'2026-10-23T18:00:00.000Z',ends:'2026-10-23T20:00:00.000Z',category:'Arts & learning' as const,cost:'Check organizer',status:'published' as const};
test('calendar times respect Pacific DST and reject all-day or impossible wall times',()=>{
  assert.equal(calendarTime('20261023T180000'),'2026-10-24T01:00:00.000Z');
  assert.equal(calendarTime('20261111T090000'),'2026-11-11T17:00:00.000Z');
  assert.equal(calendarTime('20261023T180000Z'),'2026-10-23T18:00:00.000Z');
  assert.equal(calendarTime('20260308T023000'),null);
  assert.equal(calendarTime('20260230T120000Z'),null);
  assert.equal(calendarTime('20261023'),null);
  assert.equal(calendarTime('20261023T180000','Invalid/Timezone'),null);
});
test('calendar parser unfolds fields, preserves colon text, uses organizer event URLs, and skips untimed entries',()=>{
  const ics=`BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:2738\r\nDTSTART;TZID=America/Los_Angeles:20261029T160000\r\nDTEND;TZID=America/Los_Angeles:20261029T180000\r\nSUMMARY:Pumpkin decorating: public pop-up\r\nDESCRIPTION:Crafts\\, pumpkins and more. https://www.rpvca.gov/calen\r\n dar.aspx?EID=2738\r\nLOCATION:Eastview Park - Rancho Palos Verdes\r\nURL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nUID:200\r\nDTSTART;VALUE=DATE:20261030\r\nDTEND;VALUE=DATE:20261031\r\nSUMMARY:No exact time\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  const result=parseCalendar(ics,'rpv-recreation',now.valueOf());assert.equal(result.length,1);assert.equal(result[0].url,'https://www.rpvca.gov/calendar.aspx?EID=2738');assert.equal(result[0].starts,'2026-10-29T23:00:00.000Z');assert.ok(result[0].body.includes('Crafts, pumpkins'));assert.equal(result[0].title,'Pumpkin decorating: public pop-up');
  const library=ics.replace('UID:2738','UID:17400324').replace('URL:/common/modules/iCalendar/iCalendar.aspx?feed=calendar','').replace('https://www.rpvca.gov/calen\r\n dar.aspx?EID=2738','').replace('Eastview Park - Rancho Palos Verdes','Malaga Cove Library');
  const pvld=parseCalendar(library,'pvld',now.valueOf());assert.equal(pvld[0].url,'https://pvld.libnet.info/event/17400324');assert.equal(pvld[0].area,'Palos Verdes Estates');
});
test('robots exclusions and approved evidence hosts constrain source fetching and ingestion',()=>{
  const robots='User-agent: *\nDisallow: /private\nDisallow: /events/search*\nAllow: /private/public\n';assert.equal(robotsAllows(robots,'/events/list'),true);assert.equal(robotsAllows(robots,'/events/search?term=foo'),false);assert.equal(robotsAllows(robots,'/private/data'),false);assert.equal(robotsAllows(robots,'/private/public/list'),true);
  assert.equal(robotsAllows('User-agent: PeninsulaNeighbor\nDisallow: /\nUser-agent: *\nAllow: /','/calendar'),false);
  for(const url of ['http://pvld.libnet.info/event/1','https://pvld.libnet.info.evil.test/event/1','https://user:pass@pvld.libnet.info/event/1','https://pvld.libnet.info:444/event/1'])assert.equal(evidenceUrl(url,'pvld'),false);
  assert.equal(discoveryUpdateSchema.safeParse({events:[{...event,url:'https://evil.test/event/1'}]}).success,false);
  assert.equal(discoveryUpdateSchema.safeParse({events:[{...event,ends:event.starts}]}).success,false);
});
test('imports are idempotent, cancellations persist, review stays hidden, and failures preserve old freshness',async()=>{
  const {db,sqlite}=database();const update=discoveryUpdateSchema.parse({events:[event],checks:[{source:'pvld',state:'ok',note:'Verified public listing.'}]});
  await saveDiscoveryUpdate(db,update,now);await saveDiscoveryUpdate(db,update,now);
  assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM discoveries').get() as any).n,1);
  const later=new Date(now.valueOf()+49*3600000);
  await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({checks:[{source:'pvld',state:'unavailable',note:'Source timed out.'}]}),later);
  const feed=await readDiscoveries(db,later);assert.equal(feed.events[0].stale,true);assert.equal(feed.events[0].checked,now.toISOString());assert.equal(feed.sources.find(s=>s.id==='pvld')?.check?.state,'unavailable');assert.equal(feed.updated,now.toISOString());
  await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[{...event,status:'cancelled'}]}),later);assert.equal((await readDiscoveries(db,later)).events[0].status,'cancelled');
  await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[{...event,status:'review'}]}),later);assert.equal((await readDiscoveries(db,later)).events.length,0);
  assert.equal(eventKey(event),eventKey({...event,title:'  LIBRARY POP-UP AND CRAFTS  '}));
  assert.equal((await readDiscoveries(db,new Date('2026-10-24T00:00:00Z'))).events.length,0);
});
test('neighbor sightings require membership, protect ownership, expire, and can be reported',async()=>{
  const {db,sqlite}=database(),alice={userId:'alice',fullName:'Alice'},bob={userId:'bob',fullName:'Bob'};
  const sighting={title:'Public bake-sale stand',body:'A community fundraiser in the public plaza.',area:'Rolling Hills Estates',location:'Peninsula Center public plaza',hours:2,url:''};
  const req=(path:string,method='GET',data?:unknown)=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:'https://local.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
  assert.equal((await handleApi(req('sightings','POST',sighting),db,null)).status,401);
  assert.equal((await handleApi(req('sightings','POST',{...sighting,hours:25}),db,alice)).status,400);
  assert.equal((await handleApi(req('sightings','POST',{...sighting,url:'javascript:alert(1)'}),db,alice)).status,400);
  const {id}=await(await handleApi(req('sightings','POST',sighting),db,alice)).json() as any;
  const feed=await(await handleApi(req('sightings'),db,bob)).json() as any;assert.equal(feed.sightings[0].mine,false);assert.equal('author' in feed.sightings[0],false);
  assert.equal((await handleApi(req('reports','POST',{target:id,kind:'sighting',reason:'This stand has closed.'}),db,bob)).status,200);
  assert.equal((await handleApi(req(`sightings/${id}`,'DELETE'),db,bob)).status,403);
  sqlite.prepare('UPDATE sightings SET expires=? WHERE id=?').run('2000-01-01T00:00:00.000Z',id);
  assert.equal((await(await handleApi(req('sightings'),db,null)).json() as any).sightings.length,0);
  assert.equal((await handleApi(req(`sightings/${id}`,'DELETE'),db,alice)).status,200);
});
test('stable calendar occurrence IDs update a rescheduled or renamed event without leaving a ghost listing',async()=>{
  const {db,sqlite}=database();
  await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[{...event,occurrence:'17400324|'}]}),now);
  await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[{...event,occurrence:'17400324|',title:'Rescheduled library pop-up',starts:'2026-10-24T18:00:00.000Z',ends:'2026-10-24T20:00:00.000Z'}]}),now);
  assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM discoveries').get() as any).n,1);
  assert.equal((await readDiscoveries(db,now)).events[0].title,'Rescheduled library pop-up');
});
test('crawler uses Workers-compatible manual redirects, checks robots, and does not follow redirects or accept HTML as a calendar',async()=>{
  const realFetch=globalThis.fetch,calls:string[]=[];
  try{
    globalThis.fetch=async(input,init)=>{assert.equal(init?.redirect,'manual');const url=String(input);calls.push(url);if(url.endsWith('/robots.txt'))return new Response('User-agent: *\nDisallow: /private');if(url.includes('catID=23'))return new Response(null,{status:302,headers:{Location:'https://evil.test/feed'}});if(url.includes('catID=28'))return new Response('<html>Temporarily unavailable</html>');return new Response('BEGIN:VCALENDAR\nEND:VCALENDAR');};
    const result=await crawlCalendars();assert.equal(result.checks.find(c=>c.source==='rpv-recreation')?.state,'unavailable');assert.equal(result.checks.find(c=>c.source==='rpv-community')?.state,'unavailable');assert.equal(result.checks.find(c=>c.source==='pvld')?.state,'ok');assert.equal(calls.filter(u=>u==='https://www.rpvca.gov/robots.txt').length,1);assert.equal(calls.some(u=>u.includes('evil.test')),false);
  }finally{globalThis.fetch=realFetch;}
});
