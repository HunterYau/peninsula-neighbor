import {z} from 'zod';
import {photoSchema,type Photo} from './photos.ts';
import {areas} from './validation.ts';
import {listingInterests,personalizationFields,personalizationMatch} from './personalization.ts';
export const interests=listingInterests;
const text=(n:number,m:number)=>z.string().trim().min(n).max(m);
export const httpsUrl=z.string().trim().max(1000).refine(s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'Use a public http or https link.');
const optionalUrl=z.union([z.literal(''),httpsUrl]).default('');
export const memberSchema=z.object({age:z.number().int().min(0).max(120).nullable().default(null),area:z.enum(areas).default('Palos Verdes Estates'),...personalizationFields,days:z.array(z.number().int().min(0).max(6)).max(7).default([]),from:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('09:00'),until:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('18:00'),rewards:z.boolean().default(false)}).refine(v=>v.until>v.from,'Availability end must be later than start.');
export type MemberSettings=z.infer<typeof memberSchema>;
export const listingKinds=['event','volunteer','business','resource','organization'] as const;
export const listingSchema=z.object({photo:photoSchema.nullable().optional(),kind:z.enum(listingKinds),title:text(4,120),body:text(10,2500),area:z.enum(areas),category:z.enum(interests),location:text(4,200),organization:z.string().max(160).default(''),url:optionalUrl,contact:z.string().trim().max(200).default(''),eligibility:z.string().trim().max(400).default('Requirements not specified; contact organizer.'),minimumAge:z.number().int().min(0).max(120).nullable().default(null),maximumAge:z.number().int().min(0).max(120).nullable().default(null),starts:z.string().datetime().nullable().default(null),ends:z.string().datetime().nullable().default(null),deadline:z.string().datetime().nullable().default(null),lat:z.number().min(33.5).max(34).nullable().default(null),lng:z.number().min(-118.7).max(-118.15).nullable().default(null)}).superRefine((v,c)=>{if((v.lat===null)!==(v.lng===null))c.addIssue({code:'custom',message:'Provide both map coordinates or neither.'});if(v.minimumAge!==null&&v.maximumAge!==null&&v.maximumAge<v.minimumAge)c.addIssue({code:'custom',message:'Maximum age must be at least minimum age.'});if(v.kind==='event'&&(!v.starts||!v.ends))c.addIssue({code:'custom',message:'Events need start and end times.'});if((v.starts===null)!==(v.ends===null)||v.starts&&v.ends&&v.ends<=v.starts)c.addIssue({code:'custom',message:'Provide a valid start/end interval.'});if(v.deadline&&v.starts&&v.deadline>v.starts)c.addIssue({code:'custom',message:'Registration deadline must not follow the start.'});});
export type SubmissionData=z.infer<typeof listingSchema>;
export const decisionSchema=z.object({status:z.enum(['approved','rejected']),note:text(5,500)});
export const claimSchema=z.object({organization:text(1,160),evidence:text(10,1000)});
export const verificationSchema=z.object({organization:text(1,160),request:z.boolean().default(true)});
export const hourDecisionSchema=z.object({status:z.enum(['verified','declined']),note:text(5,500)});
export type Listing={id:string;kind:string;title:string;body:string;area:string;category:string;location:string;organization:string;url:string;contact:string;minimumAge:number|null;maximumAge:number|null;eligibility:string;starts:string|null;ends:string|null;deadline:string|null;lat:number|null;lng:number|null;approximate:boolean;verification:string;verified:string|null;status:string;reasons?:string[];distance?:number|null;photo?:Photo|null};
export type Organization={id:string;name:string;body:string;area:string;location:string;url:string;contact:string;verification:string;verified:string|null};
export const areaCenters:Record<string,{lat:number;lng:number}>={'Palos Verdes Estates':{lat:33.787,lng:-118.402},'Rancho Palos Verdes':{lat:33.755,lng:-118.37},'Rolling Hills Estates':{lat:33.774,lng:-118.365},'Rolling Hills':{lat:33.758,lng:-118.357},'Nearby South Bay':{lat:33.815,lng:-118.35}};
export function distanceMiles(a:{lat:number;lng:number},b:{lat:number;lng:number}){const rad=(n:number)=>n*Math.PI/180,dlat=rad(b.lat-a.lat),dlng=rad(b.lng-a.lng);return 3958.8*2*Math.asin(Math.min(1,Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlng/2)**2)));}
export function ageFits(item:Listing,age:number|null){return age===null||item.minimumAge===null&&item.maximumAge===null?null:(item.minimumAge===null||age>=item.minimumAge)&&(item.maximumAge===null||age<=item.maximumAge);}
const pacific=(value:string)=>{const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Los_Angeles',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));return {date:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value)),day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(p.find(v=>v.type==='weekday')!.value),clock:`${p.find(v=>v.type==='hour')!.value}:${p.find(v=>v.type==='minute')!.value}`};};
export function recommend(items:Listing[],settings:MemberSettings,now=Date.now()){
 return items.filter(i=>['event','volunteer','place','business','resource'].includes(i.kind)&&i.status!=='cancelled'&&(!i.ends||Date.parse(i.ends)>now)&&(!i.deadline||Date.parse(i.deadline)>now)&&ageFits(i,settings.age)!==false).map(i=>{
  const match=personalizationMatch(i,settings);
  if(!match.goalFits||!['event','volunteer'].includes(i.kind)&&!settings.goals.length&&!match.hasPersonalMatch)return null;
  let score=match.score;const reasons=[...match.reasons];
  if(i.area===settings.area){score+=3;reasons.push(`In ${settings.area}.`);}
  if(ageFits(i,settings.age)===true){score++;reasons.push('Fits the stated age range.');}else if(settings.age!==null)reasons.push('Age requirements are not stated; check with the organizer.');
  if(i.starts&&i.ends&&settings.days.length){const start=pacific(i.starts),end=pacific(i.ends);if(settings.days.includes(start.day)&&start.date===end.date&&start.clock>=settings.from&&end.clock<=settings.until){score+=4;reasons.push('Fits your selected days and Pacific time window.');}else return null;}
  else if(!i.starts&&['event','volunteer'].includes(i.kind))reasons.push('Schedule varies; confirm that a role fits your availability.');
  if(!reasons.length)reasons.push('An upcoming local opportunity; add interests to personalize your results.');
  return {...i,reasons,score};
 }).filter((i):i is Listing&{reasons:string[];score:number}=>!!i).sort((a,b)=>b.score-a.score||(a.starts||'9999').localeCompare(b.starts||'9999')||a.id.localeCompare(b.id)).slice(0,8);
}

export type SearchOptions={q:string;area:string;kind:string;category:string;radius:number|null;center:{lat:number;lng:number};from:string;until:string;age:number|null;knownAge:boolean;saved?:string[]};
export function searchListings(items:Listing[],o:SearchOptions){
 const day=(s:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s));
 return items.map(i=>({...i,distance:i.lat!==null&&i.lng!==null?distanceMiles(o.center,{lat:i.lat,lng:i.lng}):null})).filter(i=>(!!o.saved||i.status!=='cancelled')&&(!o.saved||o.saved.includes(i.id)&&/^(event|discovery|listing|volunteer|official):/.test(i.id))&&(o.area==='All areas'||i.area===o.area||i.area==='Across the Peninsula')&&(o.kind==='All types'||i.kind===o.kind)&&(o.category==='All categories'||i.category===o.category)&&o.q.toLowerCase().trim().split(/\s+/).every(t=>`${i.title} ${i.body} ${i.location} ${i.category} ${i.area} ${i.eligibility}`.toLowerCase().includes(t))&&(o.radius===null||i.distance!==null&&i.distance<=o.radius)&&(!o.from||!!i.starts&&day(i.starts)>=o.from)&&(!o.until||!!i.starts&&day(i.starts)<=o.until)&&ageFits(i,o.age)!==false&&(!o.knownAge||o.age===null||ageFits(i,o.age)===true)).sort((a,b)=>o.radius!==null?(a.distance??999)-(b.distance??999):(a.starts||'9999').localeCompare(b.starts||'9999'));
}
