import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './database.ts';
import {handleApi,type Identity} from '../lib/api.ts';
import {memberSchema,listingSchema,recommend,distanceMiles,ageFits,searchListings,type Listing} from '../lib/community-model.ts';
const alice={userId:'alice',fullName:'Alice Local'},bob={userId:'bob',fullName:'Bob Representative'},admin={userId:'admin',fullName:'Site Administrator',email:'admin@local.test'},config={adminEmail:'admin@local.test'};
const request=(path:string,method='GET',data?:unknown)=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:'https://local.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
const listing={kind:'volunteer',title:'Native garden volunteer afternoon',body:'Help a local organization care for a public native garden.',area:'Palos Verdes Estates',category:'Environment',location:'Malaga Cove Library garden',organization:'pvld.org',url:'https://www.pvld.org/volunteer',minimumAge:14,maximumAge:18,eligibility:'Ages 14–18. Apply with the organizer.',deadline:null,lat:33.8003,lng:-118.3891};
async function create(db:any){const r=await handleApi(request('submissions','POST',listing),db,alice,config);assert.equal(r.status,201);return (await r.json() as any).id;}
async function decision(db:any,kind:string,id:string,status='approved',who:Identity=admin){return handleApi(request(`admin/${kind}/${id}`,'PATCH',{status,note:'Independently checked with the official public contact.'}),db,who,config);}
async function claim(db:any,user=bob){await handleApi(request('organization-claims','POST',{organization:'pvld.org',evidence:'Library volunteer coordinator; verify through the public library office.'}),db,user,config);const queue=await(await handleApi(request('admin'),db,admin,config)).json() as any;const row=queue.claims.find((c:any)=>c.name===user.fullName?.split(' ')[0]);assert.ok(row);assert.equal((await decision(db,'claims',row.id)).status,200);return row.id;}

