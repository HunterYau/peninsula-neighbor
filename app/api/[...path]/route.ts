import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleApi,type Database} from '../../../lib/api';
export const dynamic='force-dynamic';
async function handle(request:Request){
  if(!env.DB)return Response.json({error:'Community database is not configured.'},{status:503});
  const user=await getChatGPTUser();
  return handleApi(request,env.DB as unknown as Database,user);
}
export {handle as GET,handle as POST,handle as PUT,handle as PATCH,handle as DELETE};
