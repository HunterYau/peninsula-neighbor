import test from 'node:test';
import assert from 'node:assert/strict';
import {database} from './database.ts';
import {handleApi} from '../lib/api.ts';
import {chatSaveSchema,chatTitle,readGuestChats,restoredMessages,type ChatMessage} from '../lib/ask-chat.ts';
import {retrieveAskKnowledge} from '../lib/ask-pv.ts';
const alice={userId:'alice',fullName:'Alice'},bob={userId:'bob',fullName:'Bob'},admin={userId:'owner',fullName:'Owner',email:'owner@local.test'},config={adminEmail:admin.email};
const req=(path:string,method='GET',body?:unknown,origin='https://local.test')=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:origin,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
const message=(content='Where can I report a coyote?'):ChatMessage=>({id:crypto.randomUUID(),role:'user',content,sources:[],status:'done'});
const payload=(revision=0)=>({title:'Coyote reporting',messages:[message(),{...message('Use the Community map.'),role:'assistant' as const,engine:'source' as const,sources:retrieveAskKnowledge('How do I report a coyote sighting?',[]).sources}],revision});
test('chat history persists messages and sources privately, including for local accounts; even administrators cannot read another account',async()=>{
 const {db}=database(),id=crypto.randomUUID(),body=payload();
 for(const method of ['GET','PUT','DELETE'])assert.equal((await handleApi(req(`ask-chats/${id}`,method,method==='PUT'?body:undefined),db,null,config)).status,401);
 const saved=await handleApi(req(`ask-chats/${id}`,'PUT',body),db,{...alice,provider:'local'},config);assert.equal(saved.status,200);assert.equal(saved.headers.get('cache-control'),'no-store');assert.equal((await saved.json() as any).chat.revision,1);
 const list=await(await handleApi(req('ask-chats'),db,alice,config)).json() as any;assert.equal(list.chats.length,1);assert.equal('messages'in list.chats[0],false);
 const detail=await(await handleApi(req(`ask-chats/${id}`),db,alice,config)).json() as any;assert.deepEqual(detail.chat.messages,body.messages);assert.equal(detail.chat.title,body.title);
 for(const user of [bob,admin]){assert.equal((await handleApi(req(`ask-chats/${id}`),db,user,config)).status,404);assert.deepEqual((await(await handleApi(req('ask-chats'),db,user,config)).json() as any).chats,[]);for(const [method,value]of [['PATCH',{title:'Stolen'}],['DELETE',undefined],['PATCH',{restore:true}]]as const)assert.equal((await handleApi(req(`ask-chats/${id}`,method,value),db,user,config)).status,404);assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload(1)),db,user,config)).status,409);}
 assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload(1),'https://evil.test'),db,alice,config)).status,403);
});
test('renaming, optimistic updates, deleting, and undo preserve ownership and prevent stale tabs from reviving chats',async()=>{
 const {db}=database(),id=crypto.randomUUID();assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload()),db,alice)).status,200);
 const renamed=await(await handleApi(req(`ask-chats/${id}`,'PATCH',{title:'Wildlife help'}),db,alice)).json() as any;assert.equal(renamed.chat.title,'Wildlife help');assert.equal(renamed.chat.revision,2);
 assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload(1)),db,alice)).status,409);assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',{...payload(2),title:'Wildlife help'}),db,alice)).status,200);
 assert.equal((await handleApi(req(`ask-chats/${id}`,'DELETE'),db,alice)).status,200);assert.deepEqual((await(await handleApi(req('ask-chats'),db,alice)).json() as any).chats,[]);assert.equal((await handleApi(req(`ask-chats/${id}`),db,alice)).status,404);assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload(4)),db,alice)).status,409);
 assert.equal((await handleApi(req(`ask-chats/${id}`,'PATCH',{restore:true}),db,alice)).status,200);const restored=await(await handleApi(req(`ask-chats/${id}`),db,alice)).json() as any;assert.equal(restored.chat.messages.length,2);assert.equal(restored.chat.revision,5);
});
test('chat input is bounded, blocks unsafe saved links and normalizes interrupted answers',async()=>{
 const {db,sqlite}=database(),id=crypto.randomUUID();assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',{...payload(),messages:Array.from({length:101},()=>message())}),db,alice)).status,400);
 const unsafe=payload();unsafe.messages[1].sources[0].url='javascript:alert(1)';assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',unsafe),db,alice)).status,400);
 assert.equal(chatSaveSchema.safeParse({...payload(),messages:[{...message(),sources:[{...payload().messages[1].sources[0],localUrl:'//evil.test'}]}]}).success,false);
 assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',{...payload(),messages:[{...message(),role:'assistant',status:'working'}]}),db,alice)).status,200);
 const restored=await(await handleApi(req(`ask-chats/${id}`),db,alice)).json() as any;assert.equal(restored.chat.messages[0].status,'stopped');
 sqlite.prepare('DELETE FROM profiles WHERE id=?').run(alice.userId);assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM ask_chats').get()?.n,0);
});
test('conversation limits free a slot when a chat is deleted and do not silently truncate history',async()=>{
 const {db,sqlite}=database();await handleApi(req('me'),db,alice);for(let i=0;i<100;i++)sqlite.prepare('INSERT INTO ask_chats(id,user,title,data,created,updated,revision)VALUES(?,?,?,?,?,?,1)').run(crypto.randomUUID(),'alice',`Chat ${i}`,'[]','2026-10-22T00:00:00Z','2026-10-22T00:00:00Z');
 const id=crypto.randomUUID();assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload()),db,alice)).status,409);const old=sqlite.prepare('SELECT id FROM ask_chats LIMIT 1').get()?.id as string;await handleApi(req(`ask-chats/${old}`,'DELETE'),db,alice);assert.equal((await handleApi(req(`ask-chats/${id}`,'PUT',payload()),db,alice)).status,200);assert.equal((await handleApi(req(`ask-chats/${old}`,'PATCH',{restore:true}),db,alice)).status,409);
});
test('guest history safely round-trips sources and reports corrupt storage without overwriting it',()=>{
 const now=new Date().toISOString(),chat={id:crypto.randomUUID(),title:'Local help',messages:payload().messages,revision:1,created:now,updated:now};assert.deepEqual(readGuestChats(JSON.stringify([chat])),[chat]);assert.deepEqual(readGuestChats(null),[]);assert.throws(()=>readGuestChats('{broken'),/not been overwritten/);assert.throws(()=>readGuestChats('[{"title":"missing fields"}]'),/not been overwritten/);assert.equal(chatTitle([message('  Help   near me ')]),'Help near me');assert.equal(restoredMessages([{...message(),status:'working'}])[0].status,'stopped');
});