test('all community listings remain private until administrator approval and can be unpublished or withdrawn',async()=>{
 const {db}=database();const id=await create(db);
 const publicFeed=await(await handleApi(request('catalog'),db,null,config)).json() as any;assert.equal(publicFeed.listings.some((i:any)=>i.id===`listing:${id}`),false);
 assert.equal((await handleApi(request('submissions'),db,null,config)).status,401);
 assert.equal((await(await handleApi(request('submissions'),db,bob,config)).json() as any).submissions.length,0);
 assert.equal((await decision(db,'submissions',id,'approved',bob)).status,403);
 assert.equal((await handleApi(request('admin'),db,{...alice,email:admin.email})).status,403,'No configured administrator must fail closed');
 assert.equal((await decision(db,'submissions',id)).status,200);
 const approved=await(await handleApi(request('catalog'),db,null,config)).json() as any;const item=approved.listings.find((i:any)=>i.id===`listing:${id}`);assert.ok(item);assert.equal(item.verification,'Administrator-reviewed community listing');assert.equal(item.minimumAge,14);assert.ok(item.verified);assert.equal('author' in item,false);
 assert.equal((await handleApi(request(`submissions/${id}`,'DELETE'),db,bob,config)).status,403);
 assert.equal((await decision(db,'submissions',id,'rejected')).status,200);assert.equal((await(await handleApi(request('catalog'),db,null,config)).json() as any).listings.some((i:any)=>i.id===`listing:${id}`),false);
 assert.equal((await handleApi(request(`submissions/${id}`,'DELETE'),db,alice,config)).status,200);
 assert.equal((await decision(db,'submissions',id)).status,409);
});
test('new events and sightings use the same moderation boundary, without changing discussion posts',async()=>{
 const {db}=database();const event={title:'Public community craft gathering',body:'An afternoon of community crafting at a public venue.',area:'Palos Verdes Estates',location:'Malaga Cove Library',starts:new Date(Date.now()+86400000).toISOString(),ends:new Date(Date.now()+90000000).toISOString(),category:'Community',capacity:1};
 const e=await(await handleApi(request('events','POST',event),db,alice,config)).json() as any;assert.equal(e.status,'pending');
 assert.equal((await(await handleApi(request(`events/${e.id}`),db,bob,config)).json() as any).events.length,0);
 assert.equal((await(await handleApi(request('events'),db,alice,config)).json() as any).events[0].review,'pending');
 assert.equal((await handleApi(request(`events/${e.id}/rsvp`,'POST'),db,bob,config)).status,409);
 await decision(db,'events',e.id);assert.equal((await handleApi(request(`events/${e.id}/rsvp`,'POST'),db,bob,config)).status,200);
 await decision(db,'events',e.id,'rejected');assert.equal((await handleApi(request(`events/${e.id}/rsvp`,'DELETE'),db,bob,config)).status,200,'Members must still be able to cancel after unpublication');
 const sighting=await(await handleApi(request('sightings','POST',{title:'Public fundraising stand',body:'A community stand in the plaza.',area:'Rolling Hills Estates',location:'Peninsula Center public plaza',hours:2}),db,alice,config)).json() as any;
 assert.equal((await(await handleApi(request('sightings'),db,bob,config)).json() as any).sightings.length,0);await decision(db,'sightings',sighting.id);assert.equal((await(await handleApi(request('sightings'),db,bob,config)).json() as any).sightings.length,1);
 const post=await handleApi(request('posts','POST',{type:'Ask for help',title:'Question about native gardens',body:'Could a neighbor recommend native plants for a small garden?',area:'Palos Verdes Estates',topic:'Garden & environment'}),db,alice,config);assert.equal(post.status,201);assert.equal((await(await handleApi(request('posts'),db,bob,config)).json() as any).posts.length,1);
});
test('approved businesses get dedicated organization records with linked listings and public contact data',async()=>{
 const {db}=database();const r=await handleApi(request('submissions','POST',{...listing,kind:'business',title:'Independent local workshop',contact:'Public office: 555-0100',organization:''}),db,alice,config);const {id}=await r.json() as any;await decision(db,'submissions',id);
 const catalog=await(await handleApi(request('catalog'),db,null,config)).json() as any;const org=catalog.organizations.find((o:any)=>o.id===`community-${id}`);assert.ok(org);assert.equal(org.contact,'Public office: 555-0100');assert.equal(catalog.listings.find((i:any)=>i.id===`listing:${id}`).organization,org.id);
});
test('interests, age, availability, activity, and opt-in rewards stay scoped to their member',async()=>{
 const {db}=database(),settings={age:16,area:'Rolling Hills Estates',interests:['Environment'],days:[6],from:'09:00',until:'13:00',rewards:true};
 assert.equal((await handleApi(request('member','PUT',settings),db,alice,config)).status,200);
 const a=await(await handleApi(request('member'),db,alice,config)).json() as any,b=await(await handleApi(request('member'),db,bob,config)).json() as any;assert.equal(a.settings.age,16);assert.equal(b.settings.age,null);assert.equal(b.badges.length,0);assert.ok(a.badges.length>0);assert.equal((await handleApi(request('member'),db,null,config)).status,401);
 const catalog=await(await handleApi(request('catalog'),db,null,config)).text();assert.equal(catalog.includes('"age":16'),false);assert.equal((await handleApi(request('member','PUT',{...settings,from:'20:00',until:'09:00'}),db,alice,config)).status,400);
 const prefs={saved:['volunteer:library-help'],plan:[],area:'Rolling Hills Estates',prep:[],reminders:[],interests:[],largeText:false};await handleApi(request('preferences','PUT',prefs),db,alice,config);assert.equal((await(await handleApi(request('preferences'),db,bob,config)).json() as any).preferences.saved.length,0);
});
test('hours are self-reported until an approved organization representative other than the volunteer confirms them',async()=>{
 const {db,sqlite}=database();const {id}=await(await handleApi(request('hours','POST',{org:'PVLD',date:'2026-01-01',minutes:300,notes:'Helped sort donated books.'}),db,alice,config)).json() as any;
 assert.equal((await handleApi(request(`hour-verifications/${id}`,'POST',{organization:'pvld.org'}),db,bob,config)).status,403);
 assert.equal((await handleApi(request(`hour-verifications/${id}`,'POST',{organization:'pvld.org'}),db,alice,config)).status,200);
 assert.equal((await handleApi(request(`hour-verifications/${id}`,'PATCH',{status:'verified',note:'Confirmed with records.'}),db,bob,config)).status,403);
 assert.equal((await(await handleApi(request('hour-verifications'),db,bob,config)).json() as any).requests.length,0);
 const claimId=await claim(db);assert.equal((await(await handleApi(request('hour-verifications'),db,bob,config)).json() as any).requests.length,1);
 await claim(db,alice);assert.equal((await handleApi(request(`hour-verifications/${id}`,'PATCH',{status:'verified',note:'Attempt to confirm my own record.'}),db,alice,config)).status,403);
 assert.equal((await handleApi(request(`hour-verifications/${id}`,'PATCH',{status:'verified',note:'Confirmed with coordinator attendance records.'}),db,bob,config)).status,200);
 const own=await(await handleApi(request('hours'),db,alice,config)).json() as any;assert.equal(own.hours[0].verification,'verified');assert.equal(own.hours[0].verifierName,'Bob');assert.ok(own.hours[0].verifiedAt);assert.equal((await(await handleApi(request('hours'),db,bob,config)).json() as any).hours.length,0);
 assert.equal((await handleApi(request(`hour-verifications/${id}`,'POST',{organization:'rpvca.gov'}),db,alice,config)).status,409);
 const stats=await(await handleApi(request('member'),db,alice,config)).json() as any;assert.equal(stats.stats.verifiedMinutes,300);
 await decision(db,'claims',claimId,'rejected');assert.equal((await(await handleApi(request('hour-verifications'),db,bob,config)).json() as any).requests.length,0);
 await handleApi(request(`hours/${id}`,'DELETE'),db,alice,config);assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM hour_verifications').get() as any).n,0);
});
test('submission validation rejects unsafe links, inconsistent ages, unknown organizations, and past events',async()=>{
 const {db}=database();for(const bad of [{...listing,url:'javascript:alert(1)'},{...listing,minimumAge:18,maximumAge:14},{...listing,lat:34,lng:null},{...listing,organization:'made-up-org'},{...listing,kind:'event',starts:'2000-01-01T10:00:00.000Z',ends:'2000-01-01T11:00:00.000Z'}])assert.equal((await handleApi(request('submissions','POST',bad),db,alice,config)).status,400);
 assert.equal(listingSchema.safeParse({...listing,deadline:'2026-10-23T12:00:00.000Z',starts:'2026-10-22T12:00:00.000Z',ends:'2026-10-22T13:00:00.000Z'}).success,false);
});
test('recommendations explain interests, location, stated ages, and Pacific availability without inventing eligibility',()=>{
 const base:Listing={id:'1',kind:'volunteer',title:'Native garden work',body:'A public outdoor volunteer session.',area:'Palos Verdes Estates',category:'Environment',location:'Public garden',organization:'pvld.org',url:'https://www.pvld.org/',contact:'',minimumAge:14,maximumAge:18,eligibility:'Ages 14-18',starts:'2026-10-24T16:00:00.000Z',ends:'2026-10-24T19:00:00.000Z',deadline:null,lat:33.8,lng:-118.39,approximate:true,verification:'Official source',verified:null,status:'published'};
 const settings=memberSchema.parse({age:16,interests:['Environment'],days:[6],from:'08:00',until:'13:00'}),now=Date.parse('2026-10-18T00:00:00Z');const results=recommend([base,{...base,id:'2',minimumAge:18},{...base,id:'3',starts:'2026-10-25T16:00:00.000Z',ends:'2026-10-25T19:00:00.000Z'},{...base,id:'4',deadline:'2026-10-17T12:00:00.000Z'}],settings,now);assert.equal(results.length,1);assert.ok(results[0].reasons?.some(r=>r.includes('Pacific')));assert.ok(results[0].reasons?.some(r=>r.includes('age range')));assert.equal(ageFits({...base,minimumAge:null,maximumAge:null},16),null);
 const unknown=recommend([{...base,minimumAge:null,maximumAge:null,starts:null,ends:null}],settings,now);assert.ok(unknown[0].reasons?.some(r=>r.includes('not stated')));assert.ok(unknown[0].reasons?.some(r=>r.includes('Schedule varies')));
 assert.equal(distanceMiles({lat:33.8,lng:-118.39},{lat:33.8,lng:-118.39}),0);
});


