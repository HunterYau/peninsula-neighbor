export type Profile={name:string;area:string;bio:string};
export type Post={id:string;type:string;title:string;body:string;area:string;topic:string;status:string;created:string;expires:string;name:string;mine:boolean;replies:number};
export type Comment={id:string;body:string;created:string;name:string;mine:boolean};
export type CommunityEvent={id:string;title:string;body:string;area:string;location:string;starts:string;ends:string;category:string;access:string;capacity:number;created:string;name:string;mine:boolean;attending:number;joined:boolean};
export type Reminder={id:string;title:string;date:string;repeat:'none'|'weekly'|'monthly';done:boolean};
export type Preferences={saved:string[];plan:string[];area:string;prep:string[];reminders:Reminder[];interests:string[];largeText:boolean};
export type HourEntry={id:string;org:string;date:string;minutes:number;notes:string};
export type Conditions={updated:string;weather:{temperature:number;apparent:number;code:number;wind:number;high:number;low:number;rain:number;sunset:string;days:{date:string;high:number;low:number;code:number;rain:number}[]}|null;alerts:{title:string;severity:string;description:string;url:string;ends:string}[]|null;errors:string[]};
