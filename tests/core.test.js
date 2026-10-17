import test from 'node:test';
import assert from 'node:assert/strict';
import {filterPlaces, makePlan, normalizeState, escapeHTML, calendarFile, toggle, planMinutes} from '../dist/core.js';
import {places, sources, opportunities} from '../dist/data.js';

test('search combines query terms, category, area, and saved-only filters',()=>{
  const result=filterPlaces(places,{query:'malaga library',category:'Arts & learning',area:'Palos Verdes Estates',savedOnly:true,saved:['malaga-library']});
  assert.deepEqual(result.map(p=>p.id),['malaga-library']);
  assert.deepEqual(filterPlaces(places,{query:'a place that does not exist'}),[]);
  assert.equal(filterPlaces(places,{savedOnly:true,saved:[]}).length,0);
});
test('suggested itinerary honors area, interests, and time including transfers',()=>{
  for(const area of ['All areas',...new Set(places.map(p=>p.area))]){
    for(const minutes of [120,180,300]){
      const plan=makePlan(places,{area,minutes});
      assert.ok(planMinutes(plan,places)<=minutes);
      assert.ok(plan.length<=3);
      assert.equal(new Set(plan).size,plan.length);
      assert.ok(plan.every(id=>area==='All areas'||places.find(p=>p.id===id).area===area));
    }
  }
  assert.deepEqual(makePlan(places,{area:'Rolling Hills Estates',category:'Coast & views',minutes:120}),[]);
});
test('storage recovery rejects malformed records and removes unknown/duplicate places',()=>{
  assert.deepEqual(normalizeState(null,[]),{saved:[],plan:[],posts:[],events:[]});
  const cleaned=normalizeState({saved:['lunada','lunada','bad'],plan:['bad','farnham'],posts:[{},null,{id:'1',title:'t',body:'b',type:'spam',area:'a'}],events:[{id:'1',title:'x',location:'y',start:'nonsense'}]},places.map(p=>p.id));
  assert.deepEqual(cleaned,{saved:['lunada'],plan:['farnham'],posts:[],events:[]});
});
test('post and import text is escaped for HTML',()=>{
  assert.equal(escapeHTML('<img src=x onerror="alert(1)"> &'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp;');
});
test('calendar export preserves time and escapes injected calendar properties',()=>{
  const ics=calendarFile({id:'event-1',title:'Books, neighbors; hello\nEND:VEVENT',location:'Library',start:'2026-10-20T14:30'});
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0'));
  assert.ok(ics.includes('SUMMARY:Books\\, neighbors\\; hello\\nEND:VEVENT'));
  assert.equal(ics.split('\r\n').filter(line=>line==='END:VEVENT').length,1);
  const value=ics.match(/DTSTART:(\w+)/)[1];
  assert.equal(value,new Date('2026-10-20T14:30').toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''));
  assert.throws(()=>calendarFile({start:'bad'}));
});
test('bookmark toggle is reversible and plan estimates include transfers',()=>{
  assert.deepEqual(toggle(toggle([],'lunada'),'lunada'),[]);
  assert.equal(planMinutes(['lunada','farnham'],places),95);
});
test('directory IDs are unique and every record links to a secure official source',()=>{
  assert.equal(new Set(places.map(p=>p.id)).size,places.length);
  for(const record of [...places,...opportunities]) assert.ok(sources[record.source]?.url.startsWith('https://'));
  for(const p of places){assert.ok(p.x>=0&&p.x<=100&&p.y>=0&&p.y<=100);assert.ok(p.duration>0);}
});
