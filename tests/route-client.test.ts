import test from 'node:test';
import assert from 'node:assert/strict';
import {getDeviceLocation,routingUrl,parseRoute,routeKey,routeDuration,routeDistance,fetchRoute} from '../lib/route-client.ts';
const start={lat:33.787,lng:-118.402},end={lat:33.8003,lng:-118.3891};
test('location lookup requests a fresh permission-gated position and preserves accuracy',async()=>{
 let called=0,options:PositionOptions|undefined;
 const location=await getDeviceLocation({getCurrentPosition(success,_failure,o){called++;options=o;success({coords:{latitude:start.lat,longitude:start.lng,accuracy:15},timestamp:Date.now()} as GeolocationPosition);}});
 assert.equal(called,1);assert.equal(location.lat,start.lat);assert.equal(location.accuracy,15);assert.equal(options?.enableHighAccuracy,true);assert.equal(options?.maximumAge,0);assert.equal(options?.timeout,15000);
});
test('location denial, timeout, unsupported browsers, and invalid positions fail with useful fallback messages',async()=>{
 await assert.rejects(getDeviceLocation(undefined),/Choose a neighborhood/);
 for(const [code,message] of [[1,/permission was denied/],[3,/timed out/]] as const)await assert.rejects(getDeviceLocation({getCurrentPosition(_success,failure){failure?.({code} as GeolocationPositionError);}}),message);
 await assert.rejects(getDeviceLocation({getCurrentPosition(success){success({coords:{latitude:NaN,longitude:0,accuracy:10},timestamp:Date.now()} as GeolocationPosition);}}),/usable location/);
});
test('route URLs use separate road and footpath profiles and longitude-first coordinates',()=>{
 const driving=new URL(routingUrl(start,end,'drive')),walking=new URL(routingUrl(start,end,'walk'));
 assert.equal(driving.host,'routing.openstreetmap.de');assert.match(driving.pathname,/routed-car\/route\/v1\/driving\/-118.402000,33.787000;-118.389100,33.800300/);assert.match(walking.pathname,/routed-foot\/route\/v1\/foot/);
 assert.equal(driving.searchParams.get('overview'),'false');assert.equal(driving.searchParams.get('radiuses'),'500;250');
 assert.throws(()=>routingUrl({lat:100,lng:0},end,'drive'),/valid starting point/);assert.notEqual(routeKey(start,end,'drive'),routeKey(start,end,'walk'));
});
test('route responses require real finite distance/time and nearby snapped endpoints',()=>{
 const data={code:'Ok',routes:[{distance:6055.6,duration:456.2}],waypoints:[{distance:79.9},{distance:3.5}]};
 const route=parseRoute(data,123);assert.equal(route.meters,6055.6);assert.equal(route.seconds,456.2);assert.equal(route.checked,123);assert.equal(routeDistance(route),'3.8 mi');assert.equal(routeDuration(route),'8 min');
 assert.throws(()=>parseRoute({code:'NoRoute'}),/No route/);assert.throws(()=>parseRoute({...data,routes:[{distance:-1,duration:100}]}),/match/);assert.throws(()=>parseRoute({...data,waypoints:[{distance:10},{distance:999}]}),/match/);assert.throws(()=>parseRoute({...data,routes:[{distance:50,duration:NaN}]}),/match/);
});
test('route requests omit credentials, reject redirects, and enforce the public-service request limit',async()=>{
 let count=0;
 const fake:typeof fetch=async(_url,options)=>{count++;assert.equal(options?.credentials,'omit');assert.equal(options?.redirect,'error');assert.ok(options?.signal);return Response.json({code:'Ok',routes:[{distance:500,duration:100}],waypoints:[{distance:1},{distance:1}]});};
 const controller=new AbortController(),result=await fetchRoute(start,end,'drive',controller.signal,fake);assert.equal(result.meters,500);assert.equal(count,1);
 await assert.rejects(fetchRoute(start,end,'walk',controller.signal,fake),/wait a moment/);assert.equal(count,1);
});
