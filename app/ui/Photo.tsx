'use client';
import {useEffect,useState} from 'react';
import {ImageOff} from 'lucide-react';
import type {Photo as PhotoData} from '../../lib/photos';
export function PhotoCredit({photo}:{photo:PhotoData}){return <span className="photo-credit"><a href={photo.source} target="_blank" rel="noopener noreferrer">{photo.credit}</a>{photo.license&&photo.licenseUrl&&<><span aria-hidden="true"> · </span><a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a></>}</span>;}
export default function Photo({photo,className='',priority=false,showCredit=true}:{photo:PhotoData|null|undefined;className?:string;priority?:boolean;showCredit?:boolean}){
 const [failed,setFailed]=useState(false);useEffect(()=>setFailed(false),[photo?.src]);if(!photo)return null;
 return <span className={`photo-frame ${className} ${failed?'photo-failed':''}`}>{failed?<span className="photo-unavailable"><ImageOff size={20}/><span>Image unavailable</span></span>:<img src={photo.src} alt={photo.alt} loading={priority?'eager':'lazy'} fetchPriority={priority?'high':'auto'} decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>} {showCredit&&<PhotoCredit photo={photo}/>}</span>;
}
