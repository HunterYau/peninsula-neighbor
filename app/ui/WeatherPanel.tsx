import {ArrowUpRight,ChevronRight,Droplets,RefreshCw,Wind} from 'lucide-react';
import type {Conditions} from '../../lib/types';
import WeatherIcon from './WeatherIcon';

const officialForecast='https://forecast.weather.gov/MapClick.php?lat=33.787&lon=-118.402';
export const weatherNumber=(value:number|null|undefined)=>typeof value==='number'&&Number.isFinite(value)?Math.round(value):'—';
export function weatherTime(value:string){return new Date(value).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:'America/Los_Angeles',timeZoneName:'short'});}

export default function WeatherPanel({conditions,loading,refresh,openAlerts}:{conditions:Conditions|null;loading:boolean;refresh:()=>void;openAlerts:()=>void}){
  const weather=conditions?.weather;
  return <section className="panel" aria-busy={loading}>
    <div className="panel-heading"><h2>Around the Peninsula</h2><button className="icon-button" onClick={refresh} disabled={loading} aria-label="Refresh conditions"><RefreshCw className={loading?'spin':''} size={15}/></button></div>
    <div className="weather-summary" aria-live="polite"><div><span className="weather-place">Palos Verdes Estates · °F</span><strong>{weatherNumber(weather?.temperature)}°<WeatherIcon description={weather?.description} loading={loading} size={40}/></strong><p>{weather?weather.description:loading?'Loading conditions…':'Weather temporarily unavailable'}</p></div></div>
    <div className="weather-details"><span><Wind size={15}/>{weather?.wind!=null?`${weatherNumber(weather.wind)} mph`:'—'}</span><span><Droplets size={15}/>{weather?.rain!=null?`${weatherNumber(weather.rain)}% rain`:'—'}</span><span>H {weatherNumber(weather?.high)}° · L {weatherNumber(weather?.low)}°</span></div>
    <div className="data-credit">
      {weather?<><span>{weather.stale?'Refresh failed · older forecast':'Current forecast'} · {weatherTime(weather.validAt)}</span><br/><a className="text-link" href={weather.sourceUrl} target="_blank" rel="noopener noreferrer">{weather.source}<ArrowUpRight size={14}/></a></>:<><span>{loading?'Getting the latest forecast…':'Try refreshing, or check the official forecast.'}</span><br/><a className="text-link" href={officialForecast} target="_blank" rel="noopener noreferrer">View NWS forecast<ArrowUpRight size={14}/></a></>}
    </div>
    <button className="condition-link" onClick={openAlerts}><span className={`status-dot ${!conditions||conditions.alerts===null?'muted':conditions.alerts.length?'amber':''}`}/>{!conditions||conditions.alerts===null?'Alert status unavailable':conditions.alerts.length?`${conditions.alerts.length} NWS weather alert${conditions.alerts.length===1?'':'s'}`:'No active NWS alerts returned'}<ChevronRight size={14}/></button>
  </section>;
}
