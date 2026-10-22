import type {Database,Identity} from './api.ts';
import {CommunityError} from './community-api.ts';
import {chatSaveSchema,chatChangeSchema,restoredMessages} from './ask-chat.ts';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Private account history is separate from public source retrieval and inference.
export async function askChatApi(req:Request,db:Database,user:Identity|null,path:string[]):Promise<Response|null>{
 if(path[0]!=='ask-chats')return null;
 if(!user)throw new CommunityError(401,'Sign in to access your private chat history.');
 const uid=user.userId,id=path[1],method=req.method;
 if(path.length>2||id&&!/^[0-9a-f-]{36}$/i.test(id))throw new CommunityError(404,'Chat not found.');
 const stmt=(sql:string,...args:unknown[])=>db.prepare(sql).bind(...args),one=(sql:string,...args:unknown[])=>stmt(sql,...args).first();
 async function input(schema:any){if(!req.headers.get('content-type')?.includes('application/json'))throw new CommunityError(415,'Send JSON.');if(Number(req.headers.get('content-length'))>1048576)throw new CommunityError(413,'This chat is too large to save.');const raw=await req.text();if(raw.length>1048576)throw new CommunityError(413,'This chat is too large to save.');let value;try{value=JSON.parse(raw);}catch{throw new CommunityError(400,'Invalid chat data.');}const parsed=schema.safeParse(value);if(!parsed.success)throw new CommunityError(400,'Chat data is invalid or exceeds the conversation limit.');return parsed.data;}
 if(!id&&method==='GET')return json({chats:(await stmt('SELECT id,title,created,updated,revision FROM ask_chats WHERE user=? AND deleted IS NULL ORDER BY updated DESC,id DESC LIMIT 100',uid).all()).results});
 const now=new Date().toISOString();
 if(id&&method==='PUT'){
  const data=await input(chatSaveSchema);
  // Revision and owner checks make simultaneous tabs fail safely instead of overwriting a newer conversation.
  const updated=data.revision===0?await one(`INSERT INTO ask_chats (id,user,title,data,created,updated,revision) SELECT ?,?,?,?,?,?,1 WHERE (SELECT COUNT(*) FROM ask_chats WHERE user=? AND deleted IS NULL)<100 ON CONFLICT(id) DO NOTHING RETURNING id,title,created,updated,revision`,id,uid,data.title,JSON.stringify(restoredMessages(data.messages)),now,now,uid):await one('UPDATE ask_chats SET title=?,data=?,updated=?,revision=revision+1 WHERE id=? AND user=? AND deleted IS NULL AND revision=? RETURNING id,title,created,updated,revision',data.title,JSON.stringify(restoredMessages(data.messages)),now,id,uid,data.revision);
  if(!updated)throw new CommunityError(409,'Chat could not be saved: it changed in another tab, was deleted, or the 100-conversation limit was reached. Reopen it before continuing, or start a new chat.');return json({chat:updated});
 }
 if(id){
  const row=await one('SELECT id,title,data,created,updated,revision,deleted FROM ask_chats WHERE id=? AND user=?',id,uid);if(!row)throw new CommunityError(404,'Chat not found.');
  if(method==='GET'&&!row.deleted)return json({chat:{id:row.id,title:row.title,created:row.created,updated:row.updated,revision:row.revision,messages:restoredMessages(JSON.parse(row.data))}});
  if(method==='DELETE'){await stmt('UPDATE ask_chats SET deleted=?,revision=revision+1 WHERE id=? AND user=?',now,id,uid).run();return json({ok:true});}
  if(method==='PATCH'){const change=await input(chatChangeSchema);if('restore'in change){if(row.deleted&&Number((await one('SELECT COUNT(*) AS n FROM ask_chats WHERE user=? AND deleted IS NULL',uid))?.n)>=100)throw new CommunityError(409,'Delete a conversation before restoring this chat.');await stmt('UPDATE ask_chats SET deleted=NULL,revision=revision+1 WHERE id=? AND user=?',id,uid).run();}else{if(row.deleted)throw new CommunityError(404,'Chat not found.');await stmt('UPDATE ask_chats SET title=?,updated=?,revision=revision+1 WHERE id=? AND user=?',change.title,now,id,uid).run();}const current=await one('SELECT id,title,created,updated,revision FROM ask_chats WHERE id=? AND user=?',id,uid);return json({ok:true,chat:current});}
 }
 throw new CommunityError(404,'Chat not found.');
}
