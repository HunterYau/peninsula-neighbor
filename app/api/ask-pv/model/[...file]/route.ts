import {handleModelAsset} from '../../../../../lib/ask-pv-model-assets';
export const dynamic='force-dynamic';
async function handle(request:Request,{params}:{params:Promise<{file:string[]}>}){return handleModelAsset(request,(await params).file);}
export {handle as GET,handle as HEAD};
