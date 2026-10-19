import {z} from 'zod';
import {areas} from './validation.ts';
import {httpsUrl,memberSchema,recommend,type Listing,type MemberSettings} from './community-model.ts';
export const problemCategories=['Broken sidewalk','Dangerous intersection','Fallen tree','Inaccessible location','Illegal dumping','Recurring hazard'] as const;
export const accessCategories=['Curb ramp','Step-free entrance','Accessible path','Accessible parking','Access barrier'] as const;
export const coyoteCategories=['Passing through','Repeated sightings','Concerning behavior'] as const;
export const mapReportSchema=z.object({kind:z.enum(['coyote','accessibility','problem']),category:z.string(),area:z.enum(areas),title:z.string().trim().min(4).max(100),details:z.string().trim().min(10).max(1500),lat:z.number().min(33.70).max(33.86),lng:z.number().min(-118.46).max(-118.28),observed:z.string().datetime(),sourceUrl:z.union([z.literal(''),httpsUrl]).default('')}).superRefine((v,c)=>{const categories=v.kind==='coyote'?coyoteCategories:v.kind==='accessibility'?accessCategories:problemCategories;if(!(categories as readonly string[]).includes(v.category))c.addIssue({code:'custom',message:'Choose a category for this report type.'});});
export type MapReport=z.infer<typeof mapReportSchema>&{id:string;status:string;note:string;created:string;reviewed:string|null};
export type MapFeature={id:string;title:string;body:string;lat:number;lng:number;area:string;category:string;url:string;verification:string;checked:string;access?:Record<string,string>;osmId?:string};
export type HeatCell={id:string;lat:number;lng:number;count:number;category?:string};
export const heatDelay=24*3600000;
export function heatCells(rows:{lat:number|string;lng:number|string;observed:string;status?:string;category?:string;created?:string}[],now=Date.now(),delay=heatDelay):HeatCell[]{
 const cells=new Map<string,HeatCell>();
 for(const row of rows){const lat=Number(row.lat),lng=Number(row.lng),date=Date.parse(row.observed);if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(date)||date>now-delay||date<now-30*86400000||row.created&&Date.parse(row.created)>now-delay||row.status&&row.status!=='approved')continue;
 // Roughly 1 km cells. Never return original coordinates, timestamps, notes, or identities.
 const a=Math.floor(lat*100)/100+.005,b=Math.floor(lng*100)/100+.005,id=`${a.toFixed(3)},${b.toFixed(3)}`;
 const cell=cells.get(id)||{id,lat:a,lng:b,count:0};cell.count++;cells.set(id,cell);
 }return [...cells.values()];
}
export function featureListing(f:MapFeature):Listing{return {id:f.id,kind:'resource',title:f.title,body:f.body,area:f.area,category:f.category,location:f.area,organization:'',url:f.url,contact:'',minimumAge:null,maximumAge:null,eligibility:f.body,starts:null,ends:null,deadline:null,lat:f.lat,lng:f.lng,approximate:true,verification:f.verification,verified:f.checked,status:'published'};}
export function coverageScores(listings:Listing[],accessible:MapFeature[],emergency:MapFeature[],now=Date.now()){
 return areas.map(area=>{const local=listings.filter(i=>i.area===area&&i.status!=='cancelled'&&(!i.ends||Date.parse(i.ends)>now));const counts={events:local.filter(i=>i.kind==='event').length,accessibility:accessible.filter(i=>i.area===area&&i.category!=='Access barrier').length,volunteering:local.filter(i=>i.kind==='volunteer').length,emergency:emergency.filter(i=>i.area===area).length,youth:local.filter(i=>i.minimumAge!==null&&i.minimumAge<18&&(i.maximumAge===null||i.maximumAge>=13)&&['event','volunteer'].includes(i.kind)).length};return {area,counts,score:Object.values(counts).filter(n=>n>0).length*20,missing:Object.entries(counts).filter(([,n])=>n===0).map(([k])=>k)};});
}
export const matchSettings=memberSchema.and(z.object({desiredHours:z.number().min(0.5).max(500)}));
export function volunteerMatches(items:Listing[],settings:MemberSettings,desiredHours:number,now=Date.now()){
 return recommend(items.filter(i=>i.kind==='volunteer'),settings,now).map(i=>{const duration=i.starts&&i.ends?(Date.parse(i.ends)-Date.parse(i.starts))/3600000:null;const potentialHours=duration!==null&&Number.isFinite(duration)&&duration>0?Math.round(duration*10)/10:null;return {...i,potentialHours,hoursTowardGoal:potentialHours===null?null:Math.min(potentialHours,desiredHours),reasons:[...(i.reasons||[]),potentialHours===null?'Service hours and schedule require organizer confirmation.':`Scheduled session lasts ${potentialHours} hours; credit requires organizer approval.`]};});
}
export function householdChecklist(options:{people:number;pets:boolean;mobility:boolean;power:boolean;children:boolean}){
 const people=Math.max(1,Math.min(30,Math.floor(options.people)||1));return [`Review your evacuation zone at https://www.pvpready.gov/ and enroll at https://www.alertsouthbay.com/.`,`Plan drinking and sanitation water: ${people*14} gallons for ${people} ${people===1?'person':'people'} for 14 days (one gallon per person per day); adapt to household needs.`,`Review food, medicines, flashlights, chargers, and a portable evacuation kit using https://www.ready.gov/kit.`,`Choose two meeting places and an out-of-area contact; practice the plan together.`,...(options.pets?['Include pet food, water, carriers, leashes, and a pet-friendly evacuation plan.']:[]),...(options.mobility?['Arrange accessible evacuation transport and backup assistance; confirm ramps, mobility equipment, and a personal support network.']:[]),...(options.power?['Plan backup power and charging for essential equipment with your care team and equipment supplier.']:[]),...(options.children?['Review school reunification, caregivers, comfort items, and children’s supplies.']:[]),`Follow official instructions during an emergency. This checklist does not choose a safe evacuation route or confirm an open shelter.`];
}
