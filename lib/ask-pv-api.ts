import type {Database} from './api.ts';
import {communityCatalog} from './community-catalog.ts';
import {askRequestSchema,retrieveAskKnowledge} from './ask-pv.ts';

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
// Retrieval is read-only, uses only public listings, and never stores questions or chat history.
export async function handleAskPV(request:Request,db:Database){
 if(request.method!=='POST')return json({error:'Use POST to ask a question.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return json({error:'Ask your question from Peninsula Neighbor.'},403);
 if(!request.headers.get('content-type')?.includes('application/json'))return json({error:'Send a JSON question.'},415);
 if(Number(request.headers.get('content-length'))>3500)return json({error:'That question is too long.'},413);
 try{
  const raw=await request.text();if(raw.length>3500)return json({error:'That question is too long.'},413);
  let input;try{input=JSON.parse(raw);}catch{return json({error:'The question could not be read.'},400);}
  const parsed=askRequestSchema.safeParse(input);if(!parsed.success)return json({error:'Ask a question between 2 and 600 characters.'},400);
  const {listings}=await communityCatalog(db);
  return json(retrieveAskKnowledge(parsed.data.question,listings,parsed.data.previousQuestion));
 }catch{return json({error:'Local sources could not be loaded. Please try again shortly.'},503);}
}
