import {z} from 'zod';
import type {Listing} from './community-model.ts';

// Existing listing categories stay stable; personal interests can be much more specific.
export const listingInterests=['Environment','Learning','Arts','Family','Community','Civic','Food','Animals','Support'] as const;
export const personalInterests=[...listingInterests,'Hiking & walking','Nature & wildlife','Gardening','Sports & fitness','Books & reading','Science & technology','History & culture','Live music','Crafts & making','Photography','Games & trivia','Food & dining','Shopping local','Youth activities','Emergency readiness','Accessibility & inclusion'] as const;
export const discoveryGoals=['Help my community','Find fun things to do','Discover places to visit','Learn & build skills','Meet people nearby','Find practical support'] as const;
export const placeTypes=['Parks & trails','Beaches & coast','Libraries & study spots','Museums & historic places','Cafés & food','Local shops','Community centers','Sports & recreation'] as const;
export const helpStyles=['Outdoor & conservation work','Tutoring & mentoring','Event support','Sorting & organizing donations','Animal care','Supporting older adults','Food & essential supplies','Emergency preparedness','Digital & creative work'] as const;
const choices=<T extends readonly [string,...string[]]>(values:T)=>z.array(z.enum(values)).max(values.length).transform(v=>[...new Set(v)]).default([]);
export const personalizationFields={interests:choices(personalInterests),goals:choices(discoveryGoals),placeTypes:choices(placeTypes),helpStyles:choices(helpStyles)};
export const personalizationSchema=z.object(personalizationFields);
export type Personalization=z.infer<typeof personalizationSchema>;
export const interestGroups=[
 {title:'Outside & active',options:['Environment','Animals','Hiking & walking','Nature & wildlife','Gardening','Sports & fitness']},
 {title:'Arts & discovery',options:['Learning','Arts','Books & reading','Science & technology','History & culture','Live music','Crafts & making','Photography','Games & trivia']},
 {title:'People & local life',options:['Family','Community','Civic','Food','Support','Food & dining','Shopping local','Youth activities','Emergency readiness','Accessibility & inclusion']}
] as const;