test('smart search combines text, type, category, age, Pacific dates, saved IDs, and known-location radius',()=>{
 const base:Listing={id:'listing:1',kind:'volunteer',title:'Native garden work',body:'Help maintain a public garden.',area:'Palos Verdes Estates',category:'Environment',location:'Malaga Cove Library',organization:'pvld.org',url:'https://www.pvld.org/',contact:'',minimumAge:14,maximumAge:18,eligibility:'Ages 14-18',starts:'2026-10-24T01:00:00.000Z',ends:'2026-10-24T03:00:00.000Z',deadline:null,lat:33.8,lng:-118.39,approximate:true,verification:'Source checked',verified:null,status:'published'};
 const options={q:'native garden',area:'Palos Verdes Estates',kind:'volunteer',category:'Environment',radius:1,center:{lat:33.8,lng:-118.39},from:'2026-10-23',until:'2026-10-23',age:16,knownAge:true};
 const items=[base,{...base,id:'listing:2',lat:null,lng:null},{...base,id:'listing:3',minimumAge:null,maximumAge:null},{...base,id:'listing:4',minimumAge:18},{...base,id:'listing:5',starts:null,ends:null}];
 assert.deepEqual(searchListings(items,options).map(i=>i.id),['listing:1']);
 assert.equal(searchListings(items,{...options,from:'2026-10-24'}).length,0,'UTC date must not replace Pacific date');
 assert.equal(searchListings(items,{...options,age:null}).length,3,'Clearing age must not keep a hidden strict eligibility constraint');
 assert.equal(searchListings(items,{...options,saved:['listing:2']}).length,0,'Unknown locations cannot satisfy a radius');
 assert.equal(searchListings(items,{...options,radius:null,saved:['listing:2']})[0].id,'listing:2');
 assert.equal(searchListings(items,{...options,q:"garden' OR 1=1"}).length,0);
});

