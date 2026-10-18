import {profileSchema,postSchema,commentSchema,eventSchema,preferenceSchema,hourSchema,reportSchema,defaultPreferences} from './validation.ts';
import type {ZodType} from 'zod';
export type Identity={userId:string;fullName:string|null};
export type Database={prepare(sql:string):{bind(...args:unknown[]):any;first():Promise<any>;all():Promise<{results:any[]}>;run():Promise<any>};batch(queries:any[]):Promise<any[]>};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class HttpError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
async function input<T>(req:Request,schema:ZodType<T>):Promise<T>{
  if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'Send JSON data.');
  const body=await req.text();if(body.length>16000)throw new HttpError(413,'This request is too large.');
  let parsed;try{parsed=JSON.parse(body);}catch{throw new HttpError(400,'Invalid JSON.');}
  const result=schema.safeParse(parsed);if(!result.success)throw new HttpError(400,result.error.issues.map(i=>`${i.path.join('.')||'Form'}: ${i.message}`).join(' '));return result.data;
}
export async function handleApi(req:Request,db:Database,user:Identity|null):Promise<Response>{
  const url=new URL(req.url), path=url.pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),method=req.method;
  const stmt=(sql:string,...values:unknown[])=>db.prepare(sql).bind(...values);
  const one=(sql:string,...values:unknown[])=>stmt(sql,...values).first();
  const all=async(sql:string,...values:unknown[]):Promise<any[]>=>(await stmt(sql,...values).all()).results;
  const run=(sql:string,...values:unknown[])=>stmt(sql,...values).run();
  const now=()=>new Date().toISOString();
  try{
    if(!['GET','POST','PUT','PATCH','DELETE'].includes(method))return json({error:'Method not allowed.'},405);
    if(method!=='GET'){
      if(req.headers.get('origin')!==url.origin)throw new HttpError(403,'This action must start on this website.');
      if(!user)throw new HttpError(401,'Sign in to take part in the community.');
      // Bounded per-member write quota, enforced atomically across requests.
      const window=Math.floor(Date.now()/3600000),key=`${user.userId}:${window}`;
      const rate=await one('INSERT INTO rate_limits (id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count',key,(window+1)*3600000);
      if(Number(rate?.count)>120)throw new HttpError(429,'You have made many changes recently. Please try again in an hour.');
      await run('DELETE FROM rate_limits WHERE until < ?',Date.now()-86400000);
    }
    if(user)await run('INSERT OR IGNORE INTO profiles (id,name,area,bio) VALUES (?,?,?,?)',user.userId,(user.fullName?.split(' ')[0]||'Neighbor').slice(0,40),'Palos Verdes Estates','');
    const uid=user?.userId||'';
    if(path[0]==='me'){
      if(!user)return json({profile:null});
      if(method==='GET')return json({profile:await one('SELECT name,area,bio FROM profiles WHERE id=?',uid),workspace:uid});
      if(method==='PUT'){const p=await input(req,profileSchema);await run('UPDATE profiles SET name=?,area=?,bio=? WHERE id=?',p.name,p.area,p.bio,uid);return json({profile:p});}
    }
    if(path[0]==='preferences'){
      if(!user)throw new HttpError(401,'Sign in to sync your saved items.');
      if(method==='GET'){const row=await one('SELECT data FROM preferences WHERE user=?',uid);return json({preferences:row?JSON.parse(row.data):defaultPreferences(),exists:!!row});}
      if(method==='PUT'){const p=await input(req,preferenceSchema);await run('INSERT INTO preferences (user,data,updated) VALUES (?,?,?) ON CONFLICT(user) DO UPDATE SET data=excluded.data,updated=excluded.updated',uid,JSON.stringify(p),now());return json({preferences:p});}
    }
    if(path[0]==='posts'){
      const id=path[1];
      if(!id&&method==='GET'){
        const type=url.searchParams.get('type')||'',area=url.searchParams.get('area')||'',q=(url.searchParams.get('q')||'').slice(0,100),offset=Math.max(0,Math.min(10000,Number(url.searchParams.get('offset'))||0)),mine=url.searchParams.get('mine')==='1';
        const rows=await all(`SELECT p.id,p.type,p.title,p.body,p.area,p.topic,p.status,p.created,p.expires,u.name,(p.author=?) AS mine,(SELECT COUNT(*) FROM comments c WHERE c.post=p.id) AS replies FROM posts p JOIN profiles u ON u.id=p.author WHERE p.expires>? AND (?='' OR p.type=?) AND (?='' OR p.area=?) AND (?='' OR instr(lower(p.title||' '||p.body),lower(?))>0) AND (?=0 OR p.author=?) ORDER BY p.created DESC,p.id DESC LIMIT 31 OFFSET ?`,uid,now(),type,type,area,area,q,q,mine?1:0,uid,offset);
        return json({posts:rows.slice(0,30).map(p=>({...p,mine:!!p.mine})),more:rows.length>30});
      }
      if(!id&&method==='POST'){const p=await input(req,postSchema),id=crypto.randomUUID();await run('INSERT INTO posts (id,author,type,title,body,area,topic,status,created,expires) VALUES (?,?,?,?,?,?,?,?,?,?)',id,uid,p.type,p.title,p.body,p.area,p.topic,'open',now(),new Date(Date.now()+(p.days??30)*86400000).toISOString());return json({id},201);}
      if(id&&path[2]==='comments'){
        if(!await one('SELECT id FROM posts WHERE id=?',id))throw new HttpError(404,'This post was removed.');
        if(method==='GET')return json({comments:(await all('SELECT c.id,c.body,c.created,u.name,(c.author=?) AS mine FROM comments c JOIN profiles u ON u.id=c.author WHERE c.post=? ORDER BY c.created LIMIT 200',uid,id)).map(c=>({...c,mine:!!c.mine}))});
        if(method==='POST'){const p=await input(req,commentSchema);const parent=await one('SELECT status,expires FROM posts WHERE id=?',id);if(parent.status!=='open'||parent.expires<now())throw new HttpError(409,'This conversation is closed.');await run('INSERT INTO comments (id,post,author,body,created) VALUES (?,?,?,?,?)',crypto.randomUUID(),id,uid,p.body,now());return json({ok:true},201);}
      }
      if(id&&['PATCH','DELETE'].includes(method)){
        const p=await one('SELECT author FROM posts WHERE id=?',id);if(!p)throw new HttpError(404,'Post not found.');if(p.author!==uid)throw new HttpError(403,'Only the author can change this post.');
        if(method==='DELETE'){await run('DELETE FROM posts WHERE id=?',id);return json({ok:true});}
        const data=await req.json() as {status?:string};if(!['open','resolved'].includes(data.status||''))throw new HttpError(400,'Choose open or resolved.');await run('UPDATE posts SET status=? WHERE id=?',data.status,id);return json({ok:true});
      }
    }
    if(path[0]==='comments'&&path[1]&&method==='DELETE'){
      const c=await one('SELECT author FROM comments WHERE id=?',path[1]);if(!c)throw new HttpError(404,'Reply not found.');if(c.author!==uid)throw new HttpError(403,'Only the author can remove this reply.');await run('DELETE FROM comments WHERE id=?',path[1]);return json({ok:true});
    }
    if(path[0]==='events'){
      const id=path[1];
      if(!id&&method==='GET')return json({events:(await all(`SELECT e.id,e.title,e.body,e.area,e.location,e.starts,e.ends,e.category,e.access,e.capacity,e.created,u.name,(e.author=?) AS mine,(SELECT COUNT(*) FROM rsvps r WHERE r.event=e.id) AS attending,EXISTS(SELECT 1 FROM rsvps r WHERE r.event=e.id AND r.user=?) AS joined FROM events e JOIN profiles u ON u.id=e.author WHERE e.ends>? ORDER BY e.starts LIMIT 200`,uid,uid,now())).map(e=>({...e,mine:!!e.mine,joined:!!e.joined}))});
      if(!id&&method==='POST'){
        const e=await input(req,eventSchema);if(new Date(e.starts).valueOf()<Date.now()-60000)throw new HttpError(400,'Choose a future start time.');if(new Date(e.starts).valueOf()>Date.now()+366*86400000)throw new HttpError(400,'Choose a date within the next year.');const id=crypto.randomUUID();await run('INSERT INTO events (id,author,title,body,area,location,starts,ends,category,access,capacity,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',id,uid,e.title,e.body,e.area,e.location,e.starts,e.ends,e.category,e.access,e.capacity,now());return json({id},201);
      }
      if(id&&path[2]==='rsvp'&&['POST','DELETE'].includes(method)){
        const entry=await one('SELECT id,capacity,ends FROM events WHERE id=?',id);if(!entry)throw new HttpError(404,'This event was removed.');if(entry.ends<now())throw new HttpError(409,'This event has ended.');
        if(method==='DELETE'){await run('DELETE FROM rsvps WHERE event=? AND user=?',id,uid);return json({ok:true});}
        // Capacity check and insert are one SQL statement: simultaneous RSVPs cannot overbook.
        await run('INSERT OR IGNORE INTO rsvps (event,user,created) SELECT ?,?,? WHERE ?=0 OR (SELECT COUNT(*) FROM rsvps WHERE event=?)<?',id,uid,now(),entry.capacity,id,entry.capacity);
        if(!await one('SELECT event FROM rsvps WHERE event=? AND user=?',id,uid))throw new HttpError(409,'This event has reached capacity.');return json({ok:true});
      }
      if(id&&method==='DELETE'){const entry=await one('SELECT author FROM events WHERE id=?',id);if(!entry)throw new HttpError(404,'Event not found.');if(entry.author!==uid)throw new HttpError(403,'Only the organizer can remove this event.');await run('DELETE FROM events WHERE id=?',id);return json({ok:true});}
    }
    if(path[0]==='hours'){
      if(!user)throw new HttpError(401,'Sign in to keep your service record.');
      if(method==='GET')return json({hours:await all('SELECT id,org,date,minutes,notes FROM hours WHERE user=? ORDER BY date DESC LIMIT 500',uid)});
      if(method==='POST'){const h=await input(req,hourSchema);if(h.date>now().slice(0,10))throw new HttpError(400,'Log completed service, not future hours.');const id=crypto.randomUUID();await run('INSERT INTO hours (id,user,org,date,minutes,notes) VALUES (?,?,?,?,?,?)',id,uid,h.org,h.date,h.minutes,h.notes);return json({id},201);}
      if(path[1]&&method==='DELETE'){await run('DELETE FROM hours WHERE id=? AND user=?',path[1],uid);return json({ok:true});}
    }
    if(path[0]==='reports'&&method==='POST'){
      const r=await input(req,reportSchema);const table={post:'posts',event:'events',comment:'comments'}[r.kind];if(!await one(`SELECT id FROM ${table} WHERE id=?`,r.target))throw new HttpError(404,'This content no longer exists.');
      const existing=await one('SELECT id FROM reports WHERE reporter=? AND target=? AND kind=? AND status=?',uid,r.target,r.kind,'pending');if(!existing)await run('INSERT INTO reports (id,reporter,target,kind,reason,created,status) VALUES (?,?,?,?,?,?,?)',crypto.randomUUID(),uid,r.target,r.kind,r.reason,now(),'pending');return json({ok:true,message:'Report saved for site-owner review. For urgent concerns, contact the appropriate local service.'});
    }
    return json({error:'Not found.'},404);
  }catch(error){if(error instanceof HttpError)return json({error:error.message},error.status);console.error('Community API failed:',error instanceof Error?error.message:'Unknown error');return json({error:'The service could not complete this request. Please try again.'},500);}
}
