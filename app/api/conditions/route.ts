import {createConditionsService} from '../../../lib/weather';
export const dynamic='force-dynamic';
const conditions=createConditionsService();
export async function GET(request:Request){
  const data=await conditions(new URL(request.url).searchParams.get('refresh')==='1');
  // Browser caching must not turn the refresh button into a replay of a failure.
  return Response.json(data,{headers:{'Cache-Control':'no-store'}});
}
