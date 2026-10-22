const zone='America/Los_Angeles';
export const pacificDate=(value:string,options:Intl.DateTimeFormatOptions={month:'short',day:'numeric'})=>new Date(value.length===10?value+'T12:00:00Z':value).toLocaleDateString('en-US',{...options,timeZone:zone});
export const pacificTime=(value:string)=>new Date(value).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:zone});
export function eventTimeRange(starts:string,ends:string){
 const sameDay=pacificDate(starts,{year:'numeric',month:'2-digit',day:'2-digit'})===pacificDate(ends,{year:'numeric',month:'2-digit',day:'2-digit'}),date=(value:string)=>pacificDate(value,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 return `${date(starts)} · ${pacificTime(starts)} – ${sameDay?'':date(ends)+' · '}${pacificTime(ends)} PT`;
}
