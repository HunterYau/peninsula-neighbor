import test from 'node:test';
import assert from 'node:assert/strict';
import {pacificDate,pacificTime,eventTimeRange} from '../lib/display-time.ts';
test('local events display Pacific dates even when the device timezone differs',()=>{
 const before=process.env.TZ;process.env.TZ='Asia/Tokyo';try{
 assert.equal(pacificDate('2026-10-25T06:00:00Z',{weekday:'short'}),'Sat');
 assert.equal(pacificTime('2026-10-25T06:00:00Z'),'11:00 PM');
 assert.equal(pacificDate('2026-10-24'),'Oct 24');
 assert.equal(eventTimeRange('2026-10-25T06:00:00Z','2026-10-25T08:00:00Z'),'Saturday, October 24, 2026 · 11:00 PM – Sunday, October 25, 2026 · 1:00 AM PT');
 assert.equal(eventTimeRange('2026-10-24T17:00:00Z','2026-10-24T18:00:00Z'),'Saturday, October 24, 2026 · 10:00 AM – 11:00 AM PT');
 assert.equal(pacificTime('2026-11-01T09:30:00Z'),'1:30 AM');
 }finally{if(before===undefined)delete process.env.TZ;else process.env.TZ=before;}
});
