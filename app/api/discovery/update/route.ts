import {env} from 'cloudflare:workers';
import {discoveryUpdateSchema,saveDiscoveryUpdate,readDiscoveries} from '../../../../lib/discovery';
import type {Database} from '../../../../lib/api';
export const dynamic='force-dynamic';
// Owner-private Site only: Sites dispatch authenticates service access before forwarding.
// This route does not grant a visitor identity or access to members' private records.
export async function POST(request:Request){
  const origin=request.headers.get('origin');
  if(origin||request.headers.get('X-Discovery-Writer')!=='scheduled-update')return Response.json({error:'Use the unattended updater.'},{status:403});
  if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'Send JSON.'},{status:415});
  if(!env.DB)return Response.json({error:'Database unavailable.'},{status:503});
  const raw=await request.text();if(raw.length>400000)return Response.json({error:'Update exceeds limit.'},{status:413});
  let parsed;try{parsed=discoveryUpdateSchema.safeParse(JSON.parse(raw));}catch{return Response.json({error:'Invalid JSON.'},{status:400});}
  if(!parsed.success)return Response.json({error:parsed.error.flatten()},{status:400});
  try{const db=env.DB as unknown as Database;const result=await saveDiscoveryUpdate(db,parsed.data);return Response.json({...result,feed:await readDiscoveries(db)},{headers:{'Cache-Control':'no-store'}});}catch(error){console.error('Discovery update failed',error instanceof Error?error.message:'Unknown');return Response.json({error:'Update failed; retry the same data.'},{status:500});}
}
