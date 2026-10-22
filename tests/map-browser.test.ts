import test from 'node:test';
import assert from 'node:assert/strict';
import {hoursStatus,mapListings,directionsUrl,googleMapsAreaUrl,withinBounds,type MapFilter} from '../lib/map-browser.ts';
import type {Listing} from '../lib/community-model.ts';
const now=new Date('2026-10-19T18:00:00Z');
const base:Listing={id:'malaga-library',kind:'place',title:'Malaga Cove Library',body:'A quiet library for books and study.',area:'Palos Verdes Estates',category:'Learning',location:'2400 Via Campesina',organization:'pvld.org',url:'https://www.pvld.org/locations',contact:'',minimumAge:null,maximumAge:null,eligibility:'Ask about access.',starts:null,ends:null,deadline:null,lat:33.8,lng:-118.39,approximate:true,verification:'Official source directory',verified:'2026-10-18',status:'published'};
const options:MapFilter={q:'',kind:'all',category:'All categories',area:'All areas',openOnly:false,savedOnly:false,saved:[],radius:null,center:{lat:33.79,lng:-118.39},bounds:null,sort:'distance'};
test('opening status uses Pacific time, exact closing boundaries, district holidays, and unknown states',()=>{
 assert.equal(hoursStatus(base.id,now).open,true);
 assert.equal(hoursStatus(base.id,new Date('2026-10-20T01:00:00Z')).open,false,'6 PM Pacific is closed');
 assert.equal(hoursStatus(base.id,new Date('2026-10-20T01:00:00Z')).label,'Closed now');
 assert.equal(hoursStatus(base.id,new Date('2026-10-18T18:00:00Z')).label,'Closed today','Sunday has no opening intervals');
 assert.equal(hoursStatus(base.id,new Date('2026-11-11T20:00:00Z')).label,'Closed · district holiday');
 assert.equal(hoursStatus(base.id,new Date('2027-07-05T18:00:00Z')).open,false,'Sunday holiday is also observed Monday');
 assert.equal(hoursStatus('not-published',now).open,null);
 assert.equal(hoursStatus('ranch-market',new Date('2026-10-18T22:00:00Z')).open,true);
 assert.equal(hoursStatus('ranch-market',new Date('2026-10-18T23:00:00Z')).open,false);
 assert.equal(hoursStatus('lunada-market',new Date('2026-11-01T02:00:00Z')).open,false,'Published Halloween market closure');
});
test('map search combines category, type, area, radius, saved, and map bounds without silently pinning unknown places',()=>{
 const far={...base,id:'far',title:'Coastal park',category:'Environment',lat:33.74,lng:-118.42};
 const unknown={...base,id:'unknown',title:'Library program without a venue',lat:null,lng:null};
 const items=[far,unknown,base];
 assert.deepEqual(mapListings(items,options,now).map(i=>i.id),[base.id,'far','unknown']);
 assert.equal(mapListings(items,{...options,q:'library study'},now).length,3);
 assert.deepEqual(mapListings(items,{...options,category:'Learning',radius:2},now).map(i=>i.id),[base.id]);
 const bounds={north:33.81,south:33.79,east:-118.38,west:-118.4};
 assert.deepEqual(mapListings(items,{...options,bounds},now).map(i=>i.id),[base.id]);
 assert.equal(withinBounds({lat:33.8,lng:-118.39},bounds),true);
 assert.deepEqual(mapListings(items,{...options,savedOnly:true,saved:['far']},now).map(i=>i.id),['far']);
 assert.equal(mapListings(items,{...options,kind:'event'},now).length,0);
 assert.equal(mapListings(items,{...options,area:'Rolling Hills'},now).length,0);
});
test('open filtering excludes unknown hours and event schedules; expired and cancelled events are excluded',()=>{
 const event={...base,id:'event:1',kind:'event',starts:'2026-10-20T17:00:00Z',ends:'2026-10-20T18:00:00Z'};
 assert.deepEqual(mapListings([base,event,{...base,id:'unknown'}],{...options,openOnly:true},now).map(i=>i.id),[base.id]);
 assert.equal(mapListings([{...event,status:'cancelled'},{...event,id:'expired',ends:'2026-10-18T19:00:00Z'}],options,now).length,0);
});
test('directions link uses the public destination and travel mode, and an optional explicitly supplied starting point',()=>{
 const url=new URL(directionsUrl(base,'walk'));assert.equal(url.searchParams.get('travelmode'),'walking');assert.equal(url.searchParams.has('origin'),false);assert.match(url.searchParams.get('destination')!,/2400 Via Campesina/);
 const unknownAddress={...base,location:base.area};assert.equal(new URL(directionsUrl(unknownAddress,'drive')).searchParams.get('destination'),'33.8,-118.39');
 const withOrigin=new URL(directionsUrl(base,'drive',{lat:33.787,lng:-118.402}));assert.equal(withOrigin.searchParams.get('origin'),'33.787000,-118.402000');assert.equal(withOrigin.searchParams.get('travelmode'),'driving');
 const area=new URL(googleMapsAreaUrl({lat:33.787,lng:-118.402}));assert.equal(area.searchParams.get('map_action'),'map');assert.equal(area.searchParams.get('center'),'33.787000,-118.402000');
 assert.equal(new URL(directionsUrl({...base,kind:'event',title:'A temporary workshop'},'drive')).searchParams.get('destination'),'2400 Via Campesina, Palos Verdes Estates');
});
test('map search recognizes everyday coffee, library, and coastal walking terms',()=>{
 const cafe={...base,id:'cafe',kind:'business',title:'Yellow Vase',body:'A neighborhood café, bakery, and florist.',category:'Food'};
 const trail={...base,id:'trail',title:'Coastal reserve',body:'Coastal habitat and bluff-top paths.',category:'Environment'};
 assert.deepEqual(mapListings([base,cafe,trail],{...options,q:'coffee'},now).map(i=>i.id),['cafe']);
 assert.deepEqual(mapListings([base,cafe,trail],{...options,q:'libraries'},now).map(i=>i.id),[base.id]);
 assert.deepEqual(mapListings([base,cafe,trail],{...options,q:'coastal walks'},now).map(i=>i.id),['trail']);
});
