'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {requestApi as api} from '../../lib/client-api';
import type {MapReport} from '../../lib/map-community';

type Decision='approved'|'rejected';
const kindLabels:Record<string,string>={coyote:'Coyote sighting',accessibility:'Ramp or accessibility report',problem:'Neighborhood problem'};
const date=(value:string)=>new Date(value).toLocaleString('en-US',{timeZone:'America/Los_Angeles',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});

export function MapReportQueue({reports,busy,onReview}:{reports:MapReport[];busy:boolean;onReview:(id:string,status:Decision,note:string)=>Promise<boolean>}){
 const [status,setStatus]=useState('pending'),[kind,setKind]=useState('all'),[notes,setNotes]=useState<Record<string,string>>({});
 const visible=reports.filter(r=>(status==='all'||r.status===status)&&(kind==='all'||r.kind===kind));
 const pending=reports.filter(r=>r.status==='pending');
 async function decide(report:MapReport,decision:Decision){const note=(notes[report.id]||'').trim();if(note.length<5)return;if(await onReview(report.id,decision,note))setNotes(old=>({...old,[report.id]:''}));}
 return <div className="map-report-queue"><p className="notice">{pending.length} pending map {pending.length===1?'report':'reports'} · {pending.filter(r=>r.kind==='coyote').length} coyote {pending.filter(r=>r.kind==='coyote').length===1?'sighting':'sightings'}. Pending reports are visible to administrators immediately; the 24-hour delay applies only to public coyote summaries.</p>
  <div className="map-form-grid"><label className="field"><span>Map report status</span><select value={status} onChange={e=>setStatus(e.target.value)}>{['pending','approved','rejected','withdrawn','all'].map(value=><option key={value} value={value}>{value==='all'?'All statuses':value[0].toUpperCase()+value.slice(1)}</option>)}</select></label><label className="field"><span>Map report type</span><select value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All map reports</option>{Object.entries(kindLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label></div>
  {visible.map(report=><article className="map-review-row" key={report.id}><span className="tag">{kindLabels[report.kind]||report.kind} · {report.status}</span><h3>{report.title}</h3><p className="map-review-details">{report.details}</p><p>{report.area}<br/>Observed {date(report.observed)}<br/>Submitted {date(report.created)}<br/>Private coordinates: {report.lat}, {report.lng}</p>{report.sourceUrl&&<a className="text-link" href={report.sourceUrl} target="_blank" rel="noopener noreferrer">Submitted evidence</a>}{report.note&&<p><strong>Previous review:</strong> {report.note}</p>}{report.reviewed&&<p>Reviewed {date(report.reviewed)}</p>}{report.kind==='coyote'&&report.status==='approved'&&<p className="fine-print">The public map uses delayed, approximate cells. Reports and observations must both be at least 24 hours old and remain within the public reporting window.</p>}
   {report.status!=='withdrawn'&&<><label className="field"><span>Review note for {report.title}</span><textarea value={notes[report.id]||''} minLength={5} maxLength={500} onChange={e=>setNotes(old=>({...old,[report.id]:e.target.value}))} placeholder="Explain what you checked or why publication was declined."/></label><div className="map-context-actions"><button className="button primary" disabled={busy||(notes[report.id]||'').trim().length<5||report.status==='approved'} onClick={()=>decide(report,'approved')}>Approve</button><button className="button secondary" disabled={busy||(notes[report.id]||'').trim().length<5||report.status==='rejected'} onClick={()=>decide(report,'rejected')}>{report.status==='approved'?'Unpublish':'Reject'}</button></div></>}
  </article>)}
  {!visible.length&&<p className="fine-print">No map reports match these filters. Choose All statuses or another report type to check earlier decisions.</p>}
 </div>;
}

export default function MapReportReview({refreshKey=0}:{refreshKey?:number}){
 const [reports,setReports]=useState<MapReport[]|null>(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const request=useRef<AbortController|null>(null),mounted=useRef(true);
 const load=useCallback(async()=>{
  request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);
  try{const data=await api<{reports:MapReport[]}>('map-admin?view=reports','GET',undefined,controller.signal);if(!controller.signal.aborted){setReports(data.reports);setError('');}}
  catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
  finally{if(!controller.signal.aborted)setLoading(false);}
 },[]);
 useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false;request.current?.abort();};},[load,refreshKey]);
 async function review(id:string,status:Decision,note:string){
  setBusy(true);setError('');setMessage('');
  try{await api(`map-admin/${id}`,'PATCH',{status,note});if(!mounted.current)return true;setReports(old=>old?.map(r=>r.id===id?{...r,status,note,reviewed:new Date().toISOString()}:r)||null);setMessage(status==='approved'?'Map report approved. Public coyote summaries still follow the 24-hour delay.':'Map report rejected or unpublished.');await load();return true;}
  catch(e){if(mounted.current)setError((e as Error).message);return false;}
  finally{if(mounted.current)setBusy(false);}
 }
 return <section id="map-report-review" className="panel padded spaced map-report-review" aria-label="Map report review" aria-busy={loading}><div className="map-review-heading"><div><h2>Coyote sightings & map reports</h2><p>Review resident coyote sightings, ramps, access barriers, and neighborhood problems here. Exact details are restricted to administrators.</p></div><button className="button secondary" disabled={loading||busy} onClick={()=>void load()}><RefreshCw size={14}/>Refresh map reports</button></div>{error&&<p className="notice warning" role="alert">{error}</p>}{message&&<p className="notice" role="status">{message}</p>}{reports?<MapReportQueue reports={reports} busy={busy||loading} onReview={review}/>:<p role="status">{loading?'Loading map reports…':'Map reports could not be loaded. Use Refresh map reports to try again.'}</p>}</section>;
}
