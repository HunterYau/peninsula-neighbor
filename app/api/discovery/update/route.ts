import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../../chatgpt-auth';
import {resolveIdentity} from '../../../../lib/local-auth';
import {handleDiscoveryUpdate} from '../../../../lib/discovery-update-api';
import type {Database} from '../../../../lib/api';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 if(!env.DB)return Response.json({error:'Database unavailable.'},{status:503,headers:{'Cache-Control':'no-store'}});
 const db=env.DB as unknown as Database,user=await resolveIdentity(request,db,await getChatGPTUser());
 return handleDiscoveryUpdate(request,db,user,{adminEmail:env.COMMUNITY_ADMIN_EMAIL});
}
