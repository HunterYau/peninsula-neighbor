import type {Conditions,Weather,WeatherDay} from './types.ts';
import {weatherLabel} from './tools.ts';

export const officialForecast='https://forecast.weather.gov/MapClick.php?lat=33.787&lon=-118.402';
const openMeteo='https://api.open-meteo.com/v1/forecast?latitude=33.787&longitude=-118.402&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FLos_Angeles&forecast_days=5&timeformat=unixtime';
const nwsHeaders={'User-Agent':'PeninsulaNeighbor/2.0 (https://peninsula-neighbor.hunteryau.chatgpt.site)','Accept':'application/geo+json'};
const number=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)?v:null;
const probability=(v:unknown)=>{const n=number(v);return n!==null&&n>=0&&n<=100?n:null;};
const pacificDate=(v:number|string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
const description=(code:unknown)=>number(code)!==null&&Number(code)>=0&&Number(code)<=99?weatherLabel(Number(code)):'Forecast details unavailable';
const fresh=(timestamp:number,now:number)=>Number.isFinite(timestamp)&&timestamp<=now+15*60000&&timestamp>=now-90*60000;

// Forecast temperatures, not measurements from a distant airport observation station.
export function parseOpenMeteo(v:any,now=Date.now()):Weather{
  const c=v?.current,d=v?.daily,temperature=number(c?.temperature_2m),timestamp=number(c?.time);
  if(temperature===null||timestamp===null||!fresh(timestamp*1000,now)||!Array.isArray(d?.time))throw new Error('Invalid or outdated Open-Meteo forecast');
  if(v.current_units?.temperature_2m!=='°F'||v.current_units?.wind_speed_10m!=='mp/h')throw new Error('Unexpected Open-Meteo units');
  const days:WeatherDay[]=d.time.flatMap((t:unknown,i:number)=>{
    if(number(t)===null)return [];
    const date=pacificDate(Number(t)*1000);
    if(date<pacificDate(now))return [];
    return [{date,high:number(d.temperature_2m_max?.[i]),low:number(d.temperature_2m_min?.[i]),description:description(d.weather_code?.[i]),rain:probability(d.precipitation_probability_max?.[i])}];
  }).slice(0,5);
  if(!days.length)throw new Error('Missing daily forecast');
  const today=days.find(d=>d.date===pacificDate(now));
  return {temperature,apparent:number(c.apparent_temperature),wind:number(c.wind_speed_10m),description:description(c.weather_code),high:today?.high??null,low:today?.low??null,rain:today?.rain??null,days,source:'Open-Meteo',sourceUrl:'https://open-meteo.com/',validAt:new Date(timestamp*1000).toISOString(),stale:false};
}

export function parseNws(hourly:any,daily:any,now=Date.now()):Weather{
  const periods=hourly?.properties?.periods;
  const current=Array.isArray(periods)?periods.find(p=>Date.parse(p.startTime)<=now&&Date.parse(p.endTime)>now):null;
  const temperature=number(current?.temperature);
  if(!current||temperature===null||current.temperatureUnit!=='F'||!fresh(Date.parse(current.startTime),now))throw new Error('No current NWS hourly forecast');
  const groups=new Map<string,WeatherDay>();
  if(!Array.isArray(daily?.properties?.periods))throw new Error('Missing NWS daily forecast');
  for(const p of daily.properties.periods){
    const timestamp=Date.parse(p.startTime);
    if(!Number.isFinite(timestamp)||p.temperatureUnit!=='F'||typeof p.isDaytime!=='boolean')continue;
    const date=pacificDate(timestamp);
    if(date<pacificDate(now))continue;
    const item=groups.get(date)||{date,high:null,low:null,description:'Forecast details unavailable',rain:null};
    if(p.isDaytime){item.high=number(p.temperature);item.description=String(p.shortForecast||item.description);}
    else{item.low=number(p.temperature);if(item.high===null)item.description=String(p.shortForecast||item.description);}
    const rain=probability(p.probabilityOfPrecipitation?.value);
    if(rain!==null)item.rain=Math.max(item.rain??0,rain);
    groups.set(date,item);
  }
  const days=[...groups.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  if(!days.length)throw new Error('No usable NWS daily forecast');
  const today=days.find(d=>d.date===pacificDate(now));
  // NWS can return ranges such as "5 to 10 mph"; display the upper end.
  const speeds=typeof current.windSpeed==='string'&&/mph$/.test(current.windSpeed)?current.windSpeed.match(/\d+(?:\.\d+)?/g)?.map(Number):null;
  return {temperature,apparent:null,wind:speeds?.length?Math.max(...speeds):null,high:today?.high??null,low:today?.low??null,rain:today?.rain??null,days,description:String(current.shortForecast||'Forecast details unavailable'),source:'National Weather Service',sourceUrl:officialForecast,validAt:current.startTime,stale:false};
}

export function createConditionsService(fetcher:typeof fetch=fetch,clock:()=>number=Date.now){
  let cache:{at:number;until:number;data:Conditions}|null=null;
  let lastWeather:Weather|null=null,inflight:Promise<Conditions>|null=null;
  let grid:{until:number;forecast:string;hourly:string}|null=null;
  async function json(url:string,nws=false):Promise<any>{
    const response=await fetcher(url,{headers:nws?nwsHeaders:undefined,signal:AbortSignal.timeout(6500),cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
  async function weather(){
    try{return parseOpenMeteo(await json(openMeteo),clock());}
    catch(error){console.warn('Weather: Open-Meteo failed',error instanceof Error?error.message:'Upstream failure');}
    if(!grid||grid.until<clock()){
      const point=await json('https://api.weather.gov/points/33.787,-118.402',true);
      const {forecast,forecastHourly}=point?.properties||{};
      if(typeof forecast!=='string'||typeof forecastHourly!=='string'||![forecast,forecastHourly].every(url=>/^https:\/\/api\.weather\.gov\/gridpoints\//.test(url)))throw new Error('Invalid NWS grid');
      grid={forecast,hourly:forecastHourly,until:clock()+86400000};
    }
    const [hourly,daily]=await Promise.all([json(grid.hourly,true),json(grid.forecast,true)]);
    return parseNws(hourly,daily,clock());
  }
  async function load():Promise<Conditions>{
    const data:Conditions={updated:new Date(clock()).toISOString(),weather:null,alerts:null,errors:[]};
    await Promise.all([
      (async()=>{try{data.weather=await weather();lastWeather=data.weather;}catch(error){
        console.warn('Weather: fallback failed',error instanceof Error?error.message:'Upstream failure');
        if(lastWeather&&clock()-Date.parse(lastWeather.validAt)<=60*60000)data.weather={...lastWeather,stale:true};
        data.errors.push('Weather could not be refreshed.');
      }})(),
      (async()=>{try{
        const v=await json('https://api.weather.gov/alerts/active?point=33.787,-118.402',true);
        if(!Array.isArray(v?.features))throw new Error('Invalid alert response');
        data.alerts=v.features.slice(0,12).map((f:any)=>({title:String(f.properties?.headline||f.properties?.event||'NWS alert'),severity:String(f.properties?.severity||'Unknown'),description:String(f.properties?.description||''),url:officialForecast,ends:String(f.properties?.ends||f.properties?.expires||'')}));
      }catch{data.errors.push('NWS alert status is unavailable. Check official sources.');}})()
    ]);
    const now=clock();
    cache={at:now,until:now+(data.weather&&!data.weather.stale&&data.alerts!==null?300000:30000),data};
    return data;
  }
  return async(force=false)=>{
    const now=clock();
    if(inflight)return inflight;
    if(cache&&cache.until>now&&(!force||now-cache.at<30000))return cache.data;
    inflight=load();
    try{return await inflight;}finally{inflight=null;}
  };
}
