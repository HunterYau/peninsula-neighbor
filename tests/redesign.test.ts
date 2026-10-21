import test from 'node:test';
import assert from 'node:assert/strict';
import {viewPaths,pathView,legacyDestination,safeReturnPath,hostedSignInUrl} from '../lib/navigation.ts';
import {officialResources,resourceTopics} from '../lib/official-resources.ts';
import {communityCatalog} from '../lib/community-catalog.ts';
import {searchListings,memberSchema} from '../lib/community-model.ts';
import {handleApi} from '../lib/api.ts';
import {database} from './database.ts';
const alice={userId:'alice',fullName:'Alice Local',email:'alice@example.test'},bob={userId:'bob',fullName:'Bob'};
const req=(path:string,method='GET',data?:unknown)=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:'https://local.test','Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
test('canonical routes and old shared links preserve their destination',()=>{
 for(const [view,path]of Object.entries(viewPaths)){assert.equal(pathView(path),view);assert.equal(legacyDestination('#'+view+'?q=library'),path+'?q=library');}
 assert.equal(pathView('/resources/guide/pve-cares'),'resources');assert.equal(pathView('/unknown'),null);assert.equal(legacyDestination('#content'),null);assert.equal(legacyDestination('#toString'),null);
});
test('sign-in preserves a safe next page and prevents external or recursive redirects',()=>{
 const next='/map?layer=report';const hosted=new URL(hostedSignInUrl(next),'https://local.test');const welcome=new URL(hosted.searchParams.get('return_to')!,'https://local.test');assert.equal(welcome.pathname,'/welcome');assert.equal(welcome.searchParams.get('next'),next);
 for(const bad of ['https://evil.test','//evil.test','/\\evil.test','/welcome?next=/welcome','/signin-with-chatgpt','/sign-in','/a\n','/'.repeat(1601)])assert.equal(safeReturnPath(bad),'/account');
});
test('onboarding requires identity; skipping does not change existing preferences',async()=>{
 const{db,sqlite}=database();assert.equal((await handleApi(req('onboarding'),db,null)).status,401);assert.equal((await handleApi(req('onboarding','PUT',{skip:true}),db,null)).status,401);
 const prefs={saved:['official:pve-cares'],plan:[],area:'Palos Verdes Estates',prep:['zone'],reminders:[],interests:['Arts'],largeText:true};await handleApi(req('preferences','PUT',prefs),db,alice);
 const before=sqlite.prepare('SELECT data FROM preferences WHERE user=?').get('alice');assert.equal((await handleApi(req('onboarding','PUT',{skip:true}),db,alice)).status,200);assert.deepEqual(sqlite.prepare('SELECT data FROM preferences WHERE user=?').get('alice'),before);
 const own=await(await handleApi(req('onboarding'),db,alice)).json() as any;assert.equal(own.completed,true);assert.equal(own.skipped,true);assert.equal(own.email,alice.email);assert.equal((await(await handleApi(req('onboarding'),db,bob)).json() as any).completed,false);
});
test('optional empty interests save atomically and preserve other account settings',async()=>{
 const{db,sqlite}=database();await handleApi(req('me'),db,alice);const settings={age:17,area:'Palos Verdes Estates',interests:['Arts'],days:[0,6],from:'10:00',until:'16:00',rewards:true};sqlite.prepare('INSERT INTO member_settings (user,data,updated) VALUES (?,?,?)').run('alice',JSON.stringify(settings),'2026-01-01');
 const prefs={saved:['official:pve-cares'],plan:[],area:'Palos Verdes Estates',prep:['zone'],reminders:[],interests:['Arts'],largeText:true};await handleApi(req('preferences','PUT',prefs),db,alice);
 assert.equal((await handleApi(req('onboarding','PUT',{area:'Rancho Palos Verdes',interests:[]}),db,alice)).status,200);
 const own=await(await handleApi(req('onboarding'),db,alice)).json() as any;assert.equal(own.profile.name,'Alice');assert.equal(own.completed,true);assert.deepEqual(own.settings,memberSchema.parse({...settings,area:'Rancho Palos Verdes',interests:[]}));
 const updated=(await(await handleApi(req('preferences'),db,alice)).json() as any).preferences;assert.deepEqual(updated,{...prefs,area:'Rancho Palos Verdes',interests:[]});
 assert.equal((await handleApi(req('onboarding','PUT',{name:'x',interests:['Invented']}),db,alice)).status,400);assert.equal((await(await handleApi(req('onboarding'),db,bob)).json() as any).profile.name,'Bob');
});
test('official guides have provenance and work in shared search and saved items',async()=>{
 assert.equal(new Set(officialResources.map(r=>r.id)).size,officialResources.length);assert.ok(officialResources.length>=29);
 for(const r of officialResources){assert.equal(new URL(r.url).protocol,'https:');assert.ok(resourceTopics.some(t=>t.id===r.topic));assert.ok(r.authority&&r.checked&&r.details.length&&r.prepare);}
 const{db}=database();const{listings}=await communityCatalog(db);const options={q:'',area:'All areas',kind:'All types',category:'All categories',radius:null,center:{lat:33.787,lng:-118.402},from:'',until:'',age:null,knownAge:false};
 assert.ok(searchListings(listings,{...options,q:'Books By Mail'}).some(r=>r.id==='official:pvld-books-mail'));assert.deepEqual(searchListings(listings,{...options,saved:['official:pve-cares']}).map(r=>r.id),['official:pve-cares']);
});
