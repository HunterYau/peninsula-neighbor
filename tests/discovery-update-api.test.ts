import test from 'node:test';
import assert from 'node:assert/strict';
import {handleDiscoveryUpdate} from '../lib/discovery-update-api.ts';
import {database} from './database.ts';
const admin={userId:'admin',email:'owner@local.test',fullName:'Owner',provider:'platform' as const},config={adminEmail:admin.email};
const request=(body:unknown={},origin:string|null='https://local.test',extra:Record<string,string>={})=>new Request('https://local.test/api/discovery/update',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{}),...extra},body:JSON.stringify(body)});
test('discovery writes reject anonymous forged headers, ordinary members, local email impersonation and cross-origin requests before storage',async()=>{
 const db={prepare(){throw Error('Unauthorized request touched storage.');}} as any;
 assert.equal((await handleDiscoveryUpdate(request({},null,{'X-Discovery-Writer':'scheduled-update'}),db,null,config)).status,401);
 for(const user of [{...admin,userId:'neighbor',email:'neighbor@test.local'},{...admin,provider:'local' as const},admin]){
 assert.equal((await handleDiscoveryUpdate(request({},'https://evil.test'),db,user,config)).status,403);
 }
 assert.equal((await handleDiscoveryUpdate(request(),db,{...admin,provider:'local'},config)).status,403);
 assert.equal((await handleDiscoveryUpdate(request(),db,{...admin,email:'neighbor@test.local'},config)).status,403);
 assert.equal((await handleDiscoveryUpdate(request({},null),db,admin,config)).status,403);
 assert.equal((await handleDiscoveryUpdate(request(),db,admin,{})).status,403);
 assert.equal((await handleDiscoveryUpdate(request({},'https://local.test',{'Sec-Fetch-Site':'cross-site'}),db,admin,config)).status,403);
});
test('an authenticated platform administrator can import and read back allowlisted discoveries; retries stay idempotent',async()=>{
 const {db}=database(),event={source:'pvld',url:'https://pvld.libnet.info/event/17400324',title:'Disposable verified source test',body:'Fictional event for the isolated automated test database.',area:'Palos Verdes Estates',location:'Local test library',starts:new Date(Date.now()+86400000).toISOString(),ends:new Date(Date.now()+90000000).toISOString(),category:'Arts & learning'};
 for(let i=0;i<2;i++){const response=await handleDiscoveryUpdate(request({events:[event]}),db,admin,config);assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');const result=await response.json() as any;assert.equal(result.accepted,1);assert.equal(result.feed.events.length,1);assert.equal(result.feed.events[0].title,event.title);}
 assert.equal((await handleDiscoveryUpdate(request({events:[{...event,url:'https://evil.test/event'}]}),db,admin,config)).status,400);
 assert.equal((await handleDiscoveryUpdate(request({events:'not an array'}),db,admin,config)).status,400);
});
test('calendar crawling is rate limited and failed sources retain honest outcomes',async()=>{
 const {db}=database(),original=globalThis.fetch,clock=Date.now;let calls=0;
 Date.now=()=>1792670400000;
 globalThis.fetch=async()=>{calls++;return new Response('Source unavailable',{status:503});};
 try{const first=await handleDiscoveryUpdate(request({crawl:true}),db,admin,config);assert.equal(first.status,200);const data=await first.json() as any;assert.equal(data.checks.length,3);assert.ok(data.checks.every((s:any)=>s.state==='unavailable'));assert.equal(data.feed.updated,null);const previous=calls;assert.equal((await handleDiscoveryUpdate(request({crawl:true}),db,admin,config)).status,429);assert.equal(calls,previous);}finally{globalThis.fetch=original;Date.now=clock;}
});
