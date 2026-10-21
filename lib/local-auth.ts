import {scrypt,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import type {Database,Identity} from './api.ts';

const email=z.string().trim().toLowerCase().email().max(254);
const password=z.string().min(15,'Use at least 15 characters. A few unrelated words work well.').max(128);
const credentials=z.object({email,password:z.string().min(1).max(128),remember:z.boolean().default(true)});
const registration=credentials.extend({name:z.string().trim().min(2).max(40),password});
const recovery=credentials.extend({code:z.string().regex(/^[a-fA-F0-9-]{32,80}$/),password});
const json=(data:unknown,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,'0')).join('');
export async function tokenHash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');}
// OWASP's 16 MiB scrypt configuration; native implementation runs in Workers and Node.
export async function passwordHash(value:string,salt=random()){
 const result=await new Promise<Buffer>((resolve,reject)=>scrypt(value,salt,32,{N:16384,r:8,p:5,maxmem:24*1024*1024},(e,key)=>e?reject(e):resolve(key)));
 return `scrypt-16384-8-5$${salt}$${result.toString('hex')}`;
}
export async function passwordMatches(value:string,encoded:string){const [algorithm,salt,expected]=encoded.split('$');if(algorithm!=='scrypt-16384-8-5'||!salt||!/^[a-f0-9]{64}$/.test(expected||''))return false;const actual=(await passwordHash(value,salt)).split('$')[2];return timingSafeEqual(Buffer.from(actual,'hex'),Buffer.from(expected,'hex'));}
function cookieName(req:Request){return new URL(req.url).protocol==='https:'?'__Host-pn-session':'pn-local-session';}
function sessionCookie(req:Request,token='',remember=true){return `${cookieName(req)}=${token}; Path=/; HttpOnly; SameSite=Lax${new URL(req.url).protocol==='https:'?'; Secure':''}${!token?'; Max-Age=0':remember?'; Max-Age=2592000':''}`;}
function readToken(req:Request){const values=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName(req)+'='));return values.length===1&&/^[a-f0-9]{64}$/.test(values[0].split('=')[1])?values[0].split('=')[1]:null;}
export async function localIdentity(req:Request,db:Database):Promise<Identity|null>{const token=readToken(req);if(!token)return null;const row=await db.prepare('SELECT a.user,a.email,p.name FROM local_sessions s JOIN local_accounts a ON a.user=s.user JOIN profiles p ON p.id=a.user WHERE s.hash=? AND s.expires>?').bind(await tokenHash(token),Date.now()).first();return row?{userId:row.user,email:row.email,fullName:row.name,provider:'local'}:null;}
export async function resolveIdentity(req:Request,db:Database,platform:Identity|null){return await localIdentity(req,db)||platform;}
async function throttle(db:Database,key:string,max:number,seconds:number){const window=Math.floor(Date.now()/(seconds*1000)),id=`auth:${key}:${window}`;const row=await db.prepare('INSERT INTO rate_limits (id,count,until) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,(window+1)*seconds*1000).first();return Number(row.count)<=max;}
async function revoke(req:Request,db:Database){const token=readToken(req);if(token)await db.prepare('DELETE FROM local_sessions WHERE hash=?').bind(await tokenHash(token)).run();}
export async function handleLocalAuth(req:Request,db:Database):Promise<Response>{
 const action=/^\/api\/auth\/(register|login|logout|recover)$/.exec(new URL(req.url).pathname)?.[1];
 if(!['register','login','logout','recover'].includes(action||''))return json({error:'Not found.'},404);
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 if(req.headers.get('origin')!==new URL(req.url).origin||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'Start this action on Peninsula Neighbor.'},403);
 try{
  if(action==='logout'){await revoke(req,db);return json({ok:true},200,sessionCookie(req));}
  if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'Send JSON data.'},415);
  const text=await req.text();if(text.length>4096)return json({error:'This request is too large.'},413);
  let input;try{input=JSON.parse(text);}catch{return json({error:'Invalid form data.'},400);}
  const parsed=(action==='register'?registration:action==='recover'?recovery:credentials).safeParse(input);
  if(!parsed.success)return json({error:parsed.error.issues.map(i=>i.message).join(' ')},400);
  const data=parsed.data,ip=await tokenHash(req.headers.get('cf-connecting-ip')||'unavailable');
  if(!await throttle(db,`ip:${ip}`,60,900)||!await throttle(db,`${action}:${await tokenHash(data.email)}`,action==='register'?5:12,900)||action==='register'&&!await throttle(db,`signup:${ip}`,8,3600))return json({error:'Too many attempts. Please wait 15 minutes before trying again.'},429);
  await db.prepare('DELETE FROM local_sessions WHERE expires<=?').bind(Date.now()).run();
  await db.prepare('DELETE FROM rate_limits WHERE until<?').bind(Date.now()-86400000).run();
  const account=await db.prepare('SELECT user,password_hash,recovery_hash FROM local_accounts WHERE email=?').bind(data.email).first();
  let uid=account?.user,recoveryCode:string|undefined,verifiedHash=account?.password_hash;
  if(action==='register'){
   // Hash even duplicate requests. Email ownership never grants platform/admin access.
   const hash=await passwordHash(data.password);verifiedHash=hash;
   if(account)return json({error:'Unable to create this account. Try signing in or use your recovery code.'},400);
   uid='local:'+crypto.randomUUID();recoveryCode=random();const name=(data as z.infer<typeof registration>).name;
   try{await db.batch([db.prepare('INSERT INTO profiles (id,name,area,bio) VALUES (?,?,?,?)').bind(uid,name,'Palos Verdes Estates',''),db.prepare('INSERT INTO local_accounts (user,email,password_hash,recovery_hash,created) VALUES (?,?,?,?,?)').bind(uid,data.email,hash,await tokenHash(recoveryCode),new Date().toISOString())]);}catch(e){if(/UNIQUE/i.test(String(e)))return json({error:'Unable to create this account. Try signing in or use your recovery code.'},400);throw e;}
  }else if(action==='recover'){
   const code=(data as z.infer<typeof recovery>).code.replace(/-/g,'').toLowerCase();
   if(!account||!timingSafeEqual(Buffer.from(await tokenHash(code),'hex'),Buffer.from(account.recovery_hash,'hex')))return json({error:'Email or recovery code is incorrect.'},401);
   recoveryCode=random();const nextHash=await passwordHash(data.password);
   // Conditional update consumes the recovery code once, including concurrent requests.
   const nextRecoveryHash=await tokenHash(recoveryCode);verifiedHash=nextHash;
   await db.batch([
    db.prepare('UPDATE local_accounts SET password_hash=?,recovery_hash=? WHERE user=? AND recovery_hash=?').bind(nextHash,nextRecoveryHash,uid,account.recovery_hash),
    db.prepare('DELETE FROM local_sessions WHERE user=? AND EXISTS (SELECT 1 FROM local_accounts WHERE user=? AND recovery_hash=?)').bind(uid,uid,nextRecoveryHash)
   ]);
   if(!await db.prepare('SELECT user FROM local_accounts WHERE user=? AND recovery_hash=?').bind(uid,nextRecoveryHash).first())return json({error:'Email or recovery code is incorrect.'},401);
  }else{
   // A missing account still performs the same expensive password operation.
   const valid=account?await passwordMatches(data.password,account.password_hash):await passwordHash(data.password).then(()=>false);
   if(!valid)return json({error:'Email or password is incorrect.'},401);
  }
  await revoke(req,db);
  const token=random(),expires=Date.now()+(data.remember?30:1)*86400000;
  const inserted=await db.prepare('INSERT INTO local_sessions (hash,user,expires,created) SELECT ?,user,?,? FROM local_accounts WHERE user=? AND password_hash=? RETURNING hash').bind(await tokenHash(token),expires,Date.now(),uid,verifiedHash).first();
  if(!inserted)return json({error:'Your password changed during sign-in. Please sign in again.'},401);
  return json({ok:true,...recoveryCode?{recoveryCode}:{}},200,sessionCookie(req,token,data.remember));
 }catch{ return json({error:'Account service is temporarily unavailable. Please try again.'},503); }
}
