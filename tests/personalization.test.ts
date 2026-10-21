import test from 'node:test';
import assert from 'node:assert/strict';
import {memberSchema,recommend,type Listing} from '../lib/community-model.ts';
import {personalInterests,personalizationMatch} from '../lib/personalization.ts';
import {volunteerMatches} from '../lib/map-community.ts';
import {defaultPreferences,preferenceSchema} from '../lib/validation.ts';
import {handleApi} from '../lib/api.ts';
import {database} from './database.ts';

const base:Listing={id:'cleanup',kind:'volunteer',title:'Habitat restoration',body:'Outdoor planting and trail work with the Conservancy.',area:'Palos Verdes Estates',category:'Environment',location:'Public park',organization:'',url:'https://example.org/',contact:'',minimumAge:null,maximumAge:null,eligibility:'Confirm with organizer.',starts:null,ends:null,deadline:null,lat:null,lng:null,approximate:false,verification:'Source checked',verified:null,status:'published'};
const fixtures=[base,{...base,id:'craft',kind:'event',category:'Arts',title:'Crafts and trivia afternoon',body:'Make a painting and play games at the library.'},{...base,id:'trail',kind:'place',title:'Coastal walking trail',body:'Hike a public shoreline path and watch wildlife.'},{...base,id:'cafe',kind:'business',category:'Food',title:'Malaga Cove café',body:'A local bakery and deli.'},{...base,id:'support',kind:'resource',category:'Support',title:'Transport support',body:'Ask about transit services for older adults.'}];
test('goals separate helping, outings, places, and practical support; choosing several gives a mix',()=>{
 const get=(goals:unknown)=>recommend(fixtures,memberSchema.parse({goals})).map(i=>i.id);
 assert.deepEqual(get(['Help my community']),['cleanup']);
 assert.deepEqual(new Set(get(['Find fun things to do'])),new Set(['craft','trail','cafe']));
 assert.deepEqual(new Set(get(['Discover places to visit'])),new Set(['trail','cafe']));
 assert.deepEqual(get(['Find practical support']),['support']);
 const mixed=get(['Help my community','Find fun things to do']);assert.ok(mixed.includes('cleanup')&&mixed.includes('craft')&&mixed.includes('trail'));
 assert.deepEqual(new Set(get([])),new Set(['cleanup','craft']),'No goals or interests retains the opportunity-based default');
});
test('specific interests, place types, and ways to help affect order and explain actual listing clues',()=>{
 const settings=memberSchema.parse({goals:['Find fun things to do'],interests:['Crafts & making','Games & trivia']});
 const result=recommend(fixtures,settings);assert.equal(result[0].id,'craft');assert.ok(result[0].reasons.some(r=>r.includes('crafts & making')));
 const places=recommend(fixtures,memberSchema.parse({goals:['Discover places to visit'],placeTypes:['Cafés & food']}));assert.equal(places[0].id,'cafe');assert.ok(places[0].reasons.some(r=>r.includes('kind of place')));
 const help=memberSchema.parse({goals:['Help my community'],helpStyles:['Outdoor & conservation work']});
 const matches=volunteerMatches([{...base,id:'books',title:'Book Room',body:'Sort donated books in the library.',category:'Learning'},base],help,5);assert.equal(matches[0].id,'cleanup');assert.ok(matches[0].reasons.some(r=>r.includes('preferred way to help')));assert.equal(matches[0].potentialHours,null);
 assert.equal(personalizationMatch(fixtures[3],memberSchema.parse({placeTypes:['Beaches & coast']})).hasPersonalMatch,false,'Malaga Cove alone is not evidence of a beach');
 assert.equal(personalizationMatch({...base,title:'Food distribution',body:'Help serve meals and food.',location:'Public plaza'},memberSchema.parse({placeTypes:['Cafés & food']})).hasPersonalMatch,false,'Food volunteering alone does not establish a café venue');
 assert.equal(personalizationMatch({...base,body:'Check our website for the schedule.'},memberSchema.parse({helpStyles:['Digital & creative work']})).hasPersonalMatch,false,'A website link does not describe a digital volunteer role');
 assert.equal(personalizationMatch({...base,title:'Parts organization',body:'Help put parts in storage.',category:'Community'},memberSchema.parse({interests:['Arts']})).hasPersonalMatch,false);
});
test('expanded matching still excludes cancelled, expired, age-incompatible, and unavailable opportunities',()=>{
 const scheduled={...base,starts:'2030-01-05T17:00:00.000Z',ends:'2030-01-05T19:00:00.000Z'};
 const settings=memberSchema.parse({goals:['Help my community'],interests:['Gardening'],age:16,days:[6],from:'08:00',until:'12:00'});
 const items=[scheduled,{...scheduled,id:'adult',minimumAge:18},{...scheduled,id:'cancelled',status:'cancelled'},{...scheduled,id:'expired',deadline:'2029-01-01T00:00:00Z'},{...scheduled,id:'late',starts:'2030-01-05T22:00:00Z',ends:'2030-01-05T23:00:00Z'}];
 assert.deepEqual(recommend(items,settings,Date.parse('2030-01-01')).map(i=>i.id),['cleanup']);
});
const alice={userId:'alice',fullName:'Alice',email:'alice@example.test'},bob={userId:'bob',fullName:'Bob'};
const req=(path:string,method='GET',body?:unknown)=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:'https://local.test','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
test('new preferences persist privately, accept more than nine interests, and can be cleared',async()=>{
 const {db}=database(),settings=memberSchema.parse({interests:[...personalInterests],goals:['Help my community','Find fun things to do'],placeTypes:['Parks & trails'],helpStyles:['Tutoring & mentoring']});
 assert.equal((await handleApi(req('member','PUT',settings),db,alice)).status,200);
 const own=await(await handleApi(req('member'),db,alice)).json() as any,other=await(await handleApi(req('member'),db,bob)).json() as any;
 assert.deepEqual(own.settings,settings);assert.deepEqual(other.settings.goals,[]);assert.deepEqual(other.settings.helpStyles,[]);
 assert.equal(preferenceSchema.safeParse({...defaultPreferences(),interests:settings.interests}).success,true);
 for(const field of ['interests','goals','placeTypes','helpStyles'])assert.equal((await handleApi(req('member','PUT',{...settings,[field]:['Invented choice']}),db,alice)).status,400);
 const cleared={...settings,interests:[],goals:[],placeTypes:[],helpStyles:[]};await handleApi(req('member','PUT',cleared),db,alice);
 assert.deepEqual((await(await handleApi(req('member'),db,alice)).json() as any).settings,cleared);
});
test('old member records get empty new preferences; onboarding saves or skips without losing existing data',async()=>{
 const {db,sqlite}=database();await handleApi(req('me'),db,alice);
 sqlite.prepare('INSERT INTO member_settings (user,data,updated) VALUES (?,?,?)').run('alice',JSON.stringify({age:17,interests:['Arts'],days:[6],rewards:true}),'2026-01-01');
 const before=(await(await handleApi(req('member'),db,alice)).json() as any).settings;assert.deepEqual(before.goals,[]);assert.deepEqual(before.interests,['Arts']);
 const prefs={...defaultPreferences(),saved:['official:pve-cares']};await handleApi(req('preferences','PUT',prefs),db,alice);
 const selected={interests:[...personalInterests],goals:['Find fun things to do'],placeTypes:['Libraries & study spots'],helpStyles:['Event support']};
 assert.equal((await handleApi(req('onboarding','PUT',selected),db,alice)).status,200);
 const saved=(await(await handleApi(req('onboarding'),db,alice)).json() as any).settings;assert.deepEqual(saved,{...before,...selected});
 assert.deepEqual((await(await handleApi(req('preferences'),db,alice)).json() as any).preferences.saved,prefs.saved);
 await handleApi(req('onboarding','PUT',{skip:true}),db,alice);assert.deepEqual((await(await handleApi(req('member'),db,alice)).json() as any).settings,saved);
 await handleApi(req('onboarding','PUT',{interests:[]}),db,alice);const legacyUpdate=(await(await handleApi(req('member'),db,alice)).json() as any).settings;assert.deepEqual(legacyUpdate.goals,selected.goals);assert.deepEqual(legacyUpdate.helpStyles,selected.helpStyles);
});
