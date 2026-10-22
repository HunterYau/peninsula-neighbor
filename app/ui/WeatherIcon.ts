import {createElement} from 'react';
import {CircleHelp,Cloud,CloudDrizzle,CloudFog,CloudHail,CloudLightning,CloudRain,CloudSnow,CloudSun,LoaderCircle,Sun,Wind} from 'lucide-react';

// Both providers supply the displayed description; keep the image tied to that same forecast.
export function weatherIcon(description:string){
 const forecast=description.toLowerCase();
 if(/thunder|\bt[ -]?storms?\b/.test(forecast))return CloudLightning;
 if(/hail|ice pellets/.test(forecast))return CloudHail;
 if(/snow|sleet|flurr/.test(forecast))return CloudSnow;
 if(/drizzle/.test(forecast))return CloudDrizzle;
 if(/rain|shower/.test(forecast))return CloudRain;
 if(/fog|mist|haze|smoke/.test(forecast))return CloudFog;
 if(/partly|mostly sunny/.test(forecast))return CloudSun;
 if(/cloud|overcast/.test(forecast))return Cloud;
 if(/wind|breez/.test(forecast))return Wind;
 if(/sunny|clear|fair/.test(forecast))return Sun;
 return CircleHelp;
}

export default function WeatherIcon({description,loading=false,size=20}:{description?:string|null;loading?:boolean;size?:number}){
 const Icon=description?weatherIcon(description):loading?LoaderCircle:CircleHelp;
 return createElement(Icon,{size,'aria-hidden':true,className:!description&&loading?'spin':undefined});
}
