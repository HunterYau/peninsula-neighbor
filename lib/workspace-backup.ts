import {defaultPreferences,preferenceSchema} from './validation.ts';
export async function readWorkspaceBackup(value:unknown){
 if(!value||typeof value!=='object')throw Error('Choose a Peninsula Neighbor backup.');
 const backup=value as Record<string,unknown>;
 if(backup.version===2){const result=preferenceSchema.safeParse(backup.preferences);if(!result.success)throw Error('This backup has invalid preferences. Your workspace was not changed.');return result.data;}
 if(backup.version!==1)throw Error('Choose a Peninsula Neighbor backup.');
 for(const key of ['saved','plan','events'])if(backup[key]!==undefined&&!Array.isArray(backup[key]))throw Error('This legacy backup is invalid. Your workspace was not changed.');
 const events=((backup.events||[]) as any[]).filter(e=>e&&typeof e.start==='string'&&typeof e.title==='string').slice(0,100);
 const reminders=await Promise.all(events.map(async event=>{
  // Stable legacy IDs make importing the same older backup safe to repeat.
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([event.title,event.start]))),id='legacy-'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
  return {id,title:event.title,date:event.start.slice(0,10),repeat:'none' as const,done:false};
 }));
 const result=preferenceSchema.safeParse({...defaultPreferences(),saved:((backup.saved||[]) as unknown[]).filter(v=>typeof v==='string'),plan:((backup.plan||[]) as unknown[]).filter(v=>typeof v==='string'),reminders});
 if(!result.success)throw Error('This legacy backup has invalid preferences. Your workspace was not changed.');
 return result.data;
}
