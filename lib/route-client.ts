import type {Position} from './map-browser.ts';
export type TravelMode='drive'|'walk';
export type DeviceLocation=Position&{accuracy:number;timestamp:number};
export type RouteSummary={meters:number;seconds:number;checked:number;startSnap:number;endSnap:number};
export const routingProvider='https://routing.openstreetmap.de';
export function validPosition(p:Position){return Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
export function getDeviceLocation(geo:Pick<Geolocation,'getCurrentPosition'>|undefined):Promise<DeviceLocation>{
 return new Promise((resolve,reject)=>{
  if(!geo){reject(new Error('Location is unavailable in this browser. Choose a neighborhood or enter your starting point in Google Maps.'));return;}
  geo.getCurrentPosition(p=>{const value={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp};if(!validPosition(value)||!Number.isFinite(value.accuracy)||!Number.isFinite(value.timestamp)){reject(new Error('The browser did not return a usable location. Please try again.'));return;}resolve(value);},e=>reject(new Error(e.code===1?'Location permission was denied. You can allow it in your browser’s site settings, or continue with a neighborhood center.':e.code===3?'Finding your location timed out. Try again outdoors or choose a neighborhood.':'Your location could not be found. Choose a neighborhood or try again.')),{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 });
}
export function routeKey(start:Position,end:Position,mode:TravelMode){return `${mode}:${start.lat.toFixed(6)},${start.lng.toFixed(6)}:${end.lat.toFixed(6)},${end.lng.toFixed(6)}`;}
export function routingUrl(start:Position,end:Position,mode:TravelMode){
 if(!validPosition(start)||!validPosition(end))throw new Error('A valid starting point and destination are required.');
 const profile=mode==='walk'?'foot':'driving',service=mode==='walk'?'routed-foot':'routed-car';
 return `${routingProvider}/${service}/route/v1/${profile}/${start.lng.toFixed(6)},${start.lat.toFixed(6)};${end.lng.toFixed(6)},${end.lat.toFixed(6)}?overview=false&alternatives=false&steps=false&radiuses=500;250`;
}
export function parseRoute(data:any,checked=Date.now()):RouteSummary{
 if(data?.code!=='Ok'||!Array.isArray(data.routes)||!data.routes.length)throw new Error('No route was found for these map pins. Try Google Maps for the venue entrance.');
 const r=data.routes[0],startSnap=data.waypoints?.[0]?.distance,endSnap=data.waypoints?.[1]?.distance;
 if(!Number.isFinite(r.distance)||!Number.isFinite(r.duration)||r.distance<0||r.duration<0||!Number.isFinite(startSnap)||!Number.isFinite(endSnap)||startSnap>500||endSnap>250)throw new Error('The routing service could not match these pins closely enough to a road or path. Try Google Maps.');
 return {meters:r.distance,seconds:r.duration,checked,startSnap,endSnap};
}
let lastRequest=0,busy=false;
export async function fetchRoute(start:Position,end:Position,mode:TravelMode,signal:AbortSignal,fetcher:typeof fetch=fetch){
 const url=routingUrl(start,end,mode);
 if(busy||Date.now()-lastRequest<1100)throw new Error('Please wait a moment between route requests.');
 busy=true;lastRequest=Date.now();const controller=new AbortController(),cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)controller.abort();const timeout=setTimeout(cancel,12000);
 try{const response=await fetcher(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin',redirect:'error',headers:{Accept:'application/json'}});if(!response.ok)throw new Error('The free routing service is unavailable. Open Google Maps for directions and ETA.');return parseRoute(await response.json());}
 catch(e){if(controller.signal.aborted)throw new Error('The route request was stopped or timed out. Try again or open Google Maps.');throw e;}
 finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);busy=false;}
}
export const routeDistance=(r:RouteSummary)=>`${(r.meters/1609.344).toFixed(1)} mi`;
export const routeDuration=(r:RouteSummary)=>{const minutes=Math.max(1,Math.ceil(r.seconds/60));return minutes>=60?`${Math.floor(minutes/60)} hr${minutes%60?` ${minutes%60} min`:''}`:`${minutes} min`;};
