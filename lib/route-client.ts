import type {Position} from './map-browser.ts';
export type TravelMode='drive'|'walk'|'wheelchair';
export type DeviceLocation=Position&{accuracy:number;timestamp:number};
export type RouteSummary={meters:number;seconds:number;checked:number;startSnap:number;endSnap:number;geometry?:Position[];steps?:{instruction:string;meters:number}[];provider?:string;wheelchair?:boolean;requestKey?:string};
export const routingProvider='https://routing.openstreetmap.de';
export function validPosition(p:Position){return Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;}
export function getDeviceLocation(geo:Pick<Geolocation,'getCurrentPosition'>|undefined):Promise<DeviceLocation>{
 return new Promise((resolve,reject)=>{
  if(!geo){reject(new Error('Location is unavailable in this browser. Choose a neighborhood or enter your starting point in Google Maps.'));return;}
  geo.getCurrentPosition(p=>{const value={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp};if(!validPosition(value)||!Number.isFinite(value.accuracy)||!Number.isFinite(value.timestamp)){reject(new Error('The browser did not return a usable location. Please try again.'));return;}resolve(value);},e=>reject(new Error(e.code===1?'Location permission was denied. You can allow it in your browser’s site settings, or continue with a neighborhood center.':e.code===3?'Finding your location timed out. Try again outdoors or choose a neighborhood.':'Your location could not be found. Choose a neighborhood or try again.')),{enableHighAccuracy:true,maximumAge:0,timeout:15000});
 });
}
export function routeKey(start:Position,end:Position,mode:TravelMode,via?:Position){return `${via?`via:${via.lat},${via.lng}:`:''}${mode}:${start.lat.toFixed(6)},${start.lng.toFixed(6)}:${end.lat.toFixed(6)},${end.lng.toFixed(6)}`;}
export function routingUrl(start:Position,end:Position,mode:TravelMode){
 if(!validPosition(start)||!validPosition(end))throw new Error('A valid starting point and destination are required.');
 if(mode==='wheelchair')throw new Error('Use the wheelchair-aware routing service.');
 const profile=mode==='walk'?'foot':'driving',service=mode==='walk'?'routed-foot':'routed-car';
 return `${routingProvider}/${service}/route/v1/${profile}/${start.lng.toFixed(6)},${start.lat.toFixed(6)};${end.lng.toFixed(6)},${end.lat.toFixed(6)}?overview=full&geometries=geojson&alternatives=false&steps=true&radiuses=500;250`;
}
export function parseRoute(data:any,checked=Date.now()):RouteSummary{
 if(data?.code!=='Ok'||!Array.isArray(data.routes)||!data.routes.length)throw new Error('No route was found for these map pins. Try Google Maps for the venue entrance.');
 const r=data.routes[0],startSnap=data.waypoints?.[0]?.distance,endSnap=data.waypoints?.[1]?.distance;
 if(!Number.isFinite(r.distance)||!Number.isFinite(r.duration)||r.distance<0||r.duration<0||!Number.isFinite(startSnap)||!Number.isFinite(endSnap)||startSnap>500||endSnap>250)throw new Error('The routing service could not match these pins closely enough to a road or path. Try Google Maps.');
 const geometry=Array.isArray(r.geometry?.coordinates)?r.geometry.coordinates.filter((p:any)=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])).map((p:number[])=>({lng:p[0],lat:p[1]})):undefined;
 const steps=Array.isArray(r.legs)?r.legs.flatMap((leg:any)=>(leg.steps||[]).map((s:any)=>({instruction:String(s.maneuver?.instruction||`${s.maneuver?.type||'Continue'}${s.maneuver?.modifier?' '+s.maneuver.modifier:''}${s.name?' on '+s.name:''}`).replace(/_/g,' '),meters:Number.isFinite(s.distance)?s.distance:0}))):undefined;
 return {meters:r.distance,seconds:r.duration,checked,startSnap,endSnap,geometry,steps,provider:'FOSSGIS / OSRM'};
}
let lastRequest=0,busy=false;
export async function fetchRoute(start:Position,end:Position,mode:TravelMode,signal:AbortSignal,fetcher:typeof fetch=fetch,via?:Position){
 const url=mode==='wheelchair'?'https://valhalla1.openstreetmap.de/route':routingUrl(start,end,mode);
 if(busy||Date.now()-lastRequest<1100)throw new Error('Please wait a moment between route requests.');
 busy=true;lastRequest=Date.now();const controller=new AbortController(),cancel=()=>controller.abort();signal.addEventListener('abort',cancel,{once:true});if(signal.aborted)controller.abort();const timeout=setTimeout(cancel,12000);
 try{const response=await fetcher(url,{...(mode==='wheelchair'?{method:'POST',body:JSON.stringify(wheelchairRequest(start,end,via))}:{}),signal:controller.signal,credentials:'omit',referrerPolicy:'strict-origin-when-cross-origin',redirect:'error',headers:mode==='wheelchair'?{Accept:'application/json','Content-Type':'application/json','X-Client-Id':'peninsula-neighbor.hunteryau.chatgpt.site'}:{Accept:'application/json'}});if(!response.ok)throw new Error('The free routing service is unavailable. Open Google Maps for directions and ETA.');return mode==='wheelchair'?parseWheelchairRoute(await response.json(),start,end,via):parseRoute(await response.json());}
 catch(e){if(controller.signal.aborted)throw new Error('The route request was stopped or timed out. Try again or open Google Maps.');throw e;}
 finally{clearTimeout(timeout);signal.removeEventListener('abort',cancel);busy=false;}
}
export const routeDistance=(r:RouteSummary)=>`${(r.meters/1609.344).toFixed(1)} mi`;
export const routeDuration=(r:RouteSummary)=>{const minutes=Math.max(1,Math.ceil(r.seconds/60));return minutes>=60?`${Math.floor(minutes/60)} hr${minutes%60?` ${minutes%60} min`:''}`:`${minutes} min`;};

