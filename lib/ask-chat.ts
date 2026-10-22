import {z} from 'zod';
import {assistantResultSchema} from './assistant-model.ts';
import type {AskSource} from './ask-pv.ts';
const text=(max:number)=>z.string().max(max);
const publicLink=z.string().max(2000).refine(value=>{if(value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\'))return true;try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'Invalid source link.');
const localLink=z.string().max(2000).refine(value=>value.startsWith('/')&&!value.startsWith('//')&&!value.includes('\\'),'Invalid website link.');
export const chatSourceSchema=z.object({id:text(300),title:text(500),text:text(6000),url:publicLink,localUrl:localLink,localLabel:text(500).optional(),localHelp:text(3000).optional(),kind:text(100),area:text(200),checked:text(100).nullable(),verification:text(1000),requirements:text(6000).optional(),schedule:text(2000).optional()});
export const chatMessageSchema=z.object({id:z.string().uuid(),role:z.enum(['user','assistant']),content:text(12000),sources:z.array(chatSourceSchema).max(4),status:z.enum(['working','done','stopped','error']),engine:z.enum(['ai','source']).optional(),note:text(2000).optional(),chunks:z.number().int().min(0).max(100000).optional(),firstTokenMs:z.number().min(0).optional(),seconds:z.number().min(0).optional(),question:text(600).optional(),contextQuestion:text(600).optional(),assistant:assistantResultSchema.optional()});
export type ChatMessage=z.infer<typeof chatMessageSchema>&{sources:AskSource[]};
export const chatSaveSchema=z.object({title:z.string().trim().min(1).max(100),messages:z.array(chatMessageSchema).min(1).max(100),revision:z.number().int().min(0)}).strict();
export const chatChangeSchema=z.union([z.object({title:z.string().trim().min(1).max(100)}).strict(),z.object({restore:z.literal(true)}).strict()]);
export type ChatSummary={id:string;title:string;created:string;updated:string;revision:number};
export type SavedChat=ChatSummary&{messages:ChatMessage[]};
export const guestHistoryKey='peninsula-neighbor-ask-history-v1';
export function chatTitle(messages:ChatMessage[]){return (messages.find(m=>m.role==='user')?.content||'New conversation').replace(/\s+/g,' ').trim().slice(0,100);}
export function restoredMessages(messages:ChatMessage[]):ChatMessage[]{return messages.map(m=>m.status==='working'?{...m,status:'stopped',note:'This answer was interrupted. You can ask the question again.'}:m);}
export function readGuestChats(value:string|null):SavedChat[]{
 if(!value)return [];let raw:unknown;try{raw=JSON.parse(value);}catch{throw Error('Browser chat history could not be read. It has not been overwritten.');}
 const result=z.array(chatSaveSchema.omit({revision:true}).extend({id:z.string().uuid(),created:z.string().datetime(),updated:z.string().datetime(),revision:z.number().int().min(0)})).max(100).safeParse(raw);
 if(!result.success)throw Error('Browser chat history could not be read. It has not been overwritten.');
 return result.data.map(c=>({...c,messages:restoredMessages(c.messages)}));
}
