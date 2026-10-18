import assert from 'node:assert/strict';
const base=process.env.PENINSULA_PREVIEW_URL||'http://127.0.0.1:5173';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('This smoke test only writes to a local preview.');
const login=await fetch(`${base}/signin-with-chatgpt?return_to=/`,{redirect:'manual'});
const cookie=login.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
assert.ok(cookie,'Development sign-in must return a cookie.');
async function call(path,method='GET',body){const response=await fetch(`${base}/api/${path}`,{method,headers:{Cookie:cookie,Origin:base,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const data=await response.json();assert.ok(response.ok,`${method} ${path}: ${JSON.stringify(data)}`);return data;}
const created=[];
try{
  const{profile}=await call('me');assert.ok(profile.name);assert.ok(Array.isArray((await call('inbox')).conversations));
  const post=await call('posts','POST',{type:'Offer help',title:'QA test — disposable service offer',body:'This is a local automated verification entry and will be removed.',area:'Palos Verdes Estates',topic:'Learning & skills',days:7});created.push(['posts',post.id]);
  await call(`posts/${post.id}/comments`,'POST',{body:'Disposable verification reply.'});
  const replies=await call(`posts/${post.id}/comments`);assert.equal(replies.comments.length,1);
  await call(`posts/${post.id}`,'PATCH',{status:'resolved'});
  const event=await call('events','POST',{title:'QA test — disposable event',body:'This is a local automated verification event and will be removed.',area:'Palos Verdes Estates',location:'Public library — verification only',starts:new Date(Date.now()+86400000).toISOString(),ends:new Date(Date.now()+90000000).toISOString(),category:'Community',capacity:1});created.push(['events',event.id]);
  await call(`admin/events/${event.id}`,'PATCH',{status:'approved',note:'Local disposable QA approval.'});
  await call(`events/${event.id}/rsvp`,'POST');
  const events=await call('events');assert.equal(events.events.find(e=>e.id===event.id)?.joined,true);
  await call(`events/${event.id}/rsvp`,'DELETE');
  const entry=await call('hours','POST',{org:'QA test — disposable service record',date:'2026-01-01',minutes:30,notes:'Verification only'});created.push(['hours',entry.id]);
  assert.ok((await call('hours')).hours.some(h=>h.id===entry.id));
  console.log('HTTP smoke passed: local sign-in, shared post, reply, resolution, event, RSVP, cancellation, and private service record.');
}finally{for(const[collection,id]of created.reverse())await call(`${collection}/${id}`,'DELETE');console.log('Disposable verification records removed.');}
