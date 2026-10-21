import {env} from 'cloudflare:workers';
import {handleAskPV} from '../../../lib/ask-pv-api';
import type {Database} from '../../../lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!env.DB)return Response.json({error:'Local sources are unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
 return handleAskPV(request,env.DB as unknown as Database);
}