test('catalog consolidates imported duplicates and keeps cancellation visible only in saved search',async()=>{
 const {db}=database();const {saveDiscoveryUpdate,discoveryUpdateSchema}=await import('../lib/discovery.ts');
 const start=new Date(Date.now()+86400000).toISOString(),end=new Date(Date.now()+90000000).toISOString();
 const event={source:'rpv-recreation',url:'https://www.rpvca.gov/calendar.aspx?EID=1',title:'Public community workshop',body:'An organizer-published workshop at the community park.',area:'Rancho Palos Verdes',location:'Ladera Linda Community Park',starts:start,ends:end,category:'Community',occurrence:'1'};
 await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[event,{...event,source:'rpv-community'}]}));
 let feed=await(await handleApi(request('catalog'),db,null,config)).json() as any;assert.equal(feed.listings.filter((i:any)=>i.title===event.title).length,1);
 await saveDiscoveryUpdate(db,discoveryUpdateSchema.parse({events:[{...event,status:'cancelled'}]}),new Date(Date.now()+1000));
 feed=await(await handleApi(request('catalog'),db,null,config)).json() as any;const cancelled=feed.listings.find((i:any)=>i.title===event.title);assert.equal(cancelled.status,'cancelled');
 const opts={q:'workshop',area:'All areas',kind:'All types',category:'All categories',radius:null,center:{lat:33.8,lng:-118.39},from:'',until:'',age:null,knownAge:false};
 assert.equal(searchListings(feed.listings,opts).length,0);assert.equal(searchListings(feed.listings,{...opts,saved:[cancelled.id]}).length,1);
});
