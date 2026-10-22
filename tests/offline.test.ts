import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
test('offline worker caches only its public fallback and leaves API/private content uncached',async()=>{
 const listeners=new Map<string,Function>(),stored:string[]=[],removed:string[]=[];let response:Promise<Response>|undefined,work:Promise<unknown>|undefined,offline=false;
 const fallback=new Response('Offline fallback');
 vm.runInNewContext(readFileSync(new URL('../public/sw.js',import.meta.url),'utf8'),{self:{addEventListener:(name:string,fn:Function)=>listeners.set(name,fn)},caches:{open:async()=>({addAll:async(paths:string[])=>stored.push(...paths)}),keys:async()=>['peninsula-offline-v1','peninsula-offline-v2','unrelated-cache'],delete:async(key:string)=>removed.push(key),match:async(path:string)=>path==='/offline.html'?fallback:undefined},fetch:async()=>{if(offline)throw Error('Offline');return new Response('Network page');}});
 listeners.get('install')!({waitUntil:(promise:Promise<unknown>)=>work=promise});await work;assert.deepEqual(stored,['/offline.html','/favicon.svg']);
 listeners.get('activate')!({waitUntil:(promise:Promise<unknown>)=>work=promise});await work;assert.deepEqual(removed,['peninsula-offline-v1']);
 const event=(mode:string,method='GET')=>({request:{mode,method},respondWith:(promise:Promise<Response>)=>response=promise});
 listeners.get('fetch')!(event('navigate'));assert.equal(await(await response!).text(),'Network page');
 offline=true;listeners.get('fetch')!(event('navigate'));assert.equal(await(await response!).text(),'Offline fallback');
 response=undefined;listeners.get('fetch')!(event('cors'));assert.equal(response,undefined);listeners.get('fetch')!(event('navigate','POST'));assert.equal(response,undefined);
});