export function wheelchairRequest(start:Position,end:Position,via?:Position){
 if(!validPosition(start)||!validPosition(end)||via&&!validPosition(via))throw new Error('Valid route points are required.');
 return {locations:[start,...(via?[via]:[]),end].map(p=>({lat:p.lat,lon:p.lng,search_filter:{exclude_steps:true}})),costing:'pedestrian',costing_options:{pedestrian:{type:'wheelchair',step_penalty:43200}},format:'osrm',shape_format:'geojson',units:'kilometers',language:'en-US'};
}
export function parseWheelchairRoute(data:any,start:Position,end:Position,via?:Position):RouteSummary{
 const r=data?.routes?.[0];if(data?.code!=='Ok'||!r||!Array.isArray(r.geometry?.coordinates)||r.geometry.coordinates.length<2)throw new Error('No wheelchair-aware route was found. Confirm access with the destination.');
 const coords=r.geometry.coordinates;if(coords.length>100000||!coords.every((c:any)=>Array.isArray(c)&&validPosition({lng:c[0],lat:c[1]})))throw new Error('Invalid wheelchair route geometry.');
 const meters=(a:Position,b:Position)=>{const x=(a.lat-b.lat)*111320,y=(a.lng-b.lng)*111320*Math.cos(a.lat*Math.PI/180);return Math.hypot(x,y);};
 const adjusted={...data,waypoints:[{distance:meters(start,{lat:coords[0][1],lng:coords[0][0]})},{distance:meters(end,{lat:coords.at(-1)[1],lng:coords.at(-1)[0]})}]};
 const route=parseRoute(adjusted);
 if(via&&route.geometry&&!routeNearPoint(route.geometry,via,25))throw new Error('The routing service could not connect closely enough to the selected ramp. Choose a different ramp and confirm the entrance.');
 if(route.steps?.some(s=>/\b(stairs|steps|stairway)\b/i.test(s.instruction)))throw new Error('The returned route includes stairs. It has been withheld; choose a different ramp or destination and confirm access.');
 return {...route,provider:'Valhalla / OpenStreetMap',wheelchair:true};
}

export function routeNearPoint(route:Position[],point:Position,tolerance=20){
 const project=(p:Position)=>({x:(p.lng-point.lng)*111320*Math.cos(point.lat*Math.PI/180),y:(p.lat-point.lat)*111320});
 for(let i=1;i<route.length;i++){const a=project(route[i-1]),b=project(route[i]),dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,-(a.x*dx+a.y*dy)/l)):0;if(Math.hypot(a.x+t*dx,a.y+t*dy)<=tolerance)return true;}
 return false;
}
