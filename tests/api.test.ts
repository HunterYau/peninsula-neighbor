import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleApi,type Database} from '../lib/api.ts';
const alice={userId:'alice',fullName:'Alice Local'},bob={userId:'bob',fullName:'Bob Neighbor'};
function database(){const sqlite=new DatabaseSync(':memory:');sqlite.exec('PRAGMA foreign_keys=ON');for(const migration of readdirSync(new URL('../drizzle/',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(`../drizzle/${migration}`,import.meta.url),'utf8'));const prepare=(sql:string)=>{let params:unknown[]=[];const q={bind(...values:unknown[]){params=values;return q;},async first(){return sqlite.prepare(sql).get(...params as any[])||null;},async all(){return {results:sqlite.prepare(sql).all(...params as any[])};},async run(){return sqlite.prepare(sql).run(...params as any[]);}};return q;};return {db:{prepare,async batch(queries:any[]){sqlite.exec('BEGIN');try{const results=[];for(const query of queries)results.push(await query.run());sqlite.exec('COMMIT');return results;}catch(error){sqlite.exec('ROLLBACK');throw error;}}} as Database,sqlite};}
const request=(path:string,method='GET',data?:unknown,origin='https://local.test')=>new Request(`https://local.test/api/${path}`,{method,headers:{Origin:origin,'Content-Type':'application/json'},body:data?JSON.stringify(data):undefined});
const post={type:'Ask for help',title:'Learning to compost at home',body:'Looking for a neighbor who can share composting basics.',area:'Palos Verdes Estates',topic:'Garden & environment',days:30};
const event={title:'Community skill sharing',body:'A public learning afternoon for local neighbors.',area:'Palos Verdes Estates',location:'Malaga Cove Library community space',starts:new Date(Date.now()+86400000).toISOString(),ends:new Date(Date.now()+90000000).toISOString(),category:'Community',capacity:1,access:'Contact the organizer about access requirements.'};

test('anonymous writes and cross-origin requests are rejected',async()=>{const{db}=database();assert.equal((await handleApi(request('posts','POST',post),db,null)).status,401);assert.equal((await handleApi(request('posts','POST',post,'https://evil.test'),db,alice)).status,403);});
test('shared posts and replies work across users; ownership protects changes',async()=>{const{db}=database();const created=await handleApi(request('posts','POST',post),db,alice);assert.equal(created.status,201);const{id}=await created.json() as any;const list=await(await handleApi(request('posts'),db,bob)).json() as any;assert.equal(list.posts[0].title,post.title);assert.equal(list.posts[0].mine,false);assert.equal(list.posts[0].name,'Alice');assert.equal('author'in list.posts[0],false);assert.equal((await handleApi(request(`posts/${id}`,'DELETE'),db,bob)).status,403);assert.equal((await handleApi(request(`posts/${id}/comments`,'POST',{body:'I can share a few ideas.'}),db,bob)).status,201);const replies=await(await handleApi(request(`posts/${id}/comments`),db,alice)).json() as any;assert.equal(replies.comments[0].name,'Bob');assert.equal((await handleApi(request(`posts/${id}`,'PATCH',{status:'resolved'}),db,alice)).status,200);assert.equal((await handleApi(request(`posts/${id}/comments`,'POST',{body:'Late reply'}),db,bob)).status,409);assert.equal((await handleApi(request(`posts/${id}`,'DELETE'),db,alice)).status,200);assert.equal((await handleApi(request(`posts/${id}/comments`),db,bob)).status,404);});
test('post filters use bound parameters and do not treat SQL text as a command',async()=>{const{db}=database();await handleApi(request('posts','POST',post),db,alice);const results=await(await handleApi(request("posts?q='+OR+1%3D1--"),db,null)).json() as any;assert.equal(results.posts.length,0);const match=await(await handleApi(request('posts?q=compost&type=Ask%20for%20help'),db,null)).json() as any;assert.equal(match.posts.length,1);});
test('invalid content never reaches shared storage',async()=>{const{db,sqlite}=database();const response=await handleApi(request('posts','POST',{...post,title:'x',type:'Spam',days:999}),db,alice);assert.equal(response.status,400);assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM posts').get() as any).n,0);});
test('RSVPs are idempotent, respect capacity, and permit cancellation',async()=>{const{db}=database();const{id}=await(await handleApi(request('events','POST',event),db,alice)).json() as any;assert.equal((await handleApi(request(`events/${id}/rsvp`,'POST'),db,alice)).status,200);assert.equal((await handleApi(request(`events/${id}/rsvp`,'POST'),db,alice)).status,200);assert.equal((await handleApi(request(`events/${id}/rsvp`,'POST'),db,bob)).status,409);const list=await(await handleApi(request('events'),db,alice)).json() as any;assert.equal(list.events[0].attending,1);assert.equal(list.events[0].joined,true);await handleApi(request(`events/${id}/rsvp`,'DELETE'),db,alice);assert.equal((await handleApi(request(`events/${id}/rsvp`,'POST'),db,bob)).status,200);assert.equal((await handleApi(request(`events/${id}`,'DELETE'),db,bob)).status,403);await handleApi(request(`events/${id}`,'DELETE'),db,alice);assert.equal((await handleApi(request(`events/${id}/rsvp`,'POST'),db,bob)).status,404);});
test('past events and reversed intervals are rejected',async()=>{const{db}=database();assert.equal((await handleApi(request('events','POST',{...event,ends:new Date(Date.now()-86400000).toISOString()}),db,alice)).status,400);});
test('preferences and service records stay private to their member',async()=>{const{db}=database();const preferences={saved:['malaga-library'],plan:[],area:'Palos Verdes Estates',prep:['zone'],reminders:[],interests:[],largeText:false};await handleApi(request('preferences','PUT',preferences),db,alice);assert.deepEqual((await(await handleApi(request('preferences'),db,alice)).json() as any).preferences.saved,['malaga-library']);assert.deepEqual((await(await handleApi(request('preferences'),db,bob)).json() as any).preferences.saved,[]);assert.equal((await handleApi(request('preferences'),db,null)).status,401);await handleApi(request('hours','POST',{org:'Library',date:'2026-01-01',minutes:90,notes:'Sorted books'}),db,alice);assert.equal((await(await handleApi(request('hours'),db,bob)).json() as any).hours.length,0);assert.equal((await(await handleApi(request('hours'),db,alice)).json() as any).hours[0].minutes,90);});
test('reports are persisted once and never appear in public feeds',async()=>{const{db,sqlite}=database();const{id}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;const report={target:id,kind:'post',reason:'Please review this information.'};assert.equal((await handleApi(request('reports','POST',report),db,bob)).status,200);await handleApi(request('reports','POST',report),db,bob);assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM reports').get() as any).n,1);assert.equal((await handleApi(request('reports'),db,null)).status,404);});
test('expired posts disappear and quota rejects excessive writes',async()=>{const{db,sqlite}=database();const{id}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;sqlite.prepare('UPDATE posts SET expires=? WHERE id=?').run('2000-01-01T00:00:00.000Z',id);assert.equal((await(await handleApi(request('posts'),db,null)).json() as any).posts.length,0);const window=Math.floor(Date.now()/3600000);sqlite.prepare('UPDATE rate_limits SET count=120 WHERE id=?').run(`alice:${window}`);assert.equal((await handleApi(request('posts','POST',post),db,alice)).status,429);});

test('private messages are limited to participants and absent from public feeds',async()=>{
  const{db}=database(),charlie={userId:'charlie',fullName:'Charlie'};
  const{id:postId}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;
  assert.equal((await handleApi(request('inbox','POST',{postId,body:'Hello'}),db,null)).status,401);
  assert.equal((await handleApi(request('inbox','POST',{postId,body:'My own post'}),db,alice)).status,400);
  const response=await handleApi(request('inbox','POST',{postId,body:'Private handoff details for this conversation.'}),db,bob);
  assert.equal(response.status,201);const{id}=await response.json() as any;
  const detail=await(await handleApi(request(`inbox/${id}`),db,alice)).json() as any;
  assert.equal(detail.messages[0].mine,false);assert.equal(detail.conversation.name,'Bob');
  for(const method of ['GET','POST','PATCH'])assert.equal((await handleApi(request(`inbox/${id}`,method,method==='GET'?undefined:method==='POST'?{body:'Not a participant'}:{closed:true}),db,charlie)).status,404);
  assert.equal((await(await handleApi(request('inbox'),db,charlie)).json() as any).conversations.length,0);
  const same=await(await handleApi(request('inbox','POST',{postId,body:'Following up privately.'}),db,bob)).json() as any;
  assert.equal(same.id,id);
  const publicFeed=await(await handleApi(request('posts'),db,null)).text();
  assert.equal(publicFeed.includes('Private handoff details'),false);
  assert.equal((await(await handleApi(request(`posts/${postId}/comments`),db,null)).json() as any).comments.length,0);
});
test('closing a conversation stops delivery and only the closer can reopen it',async()=>{
  const{db}=database();const{id:postId}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;
  const{id}=await(await handleApi(request('inbox','POST',{postId,body:'A private question.'}),db,bob)).json() as any;
  assert.equal((await handleApi(request(`inbox/${id}`,'PATCH',{closed:true}),db,bob)).status,200);
  assert.equal((await handleApi(request(`inbox/${id}`,'POST',{body:'Should not be sent.'}),db,alice)).status,409);
  assert.equal((await handleApi(request(`inbox/${id}`,'PATCH',{closed:false}),db,alice)).status,403);
  assert.equal((await handleApi(request('inbox','POST',{postId,body:'Cannot bypass closure.'}),db,bob)).status,409);
  assert.equal((await handleApi(request(`inbox/${id}`,'PATCH',{closed:false}),db,bob)).status,200);
  assert.equal((await handleApi(request(`inbox/${id}`,'POST',{body:'Thanks, we can coordinate here.'}),db,alice)).status,201);
  await handleApi(request(`posts/${postId}`,'DELETE'),db,alice);
  assert.equal((await handleApi(request(`inbox/${id}`),db,bob)).status,200);
});
test('read acknowledgements do not mark later messages read or accept another thread’s message',async()=>{
  const{db,sqlite}=database();const{id:postId}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;
  const{id}=await(await handleApi(request('inbox','POST',{postId,body:'First message.'}),db,bob)).json() as any;
  const first=(await(await handleApi(request(`inbox/${id}`),db,alice)).json() as any).messages[0];
  sqlite.prepare('INSERT INTO messages (id,conversation,author,body,created) VALUES (?,?,?,?,?)').run('later-message',id,'bob','Arrived after the page was fetched.','2099-01-01T00:00:00.000Z');
  assert.equal((await handleApi(request(`inbox/${id}/read`,'POST',{messageId:first.id}),db,alice)).status,200);
  assert.equal((await(await handleApi(request('inbox'),db,alice)).json() as any).conversations[0].unread,1);
  assert.equal((await handleApi(request(`inbox/${id}/read`,'POST',{messageId:'not-in-this-thread'}),db,alice)).status,404);
  await handleApi(request(`inbox/${id}/read`,'POST',{messageId:'later-message'}),db,alice);
  await handleApi(request(`inbox/${id}/read`,'POST',{messageId:first.id}),db,alice);
  assert.equal((await(await handleApi(request('inbox'),db,alice)).json() as any).conversations[0].unread,0);
});
test('conversation pagination returns earlier pages without exposing other threads',async()=>{
  const{db,sqlite}=database();const{id:postId}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;
  const{id}=await(await handleApi(request('inbox','POST',{postId,body:'Initial note.'}),db,bob)).json() as any;
  for(let i=0;i<60;i++)sqlite.prepare('INSERT INTO messages (id,conversation,author,body,created) VALUES (?,?,?,?,?)').run(`message-${String(i).padStart(3,'0')}`,id,'bob',`Note ${i}`,'2099-01-01T00:00:00.000Z');
  const latest=await(await handleApi(request(`inbox/${id}`),db,alice)).json() as any;
  assert.equal(latest.messages.length,50);assert.ok(latest.older);
  const earlier=await(await handleApi(request(`inbox/${id}?before=${encodeURIComponent(latest.older)}`),db,alice)).json() as any;
  assert.equal(earlier.messages.length,11);assert.equal(earlier.older,null);
  assert.equal(new Set([...earlier.messages,...latest.messages].map(m=>m.id)).size,61);
});
test('a closure racing with a send is enforced by the insert itself',async()=>{
  const{db,sqlite}=database();const{id:postId}=await(await handleApi(request('posts','POST',post),db,alice)).json() as any;
  const{id}=await(await handleApi(request('inbox','POST',{postId,body:'Initial note.'}),db,bob)).json() as any;
  let intercepted=false;
  const racing={...db,prepare(sql:string){const statement=db.prepare(sql);return {...statement,bind(...args:unknown[]){const bound=statement.bind(...args);if(!sql.startsWith('SELECT * FROM conversations'))return bound;return {...bound,async first(){const value=await bound.first();if(!intercepted){intercepted=true;sqlite.prepare('UPDATE conversations SET closed_by=? WHERE id=?').run('bob',id);}return value;}};}};}} as Database;
  assert.equal((await handleApi(request(`inbox/${id}`,'POST',{body:'Must not pass the race.'}),racing,alice)).status,409);
  assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM messages WHERE conversation=?').get(id) as any).n,1);
});
test('public board pagination, author filters, and malformed updates work predictably',async()=>{
  const{db,sqlite}=database();await handleApi(request('me'),db,alice);await handleApi(request('me'),db,bob);
  for(let i=0;i<35;i++)sqlite.prepare('INSERT INTO posts (id,author,type,title,body,area,topic,status,created,expires) VALUES (?,?,?,?,?,?,?,?,?,?)').run(`post-${i}`,i%2?'alice':'bob',post.type,`Compost question ${i}`,post.body,post.area,post.topic,'open',new Date().toISOString(),'2999-01-01T00:00:00.000Z');
  const first=await(await handleApi(request('posts'),db,null)).json() as any;
  const next=await(await handleApi(request('posts?offset=30'),db,null)).json() as any;
  assert.equal(first.posts.length,30);assert.equal(first.more,true);assert.equal(next.posts.length,5);assert.equal(next.more,false);
  assert.equal(new Set([...first.posts,...next.posts].map(p=>p.id)).size,35);
  const own=await(await handleApi(request('posts?mine=1'),db,alice)).json() as any;
  assert.equal(own.posts.length,17);assert.ok(own.posts.every((p:{mine:boolean})=>p.mine));
  const invalid=new Request('https://local.test/api/posts/post-1',{method:'PATCH',headers:{Origin:'https://local.test','Content-Type':'application/json'},body:'{'});
  assert.equal((await handleApi(invalid,db,alice)).status,400);
});
