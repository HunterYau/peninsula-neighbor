import {profileSchema,postSchema,commentSchema,eventSchema,preferenceSchema,hourSchema,reportSchema,defaultPreferences,contactSchema,messageSchema,conversationSchema,postStatusSchema,readMessageSchema} from './validation.ts';
import type {ZodType} from 'zod';
import {decodePhoto} from './photos.ts';
import {readDiscoveries,sightingSchema} from './discovery.ts';
import {communityApi,CommunityError} from './community-api.ts';
export type Identity={userId:string;fullName:string|null;email?:string};
export type Database={prepare(sql:string):{bind(...args:unknown[]):any;first():Promise<any>;all():Promise<{results:any[]}>;run():Promise<any>};batch(queries:any[]):Promise<any[]>};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
class HttpError extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
async function input<T>(req:Request,schema:ZodType<T>):Promise<T>{
  if(!req.headers.get('content-type')?.includes('application/json'))throw new HttpError(415,'Send JSON data.');
  const body=await req.text();if(body.length>16000)throw new HttpError(413,'This request is too large.');
  let parsed;try{parsed=JSON.parse(body);}catch{throw new HttpError(400,'Invalid JSON.');}
  const result=schema.safeParse(parsed);if(!result.success)throw new HttpError(400,result.error.issues.map(i=>`${i.path.join('.')||'Form'}: ${i.message}`).join(' '));return result.data;
}
export async function handleApi(req:Request,db:Database,user:Identity|null,config:{adminEmail?:string}={}):Promise<Response>{
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
    const admin=!!user?.email&&!!config.adminEmail&&user.email.toLowerCase()===config.adminEmail.toLowerCase();
    const communityResponse=await communityApi(req,db,user,path,admin);if(communityResponse)return communityResponse;
    if(path[0]==='discovery'&&!path[1]&&method==='GET')return json(await readDiscoveries(db));
    if(path[0]==='sightings'){
      const id=path[1];
      if(!id&&method==='GET')return json({sightings:(await all("SELECT s.id,s.title,s.body,s.area,s.location,s.url,s.created,s.expires,u.name,r.status AS review,(s.author=?) AS mine FROM sightings s JOIN profiles u ON u.id=s.author LEFT JOIN content_reviews r ON r.id=s.id AND r.kind='sighting' WHERE s.expires>? AND (r.id IS NULL OR r.status='approved' OR s.author=?) ORDER BY s.created DESC LIMIT 100",uid,now(),uid)).map(s=>({...s,mine:!!s.mine}))});
      if(!id&&method==='POST'){const s=await input(req,sightingSchema),id=crypto.randomUUID();await db.batch([stmt('INSERT INTO sightings (id,author,title,body,area,location,url,created,expires) VALUES (?,?,?,?,?,?,?,?,?)',id,uid,s.title,s.body,s.area,s.location,s.url,now(),new Date(Date.now()+(s.hours??4)*3600000).toISOString()),stmt("INSERT INTO content_reviews (id,kind,status) VALUES (?,'sighting','pending')",id)]);return json({id,status:'pending'},201);}
      if(id&&method==='DELETE'){const s=await one('SELECT author FROM sightings WHERE id=?',id);if(!s)throw new HttpError(404,'Sighting not found.');if(s.author!==uid)throw new HttpError(403,'Only the author can end this sighting.');await run('DELETE FROM sightings WHERE id=?',id);return json({ok:true});}
    }
    if(path[0]==='me'){
      if(!user)return json({profile:null});
      if(method==='GET')return json({profile:await one('SELECT name,area,bio FROM profiles WHERE id=?',uid),workspace:uid,admin});
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
        const data=await input(req,postStatusSchema);await run('UPDATE posts SET status=? WHERE id=?',data.status,id);return json({ok:true});
      }
    }
    if(path[0]==='comments'&&path[1]&&method==='DELETE'){
      const c=await one('SELECT author FROM comments WHERE id=?',path[1]);if(!c)throw new HttpError(404,'Reply not found.');if(c.author!==uid)throw new HttpError(403,'Only the author can remove this reply.');await run('DELETE FROM comments WHERE id=?',path[1]);return json({ok:true});
    }
    if(path[0]==='events'){
      const id=path[1];
      if(method==='GET'&&!path[2])return json({events:(await all(`SELECT e.id,e.title,e.body,e.area,e.location,e.starts,e.ends,e.category,e.access,e.capacity,e.photo,e.created,u.name,r.status AS review,(e.author=?) AS mine,(SELECT COUNT(*) FROM rsvps r WHERE r.event=e.id) AS attending,EXISTS(SELECT 1 FROM rsvps r WHERE r.event=e.id AND r.user=?) AS joined FROM events e JOIN profiles u ON u.id=e.author LEFT JOIN content_reviews r ON r.id=e.id AND r.kind='event' WHERE e.ends>? AND (r.id IS NULL OR r.status='approved' OR e.author=?) AND (?='' OR e.id=?) ORDER BY e.starts LIMIT 200`,uid,uid,now(),uid,id||'',id||'')).map(e=>({...e,photo:decodePhoto(e.photo),mine:!!e.mine,joined:!!e.joined}))});
      if(!id&&method==='POST'){
        const e=await input(req,eventSchema);if(new Date(e.starts).valueOf()<Date.now()-60000)throw new HttpError(400,'Choose a future start time.');if(new Date(e.starts).valueOf()>Date.now()+366*86400000)throw new HttpError(400,'Choose a date within the next year.');const id=crypto.randomUUID();await db.batch([stmt('INSERT INTO events (id,author,title,body,area,location,starts,ends,category,access,capacity,photo,created) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',id,uid,e.title,e.body,e.area,e.location,e.starts,e.ends,e.category,e.access,e.capacity,e.photo?JSON.stringify(e.photo):'',now()),stmt("INSERT INTO content_reviews (id,kind,status) VALUES (?,'event','pending')",id)]);return json({id,status:'pending'},201);
      }
      if(id&&path[2]==='rsvp'&&['POST','DELETE'].includes(method)){
        const entry=await one('SELECT id,capacity,ends FROM events WHERE id=?',id);if(method==='POST'&&(await one("SELECT status FROM content_reviews WHERE id=? AND kind='event'",id))?.status&&!await one("SELECT id FROM content_reviews WHERE id=? AND kind='event' AND status='approved'",id))throw new HttpError(409,'This event is awaiting administrator approval.');if(!entry)throw new HttpError(404,'This event was removed.');if(entry.ends<now())throw new HttpError(409,'This event has ended.');
        if(method==='DELETE'){await run('DELETE FROM rsvps WHERE event=? AND user=?',id,uid);return json({ok:true});}
        // Capacity check and insert are one SQL statement: simultaneous RSVPs cannot overbook.
        await run("INSERT OR IGNORE INTO rsvps (event,user,created) SELECT ?,?,? WHERE (?=0 OR (SELECT COUNT(*) FROM rsvps WHERE event=?)<?) AND NOT EXISTS(SELECT 1 FROM content_reviews WHERE id=? AND kind='event' AND status<>'approved')",id,uid,now(),entry.capacity,id,entry.capacity,id);
        if(!await one('SELECT event FROM rsvps WHERE event=? AND user=?',id,uid))throw new HttpError(409,'This event has reached capacity.');return json({ok:true});
      }
      if(id&&method==='DELETE'){const entry=await one('SELECT author FROM events WHERE id=?',id);if(!entry)throw new HttpError(404,'Event not found.');if(entry.author!==uid)throw new HttpError(403,'Only the organizer can remove this event.');await run('DELETE FROM events WHERE id=?',id);return json({ok:true});}
    }
    if(path[0]==='inbox'){
      if(!user)throw new HttpError(401,'Sign in to use your private inbox.');
      const id=path[1];
      if(!id&&method==='GET')return json({conversations:(await all(`SELECT c.id,c.title,c.created,c.updated,u.name,COALESCE((SELECT m.body FROM messages m WHERE m.conversation=c.id ORDER BY m.created DESC,m.id DESC LIMIT 1),'') AS preview,(SELECT COUNT(*) FROM messages m WHERE m.conversation=c.id AND m.author<>? AND m.created||'|'||m.id>CASE WHEN c.host=? THEN c.host_read ELSE c.guest_read END) AS unread,(c.closed_by IS NOT NULL) AS closed,(c.closed_by=?) AS canReopen FROM conversations c JOIN profiles u ON u.id=CASE WHEN c.host=? THEN c.guest ELSE c.host END WHERE c.host=? OR c.guest=? ORDER BY c.updated DESC LIMIT 200`,uid,uid,uid,uid,uid,uid)).map(c=>({...c,closed:!!c.closed,canReopen:!!c.canReopen}))});
      if(!id&&method==='POST'){
        const data=await input(req,contactSchema),post=await one('SELECT author,title,status,expires FROM posts WHERE id=?',data.postId);
        if(!post)throw new HttpError(404,'This post was removed.');
        if(post.author===uid)throw new HttpError(400,'You cannot message yourself about your own post.');
        if(post.status!=='open'||post.expires<now())throw new HttpError(409,'This post is no longer accepting new conversations.');
        const created=now();
        await run('INSERT OR IGNORE INTO conversations (id,post,host,guest,title,created,updated,host_read,guest_read) VALUES (?,?,?,?,?,?,?,?,?)',crypto.randomUUID(),data.postId,post.author,uid,post.title,created,created,'',created);
        const thread=await one('SELECT id,closed_by FROM conversations WHERE post=? AND guest=?',data.postId,uid);
        if(thread.closed_by)throw new HttpError(409,'This conversation is closed. You can find it in your inbox.');
        const messageId=crypto.randomUUID();
        await db.batch([stmt('INSERT INTO messages (id,conversation,author,body,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM conversations WHERE id=? AND closed_by IS NULL)',messageId,thread.id,uid,data.body,created,thread.id),stmt('UPDATE conversations SET updated=? WHERE id=? AND EXISTS(SELECT 1 FROM messages WHERE id=?)',created,thread.id,messageId)]);
        if(!await one('SELECT id FROM messages WHERE id=?',messageId))throw new HttpError(409,'This conversation is closed.');
        return json({id:thread.id},201);
      }
      if(id){
        const thread=await one('SELECT * FROM conversations WHERE id=? AND (host=? OR guest=?)',id,uid,uid);
        if(!thread)throw new HttpError(404,'Conversation not found.');
        if(method==='GET'){
          const before=(url.searchParams.get('before')||'').slice(0,140);
          const rows=await all("SELECT id,body,created,(author=?) AS mine FROM messages WHERE conversation=? AND (?='' OR created||'|'||id<?) ORDER BY created DESC,id DESC LIMIT 51",uid,id,before,before);
          const page=rows.slice(0,50).reverse();
          return json({conversation:{id,title:thread.title,name:(await one('SELECT name FROM profiles WHERE id=?',thread.host===uid?thread.guest:thread.host)).name,closed:!!thread.closed_by,canReopen:thread.closed_by===uid},messages:page.map(m=>({...m,mine:!!m.mine})),older:rows.length>50?`${page[0].created}|${page[0].id}`:null});
        }
        if(path[2]==='read'&&method==='POST'){
          const data=await input(req,readMessageSchema);
          // Only advance to a message actually visible to this member; never mark future arrivals read.
          const message=await one("SELECT created||'|'||id AS cursor FROM messages WHERE conversation=? AND id=?",id,data.messageId);if(!message)throw new HttpError(404,'Message not found.');
          const column=thread.host===uid?'host_read':'guest_read';
          await run(`UPDATE conversations SET ${column}=MAX(${column},?) WHERE id=?`,message.cursor,id);return json({ok:true});
        }
        if(method==='POST'){
          const data=await input(req,messageSchema);if(thread.closed_by)throw new HttpError(409,'This conversation is closed.');const created=now();
          const messageId=crypto.randomUUID();
          await db.batch([stmt('INSERT INTO messages (id,conversation,author,body,created) SELECT ?,?,?,?,? WHERE EXISTS(SELECT 1 FROM conversations WHERE id=? AND closed_by IS NULL)',messageId,id,uid,data.body,created,id),stmt('UPDATE conversations SET updated=? WHERE id=? AND EXISTS(SELECT 1 FROM messages WHERE id=?)',created,id,messageId)]);
          if(!await one('SELECT id FROM messages WHERE id=?',messageId))throw new HttpError(409,'This conversation is closed.');return json({ok:true},201);
        }
        if(method==='PATCH'){
          const data=await input(req,conversationSchema);if(!data.closed&&thread.closed_by&&thread.closed_by!==uid)throw new HttpError(403,'Only the person who closed the conversation can reopen it.');
          if(data.closed&&thread.closed_by&&thread.closed_by!==uid)throw new HttpError(409,'The other participant has already closed this conversation.');
          await run('UPDATE conversations SET closed_by=? WHERE id=?',data.closed?uid:null,id);return json({ok:true});
        }
      }
    }
    if(path[0]==='hours'){
      if(!user)throw new HttpError(401,'Sign in to keep your service record.');
      if(method==='GET')return json({hours:await all("SELECT h.id,h.org,h.date,h.minutes,h.notes,v.organization AS organizationId,COALESCE(v.status,'self-reported') AS verification,v.note AS verificationNote,v.verified AS verifiedAt,p.name AS verifierName FROM hours h LEFT JOIN hour_verifications v ON v.hour=h.id LEFT JOIN profiles p ON p.id=v.verifier WHERE h.user=? ORDER BY h.date DESC LIMIT 500",uid)});
      if(method==='POST'){const h=await input(req,hourSchema);if(h.date>now().slice(0,10))throw new HttpError(400,'Log completed service, not future hours.');const id=crypto.randomUUID();await run('INSERT INTO hours (id,user,org,date,minutes,notes) VALUES (?,?,?,?,?,?)',id,uid,h.org,h.date,h.minutes,h.notes);return json({id},201);}
      if(path[1]&&method==='DELETE'){await run('DELETE FROM hours WHERE id=? AND user=?',path[1],uid);return json({ok:true});}
    }
    if(path[0]==='reports'&&method==='POST'){
      const r=await input(req,reportSchema);const table={post:'posts',event:'events',comment:'comments',sighting:'sightings',discovery:'discoveries'}[r.kind];if(!await one(`SELECT id FROM ${table} WHERE id=?`,r.target))throw new HttpError(404,'This content no longer exists.');
      const existing=await one('SELECT id FROM reports WHERE reporter=? AND target=? AND kind=? AND status=?',uid,r.target,r.kind,'pending');if(!existing)await run('INSERT INTO reports (id,reporter,target,kind,reason,created,status) VALUES (?,?,?,?,?,?,?)',crypto.randomUUID(),uid,r.target,r.kind,r.reason,now(),'pending');return json({ok:true,message:'Report saved for site-owner review. For urgent concerns, contact the appropriate local service.'});
    }
    return json({error:'Not found.'},404);
  }catch(error){if(error instanceof HttpError||error instanceof CommunityError)return json({error:error.message},error.status);console.error('Community API failed:',error instanceof Error?error.message:'Unknown error');return json({error:'The service could not complete this request. Please try again.'},500);}
}
