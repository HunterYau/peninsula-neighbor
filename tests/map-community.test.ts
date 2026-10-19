import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './database.ts';
import {handleApi,type Identity} from '../lib/api.ts';
import {heatCells,householdChecklist,coverageScores,volunteerMatches,mapReportSchema} from '../lib/map-community.ts';
import {parseAccessNodes,fetchOfficialCoyoteCells,readMapSources} from '../lib/map-sources.ts';
import {memberSchema,type Listing} from '../lib/community-model.ts';
import {wheelchairRequest,parseWheelchairRoute,routeNearPoint} from '../lib/route-client.ts';
const alice={userId:'alice',fullName:'Alice'},bob={userId:'bob',fullName:'Bob'},admin={userId:'admin',fullName:'Admin',email:'admin@local.test'},config={adminEmail:'admin@local.test'};
const req=(path:string,method='GET',data?:unknown)=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:'https://local.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
const example=(kind='coyote')=>({kind,category:kind==='coyote'?'Passing through':kind==='problem'?'Broken sidewalk':'Curb ramp',area:'Palos Verdes Estates',title:'Public landmark report',details:'Private description for administrator review.',lat:33.801234,lng:-118.390123,observed:new Date(Date.now()-48*3600000).toISOString(),sourceUrl:''});
function seedCache(sqlite:any){for(const id of ['osm-access-v1','official-coyotes-v1'])sqlite.prepare('INSERT INTO map_source_cache (id,data,checked) VALUES (?,?,?)').run(id,'[]',new Date().toISOString());}
async function create(db:any,kind='coyote'){const r=await handleApi(req('map-reports','POST',example(kind)),db,alice,config);assert.equal(r.status,201);return (await r.json() as any).id;}
test('map report authorization, ownership, moderation, and exact-location privacy are enforced server-side',async()=>{
 const {db,sqlite}=database();seedCache(sqlite);assert.equal((await handleApi(req('map-reports','POST',example()),db,null,config)).status,401);
 const coyote=await create(db),access=await create(db,'accessibility'),problem=await create(db,'problem');
 assert.equal((await handleApi(req('map-admin'),db,bob,config)).status,403);assert.equal((await handleApi(req('map-admin'),db,{...alice,email:admin.email})).status,403);
 assert.equal((await handleApi(req(`map-admin/${coyote}`,'PATCH',{status:'approved',note:'Checked source.'}),db,bob,config)).status,403);
 assert.equal((await handleApi(req(`map-reports/${access}`,'DELETE'),db,bob,config)).status,403);
 assert.equal(((await (await handleApi(req('map-reports'),db,bob,config)).json()) as any).reports.length,0);
 let publicData=await(await handleApi(req('map-data'),db,null,config)).json() as any;assert.deepEqual(publicData.coyotes,[]);assert.equal(publicData.accessible.some((p:any)=>p.id===`access:${access}`),false);
 for(const id of [coyote,access,problem])assert.equal((await handleApi(req(`map-admin/${id}`,'PATCH',{status:'approved',note:'Source checked; community observation only.'}),db,admin,config)).status,200);
 // Old observation with a newly-created report must still wait 24 hours.
 publicData=await(await handleApi(req('map-data'),db,null,config)).json() as any;assert.equal(publicData.coyotes.length,0);
 sqlite.prepare('UPDATE map_reports SET created=? WHERE id=?').run(new Date(Date.now()-48*3600000).toISOString(),coyote);
 publicData=await(await handleApi(req('map-data'),db,null,config)).json() as any;assert.equal(publicData.coyotes[0].count,1);assert.notEqual(publicData.coyotes[0].lat,example().lat);assert.deepEqual(Object.keys(publicData.coyotes[0]).sort(),['count','id','lat','lng']);assert.equal(JSON.stringify(publicData).includes(example().details),true,'Reviewed access description is public');assert.equal(JSON.stringify(publicData.coyotes).includes('Private'),false);
 assert.equal(publicData.accessible.some((p:any)=>p.id===`access:${problem}`),false);
 const dash=await(await handleApi(req('map-admin'),db,admin,config)).json() as any;assert.equal(dash.reports.length,3);assert.equal(dash.problemCells.length,1);assert.equal(dash.coverage.length,5);
 assert.equal((await handleApi(req(`map-reports/${access}`,'DELETE'),db,alice,config)).status,200);assert.equal((await handleApi(req(`map-admin/${access}`,'PATCH',{status:'approved',note:'Cannot republish withdrawn.'}),db,admin,config)).status,409);
});
test('map report validation rejects incompatible categories, unsafe links, coordinates, and future observations',async()=>{
 assert.equal(mapReportSchema.safeParse({...example(),category:'Broken sidewalk'}).success,false);assert.equal(mapReportSchema.safeParse({...example(),sourceUrl:'javascript:alert(1)'}).success,false);assert.equal(mapReportSchema.safeParse({...example(),lat:35}).success,false);
 const {db}=database();assert.equal((await handleApi(req('map-reports','POST',{...example(),observed:new Date(Date.now()+86400000).toISOString()}),db,alice,config)).status,400);
});
test('heat summaries exclude recent, future, rejected, and expired reports without exposing details',()=>{
 const now=Date.now(),base={lat:33.801234,lng:-118.390123,observed:new Date(now-48*3600000).toISOString(),status:'approved'};
 const cells=heatCells([base,{...base,observed:new Date(now-3600000).toISOString()},{...base,status:'pending'},{...base,observed:new Date(now-31*86400000).toISOString()},{...base,created:new Date(now).toISOString()}],now);assert.equal(cells.length,1);assert.equal(cells[0].count,1);assert.notEqual(cells[0].lng,base.lng);
});
test('OSM access ingestion accepts only bounded real nodes and preserves source tags as unverified data',()=>{
 const nodes=parseAccessNodes({elements:[{type:'node',id:5302825045,lat:33.800393,lon:-118.3904226,tags:{kerb:'lowered',wheelchair:'yes',tactile_paving:'no'}},{type:'node',id:1,lat:50,lon:0,tags:{kerb:'lowered'}},{type:'node',id:2,lat:33.8,lon:-118.39,tags:{wheelchair:'no'}}]},'2026-10-19');assert.equal(nodes.length,1);assert.equal(nodes[0].access?.tactile_paving,'no');assert.match(nodes[0].verification,/not field verified/);assert.equal(nodes[0].url,'https://www.openstreetmap.org/node/5302825045');assert.throws(()=>parseAccessNodes({remark:'timeout',elements:[]},''),/complete/);
});
test('official coyote ingestion requests only dates and geometry and enforces both reporting and observation delay',async()=>{
 const now=Date.now(),old=now-48*3600000;let calls=0;const fake:typeof fetch=async url=>{calls++;const p=new URL(String(url)).searchParams;assert.equal(p.get('outFields'),'objectid,FormDate,CreationDate');assert.ok(p.get('where')?.includes('CreationDate <='));assert.equal(p.get('outSR'),'4326');return Response.json({features:[{attributes:{objectid:1,FormDate:old,CreationDate:old},geometry:{x:-118.39,y:33.8}},{attributes:{objectid:2,FormDate:old,CreationDate:now},geometry:{x:-118.39,y:33.8}},{attributes:{objectid:3,FormDate:old,CreationDate:old},geometry:{x:0,y:0}}]});};
 const cells=await fetchOfficialCoyoteCells(fake,now);assert.equal(calls,1);assert.equal(cells[0].count,1);assert.deepEqual(Object.keys(cells[0]).sort(),['count','id','lat','lng']);
});
test('wheelchair routing uses wheelchair costing, optional ramp, and withholds explicit stairs or badly snapped routes',()=>{
 const start={lat:33.787,lng:-118.402},end={lat:33.8003,lng:-118.3891},via={lat:33.8,lng:-118.39};const body=wheelchairRequest(start,end,via);assert.equal(body.locations.length,3);assert.equal(body.costing_options.pedestrian.type,'wheelchair');assert.equal(body.shape_format,'geojson');
 const data={code:'Ok',routes:[{distance:4211,duration:3885,geometry:{type:'LineString',coordinates:[[start.lng,start.lat],[end.lng,end.lat]]},legs:[{steps:[{distance:100,maneuver:{instruction:'Continue east.'}}]}]}]};const route=parseWheelchairRoute(data,start,end);assert.equal(route.wheelchair,true);assert.equal(route.geometry?.length,2);assert.equal(route.steps?.[0].instruction,'Continue east.');assert.throws(()=>parseWheelchairRoute({...data,routes:[{...data.routes[0],legs:[{steps:[{maneuver:{instruction:'Take the stairs.'}}]}]}]},start,end),/stairs/);assert.equal(routeNearPoint(route.geometry!,via,100),true);assert.equal(routeNearPoint(route.geometry!,{lat:33.75,lng:-118.3}),false);assert.throws(()=>parseWheelchairRoute(data,start,end,{lat:33.75,lng:-118.3}),/selected ramp/);
});
test('volunteer matching respects age and availability and estimates hours only from actual sessions',()=>{
 const now=Date.parse('2026-10-19T00:00:00Z');const item={id:'v',kind:'volunteer',title:'Habitat service',body:'Help',area:'Palos Verdes Estates',category:'Environment',location:'Park',organization:'org',url:'https://pvplc.org/',contact:'',minimumAge:14,maximumAge:null,eligibility:'Apply',starts:'2026-10-24T16:00:00Z',ends:'2026-10-24T19:00:00Z',deadline:null,lat:null,lng:null,approximate:false,verification:'Organizer',verified:null,status:'published'} as Listing;
 const settings=memberSchema.parse({age:16,days:[6],from:'09:00',until:'13:00',interests:['Environment']});const matches=volunteerMatches([item,{...item,id:'flex',starts:null,ends:null}],settings,5,now);assert.equal(matches[0].potentialHours,3);assert.equal(matches[0].hoursTowardGoal,3);assert.equal(matches[1].potentialHours,null);assert.equal(volunteerMatches([item],{...settings,age:12},5,now).length,0);assert.equal(volunteerMatches([item],{...settings,days:[0]},5,now).length,0);
});
test('coverage measures catalog breadth without counting barriers, cancelled or region-wide listings; household checklist stays deterministic',()=>{
 const template={kind:'event',status:'published',area:'Palos Verdes Estates',minimumAge:14,maximumAge:18} as Listing;const rows=coverageScores([template,{...template,area:'Across the Peninsula'},{...template,area:'Rolling Hills',status:'cancelled'}],[],[]);assert.equal(rows[0].score,40);assert.equal(rows.find(r=>r.area==='Rolling Hills')?.score,0);
 const plan=householdChecklist({people:2,pets:true,mobility:true,power:true,children:true});assert.ok(plan.some(t=>t.includes('28 gallons')));assert.ok(plan.some(t=>t.includes('accessible evacuation')));assert.ok(plan.some(t=>t.includes('backup power')));
});

test('source failure retains last successful timestamps, labels older data and cools down retries',async()=>{
 const {db,sqlite}=database(),checked=new Date(Date.now()-2*86400000).toISOString();
 const feature={id:'osm:example',title:'Example cached ramp',category:'Curb ramp',lat:33.8,lng:-118.39,area:'Palos Verdes Estates',body:'Community data',url:'https://www.openstreetmap.org/',verification:'Community',checked};
 sqlite.prepare('INSERT INTO map_source_cache (id,data,checked) VALUES (?,?,?)').run('osm-access-v1',JSON.stringify([feature]),checked);
 sqlite.prepare('INSERT INTO map_source_cache (id,data,checked) VALUES (?,?,?)').run('official-coyotes-v1','[]',checked);
 let calls=0;const fail:typeof fetch=async()=>{calls++;throw new Error('Upstream unavailable');};
 const data=await readMapSources(db,false,fail);assert.equal(data.accessible.length,1);assert.equal(data.status.every(s=>s.status==='stale'&&s.checked===checked),true);assert.equal(calls,2);
 await readMapSources(db,true,fail);assert.equal(calls,2);assert.equal((await db.prepare('SELECT checked FROM map_source_cache WHERE id=?').bind('osm-access-v1').first()).checked,checked);
});
