import type {Conditions} from '../../../lib/types';
export const dynamic='force-dynamic';
let cache:{until:number;data:Conditions}|null=null;
export async function GET(){
  if(cache&&cache.until>Date.now())return Response.json(cache.data,{headers:{'Cache-Control':'public,max-age=300'}});
  const data:Conditions={updated:new Date().toISOString(),weather:null,alerts:null,errors:[]};
  await Promise.allSettled([
    (async()=>{try{const response=await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.787&longitude=-118.402&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunset&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=5',{signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error();const v=await response.json() as any;if(!v.current||!v.daily||!Number.isFinite(v.current.temperature_2m))throw new Error();data.weather={temperature:v.current.temperature_2m,apparent:v.current.apparent_temperature,code:v.current.weather_code,wind:v.current.wind_speed_10m,high:v.daily.temperature_2m_max[0],low:v.daily.temperature_2m_min[0],rain:v.daily.precipitation_probability_max[0],sunset:v.daily.sunset[0],days:v.daily.time.map((date:string,i:number)=>({date,high:v.daily.temperature_2m_max[i],low:v.daily.temperature_2m_min[i],code:v.daily.weather_code[i],rain:v.daily.precipitation_probability_max[i]}))};}catch{data.errors.push('Weather is temporarily unavailable.');}})(),
    (async()=>{try{const response=await fetch('https://api.weather.gov/alerts/active?point=33.787,-118.402',{headers:{'User-Agent':'PeninsulaNeighbor/2.0 (community project)','Accept':'application/geo+json'},signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error();const value=await response.json() as any;if(!Array.isArray(value.features))throw new Error();data.alerts=value.features.slice(0,12).map((f:any)=>({title:String(f.properties.headline||f.properties.event),severity:String(f.properties.severity),description:String(f.properties.description||''),url:`https://alerts.weather.gov/search?area=CA`,ends:String(f.properties.ends||f.properties.expires||'')}));}catch{data.errors.push('NWS alert status is unavailable. Check official sources.');}})()
  ]);
  cache={until:Date.now()+(data.weather&&data.alerts?600000:60000),data};
  return Response.json(data,{headers:{'Cache-Control':'public,max-age=60'}});
}
