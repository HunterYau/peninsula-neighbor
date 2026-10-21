import {env} from 'cloudflare:workers';
import {handleLocalAuth,resolveIdentity} from '../../../lib/local-auth';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleApi,type Database} from '../../../lib/api';
export const dynamic='force-dynamic';
async function handle(request:Request){
  if(!env.DB)return Response.json({error:'Community database is not configured.'},{status:503});
  const db=env.DB as unknown as Database;
  if(new URL(request.url).pathname.startsWith('/api/auth/'))return handleLocalAuth(request,db);
  const user=await resolveIdentity(request,db,await getChatGPTUser());
  return handleApi(request,env.DB as unknown as Database,user,{adminEmail:env.COMMUNITY_ADMIN_EMAIL});
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
