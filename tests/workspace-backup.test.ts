import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkspaceBackup} from '../lib/workspace-backup.ts';
import {defaultPreferences} from '../lib/validation.ts';
import {mergePreferences} from '../lib/tools.ts';
test('exported workspace backups round-trip all private settings and repeated imports merge without duplicates',async()=>{
 const prefs={...defaultPreferences(),saved:['malaga-library'],plan:['malaga-library'],prep:['zone'],interests:['Nature & wildlife'],largeText:true,reminders:[{id:crypto.randomUUID(),title:'Return books',date:'2027-01-31',repeat:'monthly' as const,done:false}]};
 const imported=await readWorkspaceBackup(JSON.parse(JSON.stringify({version:2,exported:new Date().toISOString(),preferences:prefs})));assert.deepEqual(imported,prefs);assert.deepEqual(mergePreferences(mergePreferences(defaultPreferences(),imported),imported),prefs);
});
test('legacy reminders have stable IDs so repeated legacy imports do not create duplicate reminders',async()=>{
 const old={version:1,saved:['malaga-library'],events:[{title:'Local library visit',start:'2027-01-31T10:00:00'}]},a=await readWorkspaceBackup(old),b=await readWorkspaceBackup(old);assert.equal(a.reminders[0].date,'2027-01-31');assert.equal(a.reminders[0].id,b.reminders[0].id);assert.equal(mergePreferences(a,b).reminders.length,1);
});
test('invalid or unrelated backup data is rejected before an existing workspace can be replaced',async()=>{
 for(const value of [null,{}, {version:3}, {version:2,preferences:{}}, {version:1,events:'not an array'}, {version:1,events:[{title:'Bad date',start:'not-a-date'}]}])await assert.rejects(()=>readWorkspaceBackup(value),/backup/i);
});
