'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map as LeafletMap} from 'leaflet';
import type {Place} from '../../lib/catalog';
import 'leaflet/dist/leaflet.css';

export default function PlaceMap({places,onSelect}:{places:Place[];onSelect:(place:Place)=>void}){
  const container=useRef<HTMLDivElement>(null),callback=useRef(onSelect),[error,setError]=useState('');
  callback.current=onSelect;
  const key=places.map(p=>p.id).join('|');
  useEffect(()=>{
    let disposed=false,map:LeafletMap|undefined,observer:ResizeObserver|undefined;
    setError('');
    import('leaflet').then(L=>{
      if(disposed||!container.current)return;
      const motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      map=L.map(container.current,{scrollWheelZoom:false,minZoom:10,maxZoom:18,zoomAnimation:motion,fadeAnimation:motion,markerZoomAnimation:motion});
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',maxZoom:19}).on('tileerror',()=>setError('Map tiles are unavailable. You can still use the place list.')).addTo(map);
      places.forEach((place,index)=>{
        const marker=L.marker([place.lat,place.lng],{title:place.name,keyboard:true,icon:L.divIcon({className:'numbered-marker',html:`<span>${index+1}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map!);
        marker.on('click',()=>callback.current(place));
        marker.getElement()?.setAttribute('aria-label',`${index+1}. ${place.name}`);
      });
      if(places.length>1)map.fitBounds(L.latLngBounds(places.map(p=>[p.lat,p.lng] as [number,number])),{padding:[35,35],maxZoom:14});
      else map.setView([places[0]?.lat||33.77,places[0]?.lng||-118.39],14);
      observer=new ResizeObserver(()=>map?.invalidateSize());observer.observe(container.current);
    }).catch(()=>setError('The interactive map could not be loaded. Please use the place list.'));
    return()=>{disposed=true;observer?.disconnect();map?.remove();};
  },[key]);
  return <div className="local-map live-map"><div ref={container} className="leaflet-host" aria-label="Interactive map of local places"/>{error&&<div className="map-error" role="status">{error}</div>}<div className="map-disclaimer">Approximate listing locations · Check access before visiting</div></div>;
}
