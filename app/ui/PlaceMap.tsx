'use client';
import {useEffect,useRef,useState} from 'react';
import type {Map as LeafletMap,LayerGroup,Marker} from 'leaflet';
import type {MapBounds,Position} from '../../lib/map-browser';
import type {HeatCell} from '../../lib/map-community';
import 'leaflet/dist/leaflet.css';
type MapPoint={id:string;name:string;lat:number;lng:number;kind?:string};
type Props<T>={places:T[];onSelect:(place:T)=>void;selectedId?:string;fitKey?:string|number;onBounds?:(bounds:MapBounds)=>void;origin?:Position;className?:string;route?:Position[];heat?:HeatCell[];onMapClick?:(point:Position)=>void;disclaimer?:string};
export default function PlaceMap<T extends MapPoint>({places,onSelect,selectedId,fitKey,onBounds,origin,className='',route,heat=[],onMapClick,disclaimer='Approximate pins · Confirm the usable entrance'}:Props<T>){
 const leaflet=useRef<typeof import('leaflet')|null>(null),container=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),layer=useRef<LayerGroup|null>(null),originLayer=useRef<LayerGroup|null>(null),routeLayer=useRef<LayerGroup|null>(null),heatLayer=useRef<LayerGroup|null>(null),markers=useRef(new Map<string,Marker>()),latest=useRef({places,onSelect,onBounds,onMapClick,selectedId}),[ready,setReady]=useState(false),[zoom,setZoom]=useState(12),[error,setError]=useState('');
 latest.current={places,onSelect,onBounds,onMapClick,selectedId};const positions=places.map(p=>`${p.id}:${p.lat}:${p.lng}:${p.name}`).join('|');
 useEffect(()=>{let disposed=false,observer:ResizeObserver|undefined;import('leaflet').then(L=>{
  if(disposed||!container.current)return;const motion=!window.matchMedia('(prefers-reduced-motion: reduce)').matches;leaflet.current=L;
  const m=L.map(container.current,{scrollWheelZoom:true,minZoom:9,maxZoom:19,zoomAnimation:motion,fadeAnimation:motion,markerZoomAnimation:motion});map.current=m;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',maxZoom:19}).on('tileerror',()=>setError('Some map tiles are unavailable. The list and directions still work.')).addTo(m);
  L.control.scale({imperial:true,metric:true}).addTo(m);layer.current=L.layerGroup().addTo(m);originLayer.current=L.layerGroup().addTo(m);routeLayer.current=L.layerGroup().addTo(m);heatLayer.current=L.layerGroup().addTo(m);m.setView([33.775,-118.385],12);
  m.on('moveend',()=>{const b=m.getBounds();latest.current.onBounds?.({north:b.getNorth(),south:b.getSouth(),east:b.getEast(),west:b.getWest()});});m.on('zoomend',()=>setZoom(m.getZoom()));m.on('click',e=>latest.current.onMapClick?.({lat:e.latlng.lat,lng:e.latlng.lng}));
  observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(container.current);setReady(true);
 }).catch(()=>setError('The interactive map could not load. Please use the results list.'));return()=>{disposed=true;observer?.disconnect();map.current?.remove();map.current=null;layer.current=null;originLayer.current=null;};},[]);
 useEffect(()=>{
  const L=leaflet.current;if(!ready||!L||!map.current||!layer.current)return;layer.current.clearLayers();markers.current.clear();const groups=new Map<string,T[]>(),cell=zoom<=11?.02:zoom<=13?.005:zoom<=15?.001:0;
  latest.current.places.forEach(p=>{const key=cell?`${Math.floor(p.lat/cell)},${Math.floor(p.lng/cell)}`:`${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;groups.set(key,[...(groups.get(key)||[]),p]);});
  for(const group of groups.values()){
   const p=group[0],number=latest.current.places.findIndex(i=>i.id===p.id)+1,spread=group.some(i=>i.lat!==p.lat||i.lng!==p.lng);
   const marker=L.marker([p.lat,p.lng],{title:group.length>1?`${group.length} ${spread?'nearby':'co-located'} listings · zoom or select`:p.name,keyboard:true,icon:L.divIcon({className:`numbered-marker browse-marker ${group.some(i=>i.id===latest.current.selectedId)?'is-selected':''} kind-${['business','event','volunteer'].includes(p.kind||'')?p.kind:'place'}`,html:`<span>${spread?group.length:number}</span>${!spread&&group.length>1?`<b>${group.length}</b>`:''}`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(layer.current);
   marker.on('click',()=>{if(spread&&group.length>1&&map.current){map.current.fitBounds(group.map(i=>[i.lat,i.lng] as [number,number]),{padding:[45,45],maxZoom:18});return;}const current=latest.current.places.find(i=>i.id===p.id);if(current)latest.current.onSelect(current);});
   marker.getElement()?.setAttribute('aria-label',group.length>1?`${group.length} listings near ${p.name}`:`${number}. ${p.name}`);group.forEach(i=>markers.current.set(i.id,marker));
  }
 },[ready,positions,zoom]);
 useEffect(()=>{if(!ready||!map.current)return;const p=latest.current.places.find(p=>p.id===selectedId),selectedMarker=selectedId?markers.current.get(selectedId):null;for(const marker of new Set(markers.current.values())){marker.getElement()?.classList.toggle('is-selected',marker===selectedMarker);marker.setZIndexOffset(marker===selectedMarker?1000:0);}if(p)map.current.panInside([p.lat,p.lng],{padding:[60,60],animate:false});},[ready,selectedId,positions]);
 useEffect(()=>{if(!ready||!map.current)return;const points=latest.current.places;if(points.length>1)map.current.fitBounds(points.map(p=>[p.lat,p.lng] as [number,number]),{padding:[40,40],maxZoom:14,animate:false});else map.current.setView([points[0]?.lat||33.775,points[0]?.lng||-118.385],points.length?15:12,{animate:false});},[ready,fitKey===undefined?positions:fitKey]);
 useEffect(()=>{const L=leaflet.current;if(!ready||!L||!originLayer.current)return;originLayer.current.clearLayers();if(origin)L.circleMarker([origin.lat,origin.lng],{radius:7,color:'#fff',weight:3,fillColor:'#3475b4',fillOpacity:1}).bindTooltip(onMapClick?'Selected report location':'Directions starting point').addTo(originLayer.current);},[ready,origin?.lat,origin?.lng]);
 useEffect(()=>{const L=leaflet.current;if(!ready||!L||!routeLayer.current||!map.current)return;routeLayer.current.clearLayers();if(route&&route.length>1){const line=L.polyline(route.map(p=>[p.lat,p.lng] as [number,number]),{color:'#205fc0',weight:6,opacity:.85}).addTo(routeLayer.current);map.current.fitBounds(line.getBounds(),{padding:[45,45],maxZoom:17,animate:false});}},[ready,route]);
 useEffect(()=>{const L=leaflet.current;if(!ready||!L||!heatLayer.current)return;heatLayer.current.clearLayers();for(const cell of heat)L.circle([cell.lat,cell.lng],{radius:500,color:'#b36726',weight:1,fillColor:cell.count>=5?'#c44b35':'#e8a34c',fillOpacity:Math.min(.65,.15+cell.count*.05)}).bindTooltip(`${cell.count} delayed report${cell.count===1?'':'s'} · approximate 1 km cell`).addTo(heatLayer.current);},[ready,heat]);
 return <div className={`local-map live-map ${className}`}><div ref={container} className="leaflet-host" role="region" aria-label={onMapClick?'Choose a public location on the map':'Interactive map · drag to pan, pinch or use plus and minus to zoom'} tabIndex={0}/>{!ready&&!error&&<div className="map-error" role="status">Loading map…</div>}{error&&<div className="map-error" role="status">{error}</div>}<div className="map-disclaimer">{disclaimer}</div></div>;
}
