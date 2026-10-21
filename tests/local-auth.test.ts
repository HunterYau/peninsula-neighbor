import test from 'node:test';
import assert from 'node:assert/strict';
import {handleLocalAuth,localIdentity,resolveIdentity,passwordMatches,tokenHash} from '../lib/local-auth.ts';
import {handleApi} from '../lib/api.ts';
import {database} from './database.ts';
const password='correct horse ocean orchard';
const data={name:'Test Neighbor',email:'test@example.invalid',password,remember:true};
const request=(action:string,body?:unknown,cookie='',origin='https://local.test',method='POST')=>new Request(`https://local.test/api/auth/${action}`,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},body:body&&method==='POST'?JSON.stringify(body):undefined});
const cookie=(r:Response)=>r.headers.get('set-cookie')!.split(';')[0];

test('registration stores salted hashes and an opaque persistent cookie; member data survives a new login',async()=>{
 const{db,sqlite}=database();const response=await handleLocalAuth(request('register',data),db);assert.equal(response.status,200);const firstCookie=cookie(response),secret=(await response.json() as any).recoveryCode;
 assert.match(response.headers.get('set-cookie')!,/^__Host-pn-session=[a-f0-9]{64}; Path=\/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000$/);
 const account=sqlite.prepare('SELECT * FROM local_accounts').get() as any;assert.equal(account.email,data.email);assert.ok(await passwordMatches(password,account.password_hash));assert.equal(account.password_hash.includes(password),false);assert.equal(account.recovery_hash,await tokenHash(secret));assert.equal((sqlite.prepare('SELECT hash FROM local_sessions').get() as any).hash.includes(firstCookie.split('=')[1]),false);
 const identity=await localIdentity(request('login',undefined,firstCookie),db);assert.equal(identity?.provider,'local');assert.equal(identity?.email,data.email);
 const preferences={saved:['official:pve-cares'],plan:[],area:'Palos Verdes Estates',prep:[],reminders:[],interests:['Arts'],largeText:false};
 await handleApi(new Request('https://local.test/api/preferences',{method:'PUT',headers:{Origin:'https://local.test','Content-Type':'application/json'},body:JSON.stringify(preferences)}),db,identity);
 const login=await handleLocalAuth(request('login',{email:'TEST@example.INVALID',password,remember:false}),db);assert.equal(login.status,200);assert.equal(login.headers.get('set-cookie')!.includes('Max-Age'),false);assert.notEqual(cookie(login),firstCookie);
 const returning=await localIdentity(request('login',undefined,cookie(login)),db);assert.equal(returning?.userId,identity?.userId);const saved=await(await handleApi(new Request('https://local.test/api/preferences'),db,returning)).json() as any;assert.deepEqual(saved.preferences.saved,['official:pve-cares']);
});
test('bad credentials, expired or tampered cookies, duplicates and cross-origin writes cannot authenticate',async()=>{
 const{db,sqlite}=database();const created=await handleLocalAuth(request('register',data),db),validCookie=cookie(created);
 for(const email of [data.email,'missing@example.invalid'])assert.equal((await handleLocalAuth(request('login',{email,password:'wrong'}),db)).status,401);
 assert.equal((await handleLocalAuth(request('register',data),db)).status,400);
 assert.equal((await handleLocalAuth(request('login',data,'','https://evil.test'),db)).status,403);assert.equal((await handleLocalAuth(request('logout',undefined,validCookie,'https://local.test','GET'),db)).status,405);
 assert.equal(await localIdentity(request('login',undefined,validCookie+'evil'),db),null);assert.equal(await localIdentity(request('login',undefined,validCookie+'; '+validCookie),db),null);
 sqlite.prepare('UPDATE local_sessions SET expires=0').run();assert.equal(await localIdentity(request('login',undefined,validCookie),db),null);
 assert.equal((await handleLocalAuth(request('register',{...data,email:'new@example.invalid',password:'short'}),db)).status,400);
});
test('logout revokes the server session and recovery rotates its one-time code and all sessions',async()=>{
 const{db}=database();const created=await handleLocalAuth(request('register',data),db),originalCookie=cookie(created),originalCode=(await created.json() as any).recoveryCode;
 const extra=await handleLocalAuth(request('login',data),db);assert.equal((await handleLocalAuth(request('logout',undefined,cookie(extra)),db)).status,200);assert.equal(await localIdentity(request('login',undefined,cookie(extra)),db),null);
 const failed=await handleLocalAuth(request('recover',{...data,code:'0'.repeat(64)}),db);assert.equal(failed.status,401);
 const recovered=await handleLocalAuth(request('recover',{...data,password:'a replacement ocean password',code:originalCode}),db);assert.equal(recovered.status,200);assert.notEqual((await recovered.json() as any).recoveryCode,originalCode);
 assert.equal(await localIdentity(request('login',undefined,originalCookie),db),null);assert.equal((await handleLocalAuth(request('recover',{...data,code:originalCode}),db)).status,401);assert.equal((await handleLocalAuth(request('login',data),db)).status,401);assert.equal((await handleLocalAuth(request('login',{...data,password:'a replacement ocean password'}),db)).status,200);
});
test('a password account cannot claim platform data or administrator privileges by matching its email',async()=>{
 const{db}=database();const result=await handleLocalAuth(request('register',data),db);const platform={userId:'platform-owner',email:data.email,fullName:'Owner'};const identity=await resolveIdentity(request('login',undefined,cookie(result)),db,platform);assert.notEqual(identity?.userId,platform.userId);
 const response=await handleApi(new Request('https://local.test/api/me'),db,identity,{adminEmail:data.email});assert.equal((await response.json() as any).admin,false);assert.equal(await resolveIdentity(request('login'),db,platform),platform);
 const admin=await handleApi(new Request('https://local.test/api/admin/submissions'),db,identity,{adminEmail:data.email});assert.equal(admin.status,403);
});
test('authentication limits are persisted and apply before expensive password checks',async()=>{
 const{db,sqlite}=database();const id=`auth:login:${await tokenHash(data.email)}:${Math.floor(Date.now()/900000)}`;sqlite.prepare('INSERT INTO rate_limits (id,count,until) VALUES (?,?,?)').run(id,12,Date.now()+900000);assert.equal((await handleLocalAuth(request('login',data),db)).status,429);
});

test('a password reset racing with login cannot issue a session for the old password',async()=>{
 const{db,sqlite}=database();await handleLocalAuth(request('register',data),db);const count=(sqlite.prepare('SELECT COUNT(*) n FROM local_sessions').get() as any).n;
 const racing={...db,prepare(sql:string){if(sql.startsWith('INSERT INTO local_sessions'))sqlite.prepare("UPDATE local_accounts SET password_hash='changed-by-reset' WHERE email=?").run(data.email);return db.prepare(sql);}};
 assert.equal((await handleLocalAuth(request('login',data),racing)).status,401);assert.equal((sqlite.prepare('SELECT COUNT(*) n FROM local_sessions').get() as any).n,count);
});
