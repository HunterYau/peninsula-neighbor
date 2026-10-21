import {notFound} from 'next/navigation';
import CommunityApp from '../ui/CommunityApp';
import {officialResources,resourceTopics} from '../../lib/official-resources';
import {pathView,viewTitles} from '../../lib/navigation';
export async function generateMetadata({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;const view=pathView('/'+slug.join('/'));return {title:`${view?viewTitles[view]:'Page not found'} · Peninsula Neighbor`};}
export default async function Page({params}:{params:Promise<{slug:string[]}>}){const {slug}=await params;const view=pathView('/'+slug.join('/'));if(!view)notFound();if(slug[0]==='resources'&&slug[1]==='guide'&&!officialResources.some(r=>r.id===slug[2]))notFound();if(slug[0]==='resources'&&slug[1]==='topic'&&!resourceTopics.some(r=>r.id===slug[2]))notFound();return <CommunityApp initialView={view} initialPath={'/'+slug.join('/')}/>;}
