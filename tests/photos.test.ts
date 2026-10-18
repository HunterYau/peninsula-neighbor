import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {database} from './database.ts';
import {photoSchema,decodePhoto,localPhotos,listingPhoto} from '../lib/photos.ts';
import {extractEventPhoto,refreshEventPhotos} from '../lib/event-photos.ts';
import {discoveryUpdateSchema,saveDiscoveryUpdate,readDiscoveries} from '../lib/discovery.ts';
import {handleApi} from '../lib/api.ts';
const now=new Date('2026-10-18T05:00:00.000Z');
const photo={src:'https://pvld.libnet.info/images/events/pvld/Unraveled_Fiber_Arts_Circle.png',alt:'Organizer illustration of yarn and knitting needles.',credit:'Palos Verdes Library District · event artwork',source:'https://pvld.libnet.info/event/15477164'};
const entry={source:'pvld',occurrence:'15477164|',url:photo.source,title:'Unraveled: Fiber Arts Circle',body:'Bring your projects to a fiber arts gathering at the library.',area:'Rancho Palos Verdes',location:'Miraleste Library',starts:'2026-10-19T17:00:00.000Z',ends:'2026-10-19T19:00:00.000Z',category:'Arts & learning'};
test('image metadata requires a safe public URL, description, source, and attribution',()=>{
 assert.ok(photoSchema.safeParse(photo).success);for(const src of ['javascript:alert(1)','data:image/svg+xml,<svg/>','file:///tmp/image.jpg','http://example.com/image.jpg','https://127.0.0.1/image.jpg','https://2130706433/image.jpg','https://[::1]/image.jpg','https://user:pass@example.com/image.jpg','https://example.local/image.jpg','/photos/../../secret.jpg'])assert.equal(photoSchema.safeParse({...photo,src}).success,false,src);
 assert.equal(photoSchema.safeParse({...photo,alt:''}).success,false);assert.equal(photoSchema.safeParse({...photo,source:'javascript:alert(1)'}).success,false);assert.equal(photoSchema.safeParse({...photo,license:'CC BY-SA 3.0'}).success,false);assert.equal(decodePhoto('broken-json'),null);
 assert.equal(listingPhoto({id:'event:unrelated',title:'Local event',kind:'event'}),null,'A landscape must not be substituted for an event image');
});
test('metadata extraction accepts event artwork but excludes organization logos and unapproved source pages',()=>{
 const event={url:photo.source,title:entry.title,source:'pvld'};
 const parsed=extractEventPhoto(`<meta content="${photo.src}" property="og:image"><meta property="og:image:alt" content="Yarn &amp; knitting needles">`,event);assert.equal(parsed?.src,photo.src);assert.equal(parsed?.alt,'Yarn & knitting needles');assert.equal(parsed?.source,photo.source);
 const json=extractEventPhoto(`<script type="application/ld+json">${JSON.stringify({'@graph':[{'@type':'Organization',image:'https://example.com/logo.jpg'},{'@type':'Event',image:{url:photo.src}}]})}</script>`,event);assert.equal(json?.src,photo.src);
 assert.equal(extractEventPhoto('<meta property="og:image" content="https://example.com/logo.png">',event),null);
 assert.equal(extractEventPhoto(`<meta property="og:image" content="${photo.src}">`,{...event,url:'https://evil.test/event/1'}),null);
 assert.equal(extractEventPhoto('<meta property="og:image" content="http://127.0.0.1/a.jpg">',event),null);
});
test('photo upserts persist, survive later image-free calendar imports, and can be explicitly removed',async()=>{
 const {db}=database();await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[{...entry,photo}]}),now);
 let feed=await readDiscoveries(db,now);assert.equal(feed.events[0].photo.src,photo.src);
 await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[entry]}),new Date(now.valueOf()+1000));feed=await readDiscoveries(db,now);assert.equal(feed.events[0].photo.src,photo.src);
 const checked=feed.events[0].checked;await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({photos:[{source:'pvld',url:entry.url,photo:{...photo,alt:'Updated organizer illustration of yarn.'}}]}),new Date(now.valueOf()+2000));feed=await readDiscoveries(db,now);assert.equal(feed.events[0].checked,checked,'An image check must not claim event details were rechecked');assert.equal(feed.events[0].title,entry.title);assert.equal(feed.events[0].photo.alt,'Updated organizer illustration of yarn.');
 await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({photos:[{source:'pvld',url:entry.url,photo:null}]}),now);assert.equal((await readDiscoveries(db,now)).events[0].photo,null);
});
test('background image discovery honors robots, fetches only organizer pages, and caches completed checks',async()=>{
 const {db,sqlite}=database();await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[entry]}),now);const original=globalThis.fetch,calls:string[]=[];
 try{globalThis.fetch=async(input,init)=>{assert.equal(init?.redirect,'manual');const url=String(input);calls.push(url);return new Response(url.endsWith('/robots.txt')?'User-agent: *\nDisallow: /private':`<meta property="og:image" content="${photo.src}">`);};
 const result=await refreshEventPhotos(db,now);assert.equal(result.found,1);assert.equal((await readDiscoveries(db,now)).events[0].photo.src,photo.src);assert.equal(calls.some(s=>s===photo.src),false,'The server must not fetch supplied image URLs');
 assert.equal((await refreshEventPhotos(db,now)).checked,0,'Checked pages should not be requested again immediately');
 sqlite.prepare("UPDATE discoveries SET photo_checked='' ").run();globalThis.fetch=async()=>new Response('User-agent: *\nDisallow: /');const denied=await refreshEventPhotos(db,now);assert.equal(denied.checked,0);assert.equal(denied.failed,1);
 }finally{globalThis.fetch=original;}
});
test('member event and submitted resource images stay private until administrator approval',async()=>{
 const {db}=database(),alice={userId:'alice',fullName:'Alice'},admin={userId:'admin',fullName:'Admin',email:'admin@test.example'},config={adminEmail:admin.email};
 const request=(path:string,method='GET',data?:unknown)=>new Request('https://site.test/api/'+path,{method,headers:{Origin:'https://site.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
 const event={title:'Local craft afternoon',body:'A community craft afternoon in the public library.',area:'Palos Verdes Estates',location:'Malaga Cove Library',starts:new Date(Date.now()+86400000).toISOString(),ends:new Date(Date.now()+90000000).toISOString(),category:'Arts & learning',photo};
 const created=await handleApi(request('events','POST',event),db,alice,config);assert.equal(created.status,201);const {id}=await created.json() as any;
 assert.equal((await(await handleApi(request('events'),db,null,config)).json() as any).events.length,0);await handleApi(request(`admin/events/${id}`,'PATCH',{status:'approved',note:'Image source and public event checked.'}),db,admin,config);
 assert.equal((await(await handleApi(request(`events/${id}`),db,null,config)).json() as any).events[0].photo.src,photo.src);
 const catalog=await(await handleApi(request('catalog'),db,null,config)).json() as any;assert.equal(catalog.listings.find((i:any)=>i.id===`event:${id}`).photo.credit,photo.credit);
 const submission=await handleApi(request('submissions','POST',{kind:'resource',title:'Public creative resource',body:'A useful publicly available creative resource.',area:'Palos Verdes Estates',location:'Public library',category:'Arts',photo}),db,alice,config);assert.equal(submission.status,201);const {id:submissionId}=await submission.json() as any;
 assert.equal((await(await handleApi(request('catalog'),db,null,config)).json() as any).listings.some((i:any)=>i.id===`listing:${submissionId}`),false);
 await handleApi(request(`admin/submissions/${submissionId}`,'PATCH',{status:'approved',note:'Resource and image source reviewed.'}),db,admin,config);assert.equal((await(await handleApi(request('catalog'),db,null,config)).json() as any).listings.find((i:any)=>i.id===`listing:${submissionId}`).photo.src,photo.src);
});
test('bundled local photos have existing JPEG assets and documented licenses',()=>{
 const credits=JSON.parse(readFileSync(new URL('../public/photos/credits.json',import.meta.url),'utf8'));
 for(const p of Object.values(localPhotos)){assert.ok(photoSchema.safeParse(p).success);const path=new URL('../public'+p.src,import.meta.url);assert.ok(existsSync(path));const bytes=readFileSync(path);assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);assert.ok(bytes.length<500000);const source=credits.find((c:any)=>p.src.endsWith(c.filename));assert.equal(source.source_page,p.source);assert.ok(source.author);assert.ok(source.license_url);}
});
