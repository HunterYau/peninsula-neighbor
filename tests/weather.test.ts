import test from 'node:test';
import assert from 'node:assert/strict';
import {createConditionsService,parseNws,parseOpenMeteo} from '../lib/weather.ts';
const now=Date.parse('2026-10-18T20:30:00Z');
const period=(start='2026-10-18T13:00:00-07:00',day=true,temp=80)=>({startTime:start,endTime:'2026-10-18T21:00:00Z',temperature:temp,temperatureUnit:'F',isDaytime:day,windSpeed:'5 to 10 mph',shortForecast:day?'Sunny':'Mostly Clear',probabilityOfPrecipitation:{value:null}});
const hourly={properties:{periods:[period()]}};
const daily={properties:{periods:[period(),period('2026-10-18T18:00:00-07:00',false,61),period('2026-10-19T06:00:00-07:00',true,75)]}};
const meteo=()=>({current:{time:now/1000,temperature_2m:82,apparent_temperature:null,weather_code:0,wind_speed_10m:7},current_units:{temperature_2m:'°F',wind_speed_10m:'mp/h'},daily:{time:[Date.parse('2026-10-18T07:00:00Z')/1000],temperature_2m_max:[85],temperature_2m_min:[61],precipitation_probability_max:[null],weather_code:[0]}});
function mockProvider(state:{primary:boolean;nws:boolean;alerts:boolean},calls:string[]):typeof fetch{return async input=>{
 const url=String(input);calls.push(url);
 if(url.includes('open-meteo'))return state.primary?Response.json(meteo()):new Response('',{status:429});
 if(url.includes('/alerts/'))return state.alerts?Response.json({features:[]}):new Response('',{status:503});
 if(!state.nws)throw new Error('Service unavailable');
 if(url.includes('/points/'))return Response.json({properties:{forecast:'https://api.weather.gov/gridpoints/LOX/147,34/forecast',forecastHourly:'https://api.weather.gov/gridpoints/LOX/147,34/forecast/hourly'}});
 return Response.json(url.endsWith('/hourly')?hourly:daily);
};}
test('Open-Meteo uses provider times and preserves unknown values without coercing them to zero',()=>{
 const result=parseOpenMeteo(meteo(),now);assert.equal(result.temperature,82);assert.equal(result.rain,null);assert.equal(result.apparent,null);assert.equal(result.days[0].date,'2026-10-18');assert.equal(result.validAt,new Date(now).toISOString());
 assert.throws(()=>parseOpenMeteo({...meteo(),current:{...meteo().current,time:now/1000-7200}},now),/outdated/);
 assert.throws(()=>parseOpenMeteo({...meteo(),current:{...meteo().current,temperature_2m:null}},now),/Invalid/);
 assert.throws(()=>parseOpenMeteo({...meteo(),current_units:{temperature_2m:'°C'}},now),/units/);
});
test('NWS uses the current hourly forecast and groups high/low by Pacific date',()=>{
 const result=parseNws(hourly,daily,now);assert.equal(result.source,'National Weather Service');assert.equal(result.high,80);assert.equal(result.low,61);assert.equal(result.days[1].high,75);assert.equal(result.days[1].low,null);assert.equal(result.wind,10);assert.equal(result.rain,null);assert.equal(result.description,'Sunny');
 const night=period('2026-10-18T18:00:00-07:00',false,61);night.endTime='2026-10-19T02:00:00Z';
 const atNight=Date.parse('2026-10-19T01:30:00Z');const weather=parseNws({properties:{periods:[night]}},{properties:{periods:[night]}},atNight);assert.equal(weather.days[0].date,'2026-10-18');assert.equal(weather.high,null);assert.equal(weather.low,61);
 assert.throws(()=>parseNws(hourly,daily,now+7200000),/current/);
});
test('provider outage falls back to NWS while alerts load independently; simultaneous requests share work',async()=>{
 const calls:string[]=[],service=createConditionsService(mockProvider({primary:false,nws:true,alerts:true},calls),()=>now);
 const [a,b]=await Promise.all([service(),service()]);assert.equal(a,b);assert.equal(a.weather?.source,'National Weather Service');assert.deepEqual(a.alerts,[]);assert.deepEqual(a.errors,[]);assert.equal(calls.length,5);
 await service();assert.equal(calls.length,5);
});
test('manual refresh bypasses a healthy cache after 30 seconds and preserves alerts failure as unknown',async()=>{
 let at=now;const calls:string[]=[],state={primary:true,nws:true,alerts:false};const service=createConditionsService(mockProvider(state,calls),()=>at);
 const first=await service();assert.equal(first.weather?.temperature,82);assert.equal(first.alerts,null);assert.equal(calls.length,2);
 await service(true);assert.equal(calls.length,2);at+=31000;state.alerts=true;await service(true);assert.equal(calls.length,4);
 at+=31000;await service();assert.equal(calls.length,4);await service(true);assert.equal(calls.length,6);
});
test('failed refresh marks last forecast stale, retries quickly, and expires old weather',async()=>{
 let at=now;const state={primary:true,nws:true,alerts:true},calls:string[]=[];const service=createConditionsService(mockProvider(state,calls),()=>at);
 await service();state.primary=false;state.nws=false;state.alerts=false;at+=31000;
 const stale=await service(true);assert.equal(stale.weather?.stale,true);assert.equal(stale.weather?.validAt,new Date(now).toISOString());assert.equal(stale.alerts,null);
 const count=calls.length;at+=31000;await service();assert.ok(calls.length>count);
 at=now+3600001;const expired=await service();assert.equal(expired.weather,null);assert.equal(expired.alerts,null);
});
