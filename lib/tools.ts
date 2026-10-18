import type {Place,Service} from './catalog';
import type {Preferences,Reminder,Post} from './types';
export const distanceKm=(a:Place,b:Place)=>{const rad=(v:number)=>v*Math.PI/180,dLat=rad(b.lat-a.lat),dLng=rad(b.lng-a.lng);return 6371*2*Math.asin(Math.sqrt(Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2));};
export function travelMinutes(a:Place,b:Place,mode='drive'){return Math.ceil(distanceKm(a,b)*1.35/(mode==='walk'?4.5:35)*60)+(mode==='walk'?0:8);}
export function itineraryMinutes(ids:string[],places:Place[],mode='drive'){const chosen=ids.map(id=>places.find(p=>p.id===id)).filter((p):p is Place=>!!p);return chosen.reduce((total,p,i)=>total+p.duration+(i?travelMinutes(chosen[i-1],p,mode):0),0);}
export function suggestDay(places:Place[],options:{area:string;category:string;minutes:number;free:boolean;mode:string;saved:string[]}){
  const candidates=places.filter(p=>(options.area==='All areas'||p.area===options.area)&&(options.category==='All categories'||p.category===options.category)&&(!options.free||p.cost==='Free'));
  let best:string[]=[],bestScore=-1;
  function search(path:Place[],remaining:Place[],time:number,score:number){
    const value=score-time*.025;
    if(value>bestScore&&path.length){best=path.map(p=>p.id);bestScore=value;}
    if(path.length===4)return;
    for(const p of remaining){const next=time+p.duration+(path.length?travelMinutes(path[path.length-1],p,options.mode):0);if(next<=options.minutes)search([...path,p],remaining.filter(v=>v.id!==p.id),next,score+100+(options.saved.includes(p.id)?25:0)+(path.every(v=>v.category!==p.category)?12:0));}
  }
  search([],candidates,0,0);return best;
}
export function searchDirectory(places:Place[],services:Service[],query:string){const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);return [...places.map(p=>({id:p.id,title:p.name,description:p.description,area:p.area,kind:'place',keywords:[p.category,...p.tags].join(' ')})),...services.map(s=>({id:s.id,title:s.name,description:s.description,area:s.area,kind:'service',keywords:s.keywords.join(' ')}))].map(item=>({...item,score:terms.reduce((score,t)=>score+(item.title.toLowerCase().includes(t)?5:0)+(item.keywords.toLowerCase().includes(t)?3:0)+(item.description.toLowerCase().includes(t)?1:0),0)})).filter(item=>!terms.length||terms.every(t=>`${item.title} ${item.description} ${item.keywords} ${item.area}`.toLowerCase().includes(t))).sort((a,b)=>b.score-a.score);}
export function matchingPosts(post:Post,posts:Post[]){const opposite=post.type==='Ask for help'?'Offer help':post.type==='Offer help'?'Ask for help':null;if(!opposite)return[];const words=post.title.toLowerCase().match(/[a-z]{4,}/g)||[];return posts.filter(p=>p.id!==post.id&&p.type===opposite&&p.status==='open').map(p=>({post:p,score:(p.topic===post.topic?4:0)+(p.area===post.area?2:0)+words.filter(w=>p.title.toLowerCase().includes(w)||p.body.toLowerCase().includes(w)).length})).filter(p=>p.score>=4).sort((a,b)=>b.score-a.score).slice(0,3).map(p=>p.post);}
export function advanceReminder(reminder:Reminder):Reminder{if(reminder.repeat==='none')return {...reminder,done:!reminder.done};const date=new Date(reminder.date+'T12:00:00');if(reminder.repeat==='weekly')date.setDate(date.getDate()+7);else{const day=date.getDate();date.setDate(1);date.setMonth(date.getMonth()+1);const last=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();date.setDate(Math.min(day,last));}return {...reminder,date:`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`,done:false};}
export function mergePreferences(a:Preferences,b:Preferences):Preferences{return {...b,saved:[...new Set([...a.saved,...b.saved])].slice(0,200),plan:b.plan.length?b.plan:a.plan,prep:[...new Set([...a.prep,...b.prep])].slice(0,40),reminders:[...new Map([...a.reminders,...b.reminders].map(r=>[r.id,r])).values()].slice(0,100)};}
export function calendarExport(entries:{id:string;title:string;location?:string;starts:string;ends:string;body?:string;repeat?:string}[]){
  const escape=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp=(v:string)=>new Date(v).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const fold=(line:string)=>{const parts:string[]=[];let segment='';for(const char of line){if(new TextEncoder().encode(segment+char).length>73){parts.push(segment);segment=' '+char;}else segment+=char;}parts.push(segment);return parts.join('\r\n');};
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Peninsula Neighbor//EN','CALSCALE:GREGORIAN',...entries.flatMap(event=>['BEGIN:VEVENT',`UID:${escape(event.id)}@peninsula-neighbor`,`DTSTAMP:${stamp(new Date().toISOString())}`,`DTSTART:${stamp(event.starts)}`,`DTEND:${stamp(event.ends)}`,`SUMMARY:${escape(event.title)}`,`LOCATION:${escape(event.location||'')}`,`DESCRIPTION:${escape(event.body||'')}`,...(event.repeat&&event.repeat!=='none'?[`RRULE:FREQ=${event.repeat==='weekly'?'WEEKLY':'MONTHLY'}`]:[]),'END:VEVENT']),'END:VCALENDAR',''].map(fold).join('\r\n');
}
export const weatherLabel=(code:number)=>code===0?'Clear skies':code<=3?'Partly cloudy':code<=48?'Fog':code<=67?'Rain':code<=77?'Snow':code<=82?'Showers':code<=86?'Snow showers':'Thunderstorms';
export const csvCell=(value:unknown)=>`"${String(value).replace(/^[=+@-]/,"'$&").replace(/"/g,'""')}"`;
