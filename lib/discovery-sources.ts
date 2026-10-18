// Fixed public sources. A supplied URL is evidence only; it is never fetched by the server.
export const discoverySources=[
  {id:'rpv-recreation',name:'RPV Recreation & Parks',url:'https://www.rpvca.gov/calendar.aspx?CID=23',feed:'https://www.rpvca.gov/common/modules/iCalendar/iCalendar.aspx?catID=23&feed=calendar',host:'www.rpvca.gov',mode:'calendar' as const},
  {id:'rpv-community',name:'RPV community calendar',url:'https://www.rpvca.gov/calendar.aspx?CID=28',feed:'https://www.rpvca.gov/common/modules/iCalendar/iCalendar.aspx?catID=28&feed=calendar',host:'www.rpvca.gov',mode:'calendar' as const},
  {id:'peninsula-center',name:'Peninsula Shopping Center',url:'https://peninsulashoppingcenter.com/events/',host:'peninsulashoppingcenter.com',mode:'research' as const},
  {id:'pvld',name:'Palos Verdes Library District',url:'https://pvld.libnet.info/events',feed:'https://pvld.libnet.info/feeds?data=eyJmZWVkVHlwZSI6ImljYWwiLCJmaWx0ZXJzIjp7ImxvY2F0aW9uIjpbImFsbCJdLCJhZ2VzIjpbImFsbCJdLCJ0eXBlcyI6WyJhbGwiXSwidGFncyI6W10sInRlcm0iOiIiLCJkYXlzIjoxfX0=',host:'pvld.libnet.info',mode:'calendar' as const},
  {id:'pvplc',name:'Palos Verdes Peninsula Land Conservancy',url:'https://pvplc.org/calendar-events-list/',host:'pvplc.org',mode:'research' as const},
  {id:'chamber',name:'Palos Verdes Peninsula Chamber',url:'https://business.palosverdeschamber.com/events',host:'business.palosverdeschamber.com',mode:'research' as const},
  {id:'lunada-market',name:'Lunada Market',url:'https://lunadamarket.com/palos-verdes-lunada-kitchen-and-deli-events',host:'lunadamarket.com',mode:'research' as const},
] as const;
export type SourceId=typeof discoverySources[number]['id'];
export function sourceFor(id:string){return discoverySources.find(s=>s.id===id);}
export function evidenceUrl(value:string,source:string){
  try{const u=new URL(value),s=sourceFor(source);return !!s&&u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.replace(/^www\./,'')===s.host.replace(/^www\./,'');}catch{return false;}
}