const topicClues:Record<string,RegExp>={
 'Hiking & walking':/\b(hik(?:e|es|ing)|walk(?:s|ing)?|trails?)\b/,
 'Nature & wildlife':/\b(nature|wildlife|habitat|bird(?:s|ing)?|whale(?:s|watching)?|tide ?pools?)\b/,
 Gardening:/\b(garden(?:s|ing)?|native plants?|planting|horticulture)\b/,
 'Sports & fitness':/\b(sports?|fitness|yoga|tennis|pickleball|basketball|swim(?:ming)?|cycling|exercise)\b/,
 'Books & reading':/\b(books?|reading|literacy|author|bookshop|bookstore)\b/,
 'Science & technology':/\b(science|technology|stem|coding|robotics|astronomy|computer)\b/,
 'History & culture':/\b(history|historic|heritage|culture|cultural|museum)\b/,
 'Live music':/\b(music|concerts?|choir|jazz|orchestra|live band)\b/,
 'Crafts & making':/\b(crafts?|crafting|makers?|making|knitting|sewing|pottery|decorating|painting)\b/,
 Photography:/\b(photography|photograph(?:s|er|ers)?|camera|photo walk)\b/,
 'Games & trivia':/\b(games?|gaming|trivia|chess|puzzles?)\b/,
 'Food & dining':/\b(food|dining|restaurant|cafe|bakery|deli|cooking|kitchen|farmers market)\b/,
 'Shopping local':/\b(shop(?:s|ping)?|bookshop|bookstore|market|local business|pop.up shop)\b/,
 'Youth activities':/\b(youth|teen(?:s|agers)?|students?|children|kids?|toddler(?:s)?|babies)\b/,
 'Emergency readiness':/\b(emergency|preparedness|cert|disaster|earthquake|evacuation)\b/,
 'Accessibility & inclusion':/\b(accessibility|inclusion|inclusive|disabilit(?:y|ies)|wheelchair|adaptive|accommodation(?:s)?)\b/
};
const placeClues:Record<string,RegExp>={
 'Parks & trails':/\b(parks?|trails?|reserve|garden)\b/,
 'Beaches & coast':/\b(beach(?:es)?|coast(?:al)?|shoreline|ocean|tide ?pools?)\b/,
 'Libraries & study spots':/\b(librar(?:y|ies)|study|book room)\b/,
 'Museums & historic places':/\b(museum|historic|history|interpretive center|lighthouse)\b/,
 'Cafés & food':/\b(cafe|bakery|deli|restaurant|dining|food|kitchen)\b/,
 'Local shops':/\b(shop(?:s|ping)?|bookshop|bookstore|market|local business)\b/,
 'Community centers':/\b(community center|civic center|recreation center|senior center)\b/,
 'Sports & recreation':/\b(sports?|recreation|courts?|tennis|pickleball|gym|swimming)\b/
};
const helpClues:Record<string,RegExp>={
 'Outdoor & conservation work':/\b(conservation|restoration|habitat|cleanup|clean.up|planting|trail work|garden)\b/,
 'Tutoring & mentoring':/\b(tutor(?:s|ing)?|mentor(?:s|ing)?|teach(?:ing)?|literacy|homework)\b/,
 'Event support':/\b(event support|event volunteers?|registration desk|set.up|usher(?:s|ing)?|festival volunteers?)\b/,
 'Sorting & organizing donations':/\b(sort(?:ing)?|organiz(?:e|ing)|donat(?:ed|ion|ions)|book room|food bank)\b/,
 'Animal care':/\b(animals?|shelter pets?|pet care|dog(?:s)?|cat(?:s)?|rescue)\b/,
 'Supporting older adults':/\b(older adults?|seniors?|elderly|homebound)\b/,
 'Food & essential supplies':/\b(food bank|food pantry|meal(?:s)?|food distribution|essential supplies|hunger)\b/,
 'Emergency preparedness':/\b(emergency|preparedness|cert|disaster|first aid)\b/,
 'Digital & creative work':/\b(digital|web design|web development|website design|website development|social media|photography|coding|creative work|graphic design|computer tutoring)\b/
};
function normalized(text:string){return text.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
function textFor(item:Listing){return normalized(`${item.title} ${item.body} ${item.location}`);}
export function personalizationMatch(item:Listing,settings:Personalization){
 const text=textFor(item),helping=item.kind==='volunteer';
 const goalFits:Record<(typeof discoveryGoals)[number],boolean>={
  'Help my community':helping,
  'Find fun things to do':['event','place','business'].includes(item.kind)&&!['Civic','Support'].includes(item.category),
  'Discover places to visit':['place','business'].includes(item.kind),
  'Learn & build skills':['Learning','Arts'].includes(item.category)||/\b(workshop|class(?:es)?|training|learn(?:ing)?|museum|interpretive)\b/.test(text),
  'Meet people nearby':['event','volunteer'].includes(item.kind),
  'Find practical support':item.kind==='resource'
 };
 const matchedGoals=settings.goals.filter(goal=>goalFits[goal]);
 const matchedTopics=settings.interests.filter(interest=>listingInterests.includes(interest as typeof listingInterests[number])?item.category===interest:topicClues[interest]?.test(text));
 const placeText=['place','business'].includes(item.kind)?text:normalized(item.location);
 const matchedPlaces=settings.placeTypes.filter(place=>placeClues[place].test(placeText));
 const matchedHelp=helping?settings.helpStyles.filter(style=>helpClues[style].test(text)):[];
 const reasons:string[]=[];
 if(matchedGoals.length)reasons.push(`For your goal: ${matchedGoals.slice(0,2).join('; ').toLowerCase()}.`);
 if(matchedTopics.length)reasons.push(`Matches your interest in ${matchedTopics.slice(0,3).join(', ').toLowerCase()}.`);
 if(matchedPlaces.length)reasons.push(`Mentions the kind of place you chose: ${matchedPlaces.slice(0,2).join(', ').toLowerCase()}.`);
 if(matchedHelp.length)reasons.push(`The listing mentions your preferred way to help: ${matchedHelp.slice(0,2).join(', ').toLowerCase()}.`);
 // Cap each group so checking many related boxes cannot overwhelm the other preferences.
 return {score:(matchedGoals.length?8:0)+Math.min(matchedTopics.length*5,10)+(matchedPlaces.length?5:0)+Math.min(matchedHelp.length*6,12),reasons,goalFits:!settings.goals.length||!!matchedGoals.length,hasPersonalMatch:!!(matchedTopics.length||matchedPlaces.length||matchedHelp.length)};
}
