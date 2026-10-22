import {z} from 'zod';
import {areas} from './validation.ts';
import {listingSchema} from './community-model.ts';
const sourceUrl=z.string().max(1000).refine(s=>{if(!s)return true;try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password;}catch{return false;}},'Invalid source link.');
export const assistantPickSchema=z.object({id:z.string().max(100),title:z.string().max(200),kind:z.string().max(40),body:z.string().max(1600),area:z.string().max(100),location:z.string().max(200),category:z.string().max(80),url:sourceUrl,starts:z.string().datetime().nullable(),ends:z.string().datetime().nullable(),deadline:z.string().datetime().nullable(),eligibility:z.string().max(600),verification:z.string().max(300),checked:z.string().nullable(),reasons:z.array(z.string().max(400)).max(8),saved:z.boolean(),planned:z.boolean()});
export const actionReceiptSchema=z.object({kind:z.enum(['bookmark','plan','submission']),id:z.string().max(100),listingId:z.string().max(100).optional(),title:z.string().max(200),message:z.string().max(800),url:z.enum(['/account/saved','/account/planner','/community/submit']),created:z.string().datetime()});
export const assistantResultSchema=z.object({basis:z.string().max(1000),picks:z.array(assistantPickSchema).max(4),receipts:z.array(actionReceiptSchema).max(8),draft:z.enum(['event','volunteer']).optional()});
export type AssistantPick=z.infer<typeof assistantPickSchema>;
export type ActionReceipt=z.infer<typeof actionReceiptSchema>;
export type AssistantResult=z.infer<typeof assistantResultSchema>;
export const assistantRequest=z.object({question:z.string().trim().min(2).max(600),previousQuestion:z.string().max(600).optional(),contextIds:z.array(z.string().max(100)).max(4).default([]),requestId:z.string().uuid()}).strict();
export const intervalFields={starts:z.string().datetime().nullable().optional(),ends:z.string().datetime().nullable().optional()};
export const personalDraftSchema=z.object({title:z.string().trim().min(4).max(120),body:z.string().trim().max(2500).default(''),kind:z.enum(['event','volunteer','outing','resource']).default('event'),area:z.enum(areas),location:z.string().trim().max(200).default(''),category:z.string().max(80).default('Community')});
export const planRequest=z.object({requestId:z.string().uuid(),listingId:z.string().max(100).optional(),custom:personalDraftSchema.optional(),...intervalFields}).strict().refine(v=>!!v.listingId!==!!v.custom,'Choose a listing or create a personal activity.');
export const planChange=z.object({...intervalFields,status:z.enum(['planned','done','cancelled']).optional(),title:z.string().trim().min(4).max(120).optional(),notes:z.string().max(1500).optional()}).strict();
export type ActivityPlan={id:string;listingId:string|null;title:string;body:string;kind:string;area:string;location:string;category:string;url:string;verification:string;checked:string|null;starts:string|null;ends:string|null;status:'planned'|'done'|'cancelled';scheduleOrigin?:'organizer'|'personal'|'unscheduled';notes:string;created:string;updated:string};
export const actionRequest=z.discriminatedUnion('action',[
 z.object({action:z.literal('bookmark'),listingId:z.string().min(1).max(100)}).strict(),
 z.object({action:z.literal('plan'),requestId:z.string().uuid(),listingId:z.string().min(1).max(100),...intervalFields}).strict(),
 z.object({action:z.literal('submit-listing'),requestId:z.string().uuid(),listing:listingSchema,addToPlanner:z.boolean().default(false)}).strict()
]);
