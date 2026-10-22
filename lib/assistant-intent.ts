import {personalInterests,discoveryGoals,placeTypes,helpStyles,personalizationMatch,type Personalization} from './personalization.ts';
import {memberSchema,recommend,type Listing,type MemberSettings} from './community-model.ts';
import {calendarTime} from './discovery.ts';
export function assistantIntent(question:string){
 const q=question.toLowerCase(),negative=/\b(don['’]?t|do not|never|without|not yet|only suggest|just suggest)\b/.test(q);
 const hosting=!/\b(private|personal)\b/.test(q)&&/\b(publish|submit|public|community event|community gathering|community activity|listing)\b/.test(q)&&/\b(events?|volunteer|volunteering|opportunity|listing|gathering|activity|party)\b/.test(q);
 const custom=/\b(my own|custom|personal event|private event|event called|event named|titled|birthday|appointment)\b/.test(q);
 const capability=/^\s*(how|where|what does|can the website|can i|could i|do i|is it possible)\b/.test(q);
 const avoidsVolunteering=/\b(not|no|without|avoid|skip)\s+(?:any\s+)?volunteer(?:ing)?\b|\b(don['’]?t|do not)\s+want\s+(?:to\s+)?volunteer(?:ing)?\b/.test(q);
 const bookmark=!negative&&/\b(save|bookmark|favorite|favourite)\b/.test(q)&&!capability;
 const plan=!negative&&(/\b(add|put|schedule|book|create|make|plan)\b/.test(q)&&/\b(planner|calendar|plan|outing|event|activity|something|volunteer|volunteering|fun|party|appointment|it|that|one|them)\b/.test(q))&&!capability;
 const personal=/\b(recommend|suggest|based on my|my interests|my preferences|what should i do|something fun|something to do|plan my|find me|for me|matches? my)\b/.test(q);
 return {handled:hosting||bookmark||plan||personal,hosting,custom,bookmark,plan:plan&&!hosting,volunteer:/\b(volunteer|volunteering|service hours|give back|help (?:out |my |the )?community)\b/.test(q)&&!avoidsVolunteering,fun:/\b(fun|outing|hang out|entertainment|recreation|things to do|places? to (?:visit|go))\b/.test(q),negative};
}
export function inferredSettings(question:string,saved:MemberSettings):{settings:MemberSettings;explicit:Personalization}{
 const q=question.toLowerCase().replace(/\b(?:don't|do not|not interested in|avoid)\b[^,.!?;]*/g,'');
 const probes:Record<string,string>={'Environment':'nature conservation outdoors','Learning':'library learning science books','Arts':'art music crafts','Family':'family kids children','Community':'community volunteering','Civic':'civic government','Food':'food coffee dining','Animals':'animals pets wildlife','Support':'support help'};
 // Reuse the recommendation matcher so chat and profile interests have the same meaning.
 const synthetic={kind:'volunteer',title:q,body:q,location:q,category:''} as Listing;
 const interests=personalInterests.filter(value=>probes[value]?probes[value].split(' ').some(w=>new RegExp(`\\b${w}\\b`).test(q)):personalizationMatch(synthetic,{interests:[value],goals:[],placeTypes:[],helpStyles:[]}).hasPersonalMatch);
 const explicit={interests,goals:discoveryGoals.filter(v=>q.includes(v.toLowerCase())),placeTypes:placeTypes.filter(v=>personalizationMatch(synthetic,{interests:[],goals:[],placeTypes:[v],helpStyles:[]}).hasPersonalMatch),helpStyles:helpStyles.filter(v=>personalizationMatch(synthetic,{interests:[],goals:[],placeTypes:[],helpStyles:[v]}).hasPersonalMatch)};
 const intent=assistantIntent(question),age=question.match(/\b(?:i am|i'm|age[d]?|for a?)\s*(\d{1,2})(?:\s*years? old)?\b/i);
 return {settings:memberSchema.parse({...saved,...explicit,interests:interests.length?interests:saved.interests,placeTypes:explicit.placeTypes.length?explicit.placeTypes:saved.placeTypes,helpStyles:explicit.helpStyles.length?explicit.helpStyles:saved.helpStyles,goals:intent.volunteer?['Help my community']:intent.fun?['Find fun things to do']:saved.goals,age:age?Number(age[1]):saved.age}),explicit};
}
export function requestedDay(question:string,now=Date.now()):string|null{
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)),add=(n:number)=>new Date(Date.parse(today+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const iso=question.match(/\b(\d{4}-\d{2}-\d{2})\b/);if(iso)return iso[1];if(/\btomorrow\b/i.test(question))return add(1);if(/\btoday\b/i.test(question))return today;
 const names=['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],name=names.find(n=>new RegExp(`\\b${n}\\b`,'i').test(question));if(name||/\bthis weekend\b/i.test(question)){const target=name?names.indexOf(name):6,current=new Date(today+'T12:00:00Z').getUTCDay();return add((target-current+7)%7||(/\bnext\b/i.test(question)?7:0));}return null;
}
export function requestedInterval(question:string,now=Date.now()):{starts:string;ends:string}|null{
 const day=requestedDay(question,now),time=question.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);if(!day||!time)return null;
 let hour=Number(time[1]);if(hour<1||hour>12)return null;hour=hour%12+(/pm/i.test(time[3])?12:0);const start=calendarTime(day.replaceAll('-','')+`T${String(hour).padStart(2,'0')}${time[2]||'00'}00`);if(!start)return null;
 const hours=Number(question.match(/\bfor\s+(\d+(?:\.\d+)?)\s*hours?\b/i)?.[1]||1);return hours>0&&hours<=24?{starts:start,ends:new Date(Date.parse(start)+hours*3600000).toISOString()}:null;
}
export function rankedPicks(items:Listing[],question:string,saved:MemberSettings,now=Date.now()){
 const intent=assistantIntent(question),{settings}=inferredSettings(question,saved),day=requestedDay(question,now);
 const eligible=items.filter(i=>intent.volunteer?i.kind==='volunteer':intent.fun?['event','place','business'].includes(i.kind):['event','volunteer','place','business','resource'].includes(i.kind)).filter(i=>!day||!i.starts||new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(i.starts))===day);
 return recommend(eligible,settings,now).slice(0,4);
}
export function referenceSelection(question:string,ids:string[],items:Listing[]):string[]|null{
 const q=question.toLowerCase();if(!ids.length)return /\b(it|that|this|one|them|first|second|third|fourth|last|both|all)\b/.test(q)?[]:null;if(/\bboth\b/.test(q))return ids.length===2?ids:[];if(/\b(all|each|them)\b/.test(q))return ids;
 const ordinals=[/\b(first|1st|number 1|option 1)\b/,/\b(second|2nd|number 2|option 2)\b/,/\b(third|3rd|number 3|option 3)\b/,/\b(fourth|4th|number 4|option 4)\b/];const selected=ordinals.flatMap((r,i)=>r.test(q)?[i]:[]);if(selected.length)return selected.every(i=>!!ids[i])?selected.map(i=>ids[i]):[];
 if(/\blast\b/.test(q))return [ids.at(-1)!];const exact=items.filter(i=>ids.includes(i.id)&&q.includes(i.title.toLowerCase()));if(exact.length)return exact.map(i=>i.id);
 if(/\b(it|that|this|one)\b/.test(q))return ids.length===1?ids:[];return null;
}

export function namedListings(question:string,items:Listing[]){
 const clean=(s:string)=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
 const stop=new Set('save bookmark favorite favourite add put create make event activity opportunity plan calendar planner to my the a an it that this one for me can you please and of with based interests recommend suggest something fun volunteering volunteer'.split(' ')),words=clean(question).filter(w=>!stop.has(w));
 return items.filter(i=>{const title=clean(i.title),matches=words.filter(w=>title.includes(w));return question.toLowerCase().includes(i.title.toLowerCase())||matches.length>=2||matches.some(w=>w.length>=6&&items.filter(v=>clean(v.title).includes(w)).length===1);});
}
export function allowsAutomaticChoice(question:string){return /\b(interests?|preferences|recommend|suggest|something|anything|best (?:match|option))\b/i.test(question)||/^\s*(?:can you |please )?(?:create|make|plan|schedule|add)\s+(?:me )?(?:an? |some )?(?:fun |volunteering )?(?:event|activity|outing|plan)(?: for me)?[.!]?\s*$/i.test(question);}
