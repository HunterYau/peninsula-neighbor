import {places, sources, opportunities, eventFeeds} from './data.js';
import {STORE_KEY, emptyState, normalizeState, filterPlaces, toggle, makePlan, escapeHTML, planMinutes, calendarFile} from './core.js';
const e = escapeHTML;

const paths = {
  sun:'M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 1.4 1.4m10 10 1.4 1.4M5.6 18.4 1.4-1.4m10-10 1.4-1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  tree:'M12 2 5 11h4l-5 6h6v5h4v-5h6l-5-6h4L12 2Z',
  book:'M12 5v15m0-15C9 3 5 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-3-1-7-1-10 1Z',
  heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  waves:'M2 8q3-4 6 0t6 0 6 0M2 14q3-4 6 0t6 0 6 0M2 20q3-4 6 0t6 0 6 0',
  home:'m3 11 9-8 9 8M5 10v11h5v-6h4v6h5V10',
  calendar:'M4 5h16v16H4zM8 2v6m8-6v6M4 10h16m-12 4h2m4 0h2m-8 3h2',
  pin:'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  compass:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Zm-6-4-3 5-5 3 3-5 5-3Z',
  search:'M10 3a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm5 12 6 6',
  people:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m20 0v-3a4 4 0 0 0-4-4M13 6a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8',
  lighthouse:'M6 22h12l-2-12H8L6 22Zm1-12h10V6H7v4Zm-1-4 6-4 6 4M3 8H1m22 0h-2M10 15h4',
  arrow:'M4 12h16m-6-6 6 6-6 6'
};
const icon = (name) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.compass}"/></svg>`;
const main = document.querySelector('#main');
const dialog = document.querySelector('#detail');
const categories = ['All', ...new Set(places.map(p=>p.category))];
const areas = ['All areas',...new Set(places.map(p=>p.area))];
let storageOK = true;
let state;
try { state = normalizeState(JSON.parse(localStorage.getItem(STORE_KEY)), places.map(p=>p.id)); } catch { state = emptyState(); storageOK = false; }
let filters = { query:'', category:'All', area:'All areas', savedOnly:false, view:'grid' };
let boardType = 'All';
let volunteerCategory = 'All';
let toastTimer;

function toast(message) { const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3200); }
function persist() { try {localStorage.setItem(STORE_KEY,JSON.stringify(state)); storageOK=true;} catch {storageOK=false;toast('Browser storage is unavailable. Changes will last for this visit.');} updateCount(); }
function updateCount() {document.querySelector('#plan-count').textContent=state.plan.length;}
function download(name,content,type='text/plain') {const a=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
const external = (url, label, cls='btn small') => `<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer">${label} <span aria-hidden="true">↗</span></a>`;
function options(list, selected='') {return list.map(x=>`<option${x===selected?' selected':''}>${e(x)}</option>`).join('');}
function pageHead(eyebrow,title,description) {return `<div class="page-head"><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>`;}
function empty(title,text,link='') {return `<div class="empty"><h3>${title}</h3><p>${text}</p>${link}</div>`;}
function placeCard(p) {return `<article class="place-card"><div class="place-art ${p.theme}"><span class="art-label">${e(p.area)}</span>${icon(p.icon)}</div><button class="save" data-save="${p.id}" aria-label="${state.saved.includes(p.id)?'Unsave':'Save'} ${e(p.name)}" aria-pressed="${state.saved.includes(p.id)}">${icon('heart')}</button><div class="place-body"><div class="category">${e(p.category)}</div><h3>${e(p.name)}</h3><p>${e(p.description)}</p><div class="card-bottom"><span>About ${p.duration} min · Visit idea</span><button class="link-button" data-detail="${p.id}">Take a look <span aria-hidden="true">↗</span></button></div></div></article>`;}

function home() {
  main.innerHTML=`<section class="hero"><div class="hero-copy"><div class="eyebrow">Your corner of the coast</div><h1>A little closer<br>to <em>home.</em></h1><p>Good places. Familiar faces. New ways to belong. Find your next little adventure on the Palos Verdes Peninsula.</p><div class="actions"><a class="btn primary" href="#explore">Explore the neighborhood ${icon('arrow')}</a><a class="text-link" href="#events">See what's on <span aria-hidden="true">↗</span></a></div></div><div class="hero-art" role="img" aria-label="Original illustration of the Peninsula coastline, green bluffs, and a lighthouse"><div class="floating-note">${icon('pin')}<span><strong>Rooted in Palos Verdes</strong>A community worth discovering</span></div><div class="coast-badge">Life's good<br>around here.</div><div class="art-caption"><span>THE PALOS VERDES PENINSULA</span><span>33.8° N · 118.4° W</span></div></div></section>
  <div class="local-strip"><span>${icon('pin')} Palos Verdes Estates & our Peninsula neighbors</span><span>${icon('heart')} Small discoveries. Stronger community.</span><a href="#resources">Local sources, all in one place ↗</a></div>
  <section class="section"><div class="section-head"><div><p class="kicker">Make yourself at home</p><h2>What brings you here?</h2></div><span class="inline-label">A little something for everyone</span></div><div class="quick-grid">${[
    ['compass','Find your next favorite','Parks, coastlines & local places','explore'],['calendar','Make a little time','Community calendars & your events','events'],['heart','Give something back','Local ways to lend a hand','volunteer'],['people','Meet your neighbors','Ideas, offers & a helping hand','board']
  ].map(([i,t,d,h])=>`<a class="quick" href="#${h}"><div class="icon-wrap">${icon(i)}</div><h3>${t}<span aria-hidden="true">↗</span></h3><p>${d}</p></a>`).join('')}</div></section>
  <section class="section"><div class="section-head"><div><p class="kicker">Worth stepping out for</p><h2>Right around the corner.</h2></div><a class="text-link" href="#explore">Explore all places <span aria-hidden="true">→</span></a></div><div class="cards">${[places[0],places[3],places[4]].map(placeCard).join('')}</div></section>
  <section class="neighbor-banner">${icon('people')}<div><h2>A good neighborhood starts with us.</h2><p>Share a little time, find a way to help, or turn a free afternoon into a day close to home.</p></div><a class="btn primary" href="#planner">Plan my day ${icon('arrow')}</a></section>`;
}

function explore() {
  main.innerHTML=pageHead('A good day is closer than you think','Find your kind of local.','From a quiet library afternoon to a little time by the ocean. Start exploring.')+
  `<div class="filters"><div class="search">${icon('search')}<input type="search" id="place-search" aria-label="Search places" placeholder="Try ‘coast’, ‘library’, or a neighborhood…" value="${e(filters.query)}"></div><select id="area-filter" aria-label="Filter by area">${options(areas,filters.area)}</select><label class="saved-label"><input type="checkbox" id="saved-only" ${filters.savedOnly?'checked':''}> Saved places</label></div><div class="chips" aria-label="Place categories">${categories.map(c=>`<button class="chip ${c===filters.category?'active':''}" data-category="${e(c)}" aria-pressed="${c===filters.category}">${c}</button>`).join('')}</div><div class="results-bar"><span id="result-count" aria-live="polite"></span><div class="view-toggle" aria-label="Display places"><button data-view="grid" class="${filters.view==='grid'?'active':''}" aria-pressed="${filters.view==='grid'}">Cards</button><button data-view="map" class="${filters.view==='map'?'active':''}" aria-pressed="${filters.view==='map'}">Local map</button></div></div><div id="place-results"></div><p class="source-date">Curated local information · Always check the official source for hours, access, and conditions.</p>`;
  renderPlaces();
}
function renderPlaces() {
  const result=filterPlaces(places,{...filters,saved:state.saved});
  document.querySelector('#result-count').textContent=`${result.length} ${result.length===1?'place':'places'} to discover`;
  const box=document.querySelector('#place-results');
  if(!result.length){box.innerHTML=empty('No places found.','Try another search or clear your filters.','<button data-reset-filters>Clear filters</button>');return;}
  if(filters.view==='grid'){box.innerHTML=`<div class="cards">${result.map(placeCard).join('')}</div>`;return;}
  box.innerHTML=`<div class="map-layout"><div class="map" aria-label="Illustrated schematic of places on the Peninsula"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="100" fill="#c1d8d6"/><path d="M35 0H100V100H66L54 83 43 67 30 47 27 30Z" fill="#e0e4ce"/><path d="M43 0 45 25 39 44 52 62 64 81 72 100M45 25 75 30 84 60 64 81" fill="none" stroke="#fdfaf0" stroke-width="2"/><path d="M62 4 58 35 66 59 88 80" fill="none" stroke="#bdccaa" stroke-width="7"/></svg><span class="map-label">Pacific Ocean</span>${result.map((p,i)=>`<button class="pin" style="left:${p.x}%;top:${p.y}%" data-detail="${p.id}" aria-label="${i+1}. ${e(p.name)}">${i+1}</button>`).join('')}<span class="map-caption">Illustrated area guide · Approximate locations · Not for navigation</span></div><div class="map-list">${result.map((p,i)=>`<button class="map-item" data-detail="${p.id}"><span>${i+1}</span><span><strong>${e(p.name)}</strong><small>${e(p.area)}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
}

function volunteer() {
  const list=opportunities.filter(o=>volunteerCategory==='All'||o.category===volunteerCategory);
  main.innerHTML=pageHead('A little time goes a long way','Good neighbors give back.','Find a local cause, meet the people behind it, and take your next step with the organizer.')+`<div class="chips">${['All','Library & learning','Environment'].map(c=>`<button class="chip ${c===volunteerCategory?'active':''}" data-volunteer-filter="${e(c)}" aria-pressed="${c===volunteerCategory}">${c}</button>`).join('')}</div><div class="cards">${list.map(o=>`<article class="feature-card"><div class="icon-wrap">${icon(o.icon)}</div><p class="kicker">${e(o.org)}</p><h3>${e(o.title)}</h3><p>${e(o.description)}</p><div class="tags">${o.tags.map(t=>`<span>${t}</span>`).join('')}</div>${external(sources[o.source].url,'Explore volunteering')}</article>`).join('')}</div><section class="neighbor-banner">${icon('heart')}<div><h2>Start with a small kindness.</h2><p>Have a skill to share or an idea to make the neighborhood better? Draft it on your neighbor board.</p></div><a class="btn primary" href="#board">Open neighbor board →</a></section>`;
}

function events() {
  main.innerHTML=pageHead('Make room for community','A little more going on.','Official calendars to browse, and a personal calendar for the things you want to make happen.')+`<div class="notice">Browse current dates directly with each organizer. This directory does not claim to be a live event feed.</div><div class="cards">${eventFeeds.map(f=>`<article class="feature-card"><div class="icon-wrap">${icon(f.icon)}</div><p class="kicker">${f.org}</p><h3>${f.title}</h3><p>${f.description}</p>${external(sources[f.source].url,'Browse calendar & updates')}</article>`).join('')}</div><section class="section"><div class="section-head"><div><p class="kicker">Your plans, in one place</p><h2>My community calendar</h2><p>Save a date you found or plan your own get-together. Only visible in this browser.</p></div></div><div class="two-col"><form id="event-form" class="panel"><h2>Put something on the calendar.</h2><div class="form-row"><label for="event-title">Event name</label><input id="event-title" name="title" maxlength="80" required placeholder="An afternoon at the library"></div><div class="form-row"><label for="event-start">Date & time</label><input id="event-start" name="start" type="datetime-local" required><small>Uses your device’s local time zone. Exported events last one hour.</small></div><div class="form-row"><label for="event-location">Location</label><input id="event-location" name="location" maxlength="120" required placeholder="Malaga Cove Library"></div><button class="btn primary" type="submit">Save to my calendar +</button></form><div id="my-events"></div></div></section>`;
  renderEvents();
}
function renderEvents() {
  const list=[...state.events].sort((a,b)=>a.start.localeCompare(b.start));
  document.querySelector('#my-events').innerHTML=list.length?list.map(event=>`<article class="event-row"><div><p class="kicker">Personal event</p><h3>${e(event.title)}</h3><p>${e(new Date(event.start).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}))}<br>${e(event.location)}</p></div><div class="actions"><button class="btn small" data-ics="${e(event.id)}">Export .ics ↗</button><button class="btn small" data-delete-event="${e(event.id)}" aria-label="Delete ${e(event.title)}">Remove</button></div></article>`).join(''):empty('A little space for something good.','Add an event on the left, then export it to your calendar.');
}

function board() {
  main.innerHTML=pageHead('Small gestures. Real connections.','The neighbor board.','A place for a helping hand, a good idea, or something worth sharing.')+`<div class="notice"><strong>Your personal board prototype.</strong> Posts are saved on this device only. They are not published or sent to neighbors. Use it to draft and organize community ideas.</div><div class="two-col"><form id="post-form" class="panel"><h2>Start with a hello.</h2><div class="form-row"><label for="post-type">What would you like to share?</label><select id="post-type" name="type">${options(['Offer','Request','Lost & found','Idea'])}</select></div><div class="form-row"><label for="post-area">Neighborhood</label><select id="post-area" name="area">${options(areas.slice(1))}</select></div><div class="form-row"><label for="post-title">A short title</label><input id="post-title" name="title" maxlength="80" required placeholder="Extra seedlings for a neighbor"></div><div class="form-row"><label for="post-body">Tell us a little more</label><textarea id="post-body" name="body" maxlength="500" required placeholder="Share your idea, what you can offer, or where you could use a hand…"></textarea><small>Skip private addresses and contact details. Maximum 500 characters.</small></div><button class="btn primary" type="submit">Save my post +</button></form><section><div class="board-toolbar"><div class="chips" aria-label="Filter board posts">${['All','Offer','Request','Lost & found','Idea'].map(c=>`<button class="chip ${c===boardType?'active':''}" data-board-filter="${e(c)}" aria-pressed="${c===boardType}">${c}</button>`).join('')}</div></div><div id="board-posts" class="post-list"></div></section></div>`;
  renderPosts();
}
function renderPosts() {
  const list=state.posts.filter(p=>boardType==='All'||p.type===boardType);
  document.querySelector('#board-posts').innerHTML=list.length?list.map(p=>`<article class="post"><div class="post-meta"><span>${e(p.type)} · ${e(p.area)}</span><span>My post</span></div><h3>${e(p.title)}</h3><p>${e(p.body)}</p><div class="post-foot"><span>Saved locally · ${Number.isNaN(new Date(p.date).valueOf())?'':e(new Date(p.date).toLocaleDateString())}</span><button data-delete-post="${e(p.id)}">Remove post</button></div></article>`).join(''):empty('Every connection starts somewhere.',boardType==='All'?'Write your first post. Your ideas will be waiting here when you return.':'No posts in this category yet.');
}

function planner() {
  main.innerHTML=pageHead('Less searching. More getting out there.','A good day, your way.','Build a little Peninsula itinerary. Add places from Explore or let us suggest a starting point.')+`<div class="two-col"><form id="plan-form" class="panel"><h2>What’s your kind of day?</h2><p>A few local stops, with 20 minutes between them as a rough travel allowance.</p><div class="form-row"><label for="plan-area">Stay in the neighborhood</label><select id="plan-area" name="area">${options(areas)}</select></div><div class="form-row"><label for="plan-category">I’m in the mood for…</label><select id="plan-category" name="category">${options(categories)}</select></div><div class="form-row"><label for="plan-time">Time to spend</label><select id="plan-time" name="minutes"><option value="120">A couple of hours</option><option value="180" selected>A free afternoon · 3 hours</option><option value="300">Make a day of it · 5 hours</option></select></div><button class="btn primary" type="submit">${state.plan.length?'Replace with a suggested day':'Suggest my day'} ${icon('arrow')}</button><p style="margin:14px 0 0">Suggestions use the curated directory. Hours, travel times, and access are not live.</p></form><section id="itinerary" aria-live="polite"></section></div><section class="section"><div class="section-head"><div><p class="kicker">Your little collection</p><h2>Saved for another day.</h2></div><a class="text-link" href="#explore">Find more places →</a></div><div class="cards">${state.saved.length?state.saved.map(id=>placeCard(places.find(p=>p.id===id))).join(''):empty('Keep a few favorites close.','Tap the heart on any place to save it for later.','<a class="btn primary" href="#explore">Explore places →</a>')}</div></section>`;
  renderPlan();
}
function renderPlan() {
  const box=document.querySelector('#itinerary');
  if(!state.plan.length){box.innerHTML=empty('Your next little adventure starts here.','Choose a mood and a neighborhood, or add a place from Explore.');return;}
  box.innerHTML=`<div class="plan-summary"><div><strong>${state.plan.length} ${state.plan.length===1?'stop':'stops'} · ${Math.round(planMinutes(state.plan,places)/60*10)/10} ${planMinutes(state.plan,places)===60?'hour':'hours'}</strong><p>Approximate visit time + travel allowance</p></div><button class="btn small" data-export-plan>Save itinerary ↓</button></div>${state.plan.map((id,i)=>{const p=places.find(p=>p.id===id);return `<article class="plan-item"><span class="step">${i+1}</span><div><h3>${e(p.name)}</h3><p>${e(p.area)} · About ${p.duration} min</p><button class="link-button" data-detail="${p.id}">Details & official information ↗</button></div><div class="plan-controls"><button data-move="${p.id}" data-direction="-1" aria-label="Move ${e(p.name)} earlier" ${i===0?'disabled':''}>↑</button><button data-move="${p.id}" data-direction="1" aria-label="Move ${e(p.name)} later" ${i===state.plan.length-1?'disabled':''}>↓</button><button data-remove-plan="${p.id}" aria-label="Remove ${e(p.name)}">×</button></div></article>`;}).join('')}<div class="notice">Check opening hours and current access with each official source. The travel allowance is a planning estimate.</div>`;
}

function resources() {
  main.innerHTML=pageHead('Good information makes a good neighbor','Your local starting points.','Official sources for the information in this project, and useful links for daily life on the Peninsula.')+`<div class="resource-list">${Object.values(sources).map(s=>`<a class="resource" href="${s.url}" target="_blank" rel="noopener noreferrer"><div><h3>${s.name}</h3><p>${new URL(s.url).hostname}</p></div><span aria-label="Opens in a new tab">↗</span></a>`).join('')}</div><div class="notice" style="margin-top:25px">This is an independent hackathon project, unaffiliated with the cities or organizations listed. Directory content was curated on October 17, 2026. Use official sources for current schedules, closures, and service details.</div><section class="panel"><h2>Your data stays with you.</h2><p>Saved places, your itinerary, board posts, and personal events are stored in this browser. There is no shared community database or account. Export a backup to keep a copy.</p><div class="actions"><button data-backup>Export my data ↓</button><button data-restore>Import a backup ↑</button><input type="file" id="backup-file" accept="application/json,.json" hidden></div><p style="margin-top:16px">Import merges valid records with your current data. Device time zone is used for personal events. External websites have their own privacy policies; this app loads no third-party resources.</p></section>`;
}

function showDetail(id) {
  const p=places.find(p=>p.id===id); if(!p)return;
  const source=sources[p.source];
  document.querySelector('#detail-content').innerHTML=`<div class="detail-icon">${icon(p.icon)}</div><p class="kicker" style="margin-top:22px">${e(p.area)} · ${e(p.category)}</p><h2>${e(p.name)}</h2><p>${e(p.detail)}</p><div class="tags" style="margin-top:20px"><span>Suggested visit: ${p.duration} min</span><span>Check current access</span></div><div class="actions"><button class="btn primary" data-add-plan="${p.id}">${state.plan.includes(p.id)?'Added to my day ✓':'Add to my day +'}</button>${external(source.url,'Official information')}</div><p class="source">Source: <a href="${source.url}" target="_blank" rel="noopener noreferrer">${e(source.name)}</a></p>`;
  if(!dialog.open)dialog.showModal();
}
const routes={home,explore,events,volunteer,board,planner,resources};
function currentRoute(){return location.hash.slice(1)||'home';}
function render() {
  const route=currentRoute();
  (routes[route]||home)();
  document.querySelectorAll('.topbar nav a').forEach(a=>{if(a.hash===`#${route}`)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  updateCount();
  if(!storageOK)main.insertAdjacentHTML('afterbegin','<p class="notice">Browser storage is unavailable. Changes will last for this visit.</p>');
  document.title=`${({home:'A little closer to home',explore:'Explore',events:'What’s on',volunteer:'Give back',board:'Neighbor board',planner:'My day',resources:'Local resources'})[route]||'Discover'} · Peninsula Neighbor`;
}
document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();main.scrollIntoView();});
window.addEventListener('hashchange',()=>{dialog.close();render();window.scrollTo(0,0);main.focus({preventScroll:true});});
document.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b)return;
  if(b.classList.contains('dialog-close')){dialog.close();return;}
  const d=b.dataset;
  if(d.save){state.saved=toggle(state.saved,d.save);persist();b.setAttribute('aria-pressed',state.saved.includes(d.save));const p=places.find(p=>p.id===d.save);b.setAttribute('aria-label',`${state.saved.includes(d.save)?'Unsave':'Save'} ${p.name}`);toast(state.saved.includes(d.save)?'Saved for another day.':'Removed from saved places.');if(currentRoute()==='explore'&&filters.savedOnly)renderPlaces();if(currentRoute()==='planner')planner();}
  if(d.detail)showDetail(d.detail);
  if(d.category){filters.category=d.category;explore();}
  if(d.view){filters.view=d.view;explore();}
  if('resetFilters'in d){filters={query:'',category:'All',area:'All areas',savedOnly:false,view:filters.view};explore();}
  if(d.volunteerFilter){volunteerCategory=d.volunteerFilter;volunteer();}
  if(d.boardFilter){boardType=d.boardFilter;board();}
  if(d.deletePost){state.posts=state.posts.filter(p=>p.id!==d.deletePost);persist();renderPosts();toast('Post removed.');}
  if(d.deleteEvent){state.events=state.events.filter(p=>p.id!==d.deleteEvent);persist();renderEvents();toast('Event removed.');}
  if(d.ics){const entry=state.events.find(p=>p.id===d.ics);if(entry)download('peninsula-event.ics',calendarFile(entry),'text/calendar;charset=utf-8');}
  if(d.addPlan){if(!state.plan.includes(d.addPlan)){state.plan.push(d.addPlan);persist();toast('Added to your day.');}b.textContent='Added to my day ✓';if(currentRoute()==='planner')renderPlan();}
  if(d.removePlan){state.plan=state.plan.filter(id=>id!==d.removePlan);persist();renderPlan();}
  if(d.move){const index=state.plan.indexOf(d.move),next=index+Number(d.direction);if(next>=0&&next<state.plan.length){[state.plan[index],state.plan[next]]=[state.plan[next],state.plan[index]];persist();renderPlan();}}
  if('exportPlan'in d){download('my-peninsula-day.txt',`MY PENINSULA DAY\n\n${state.plan.map((id,i)=>{const p=places.find(p=>p.id===id);return `${i+1}. ${p.name}\n${p.area} · About ${p.duration} minutes\n${p.detail}\n${sources[p.source].url}\n`;}).join('\n')}\nAllow extra time between stops. Check official hours and access before visiting.\nCreated with Peninsula Neighbor.`);toast('Your itinerary is ready to keep.');}
  if('backup'in d)download('peninsula-neighbor-backup.json',JSON.stringify({version:1,...state},null,2),'application/json');
  if('restore'in d)document.querySelector('#backup-file').click();
});
document.addEventListener('input',event=>{if(event.target.id==='place-search'){filters.query=event.target.value;renderPlaces();}});
document.addEventListener('change',async event=>{
  if(event.target.id==='area-filter'){filters.area=event.target.value;renderPlaces();}
  if(event.target.id==='saved-only'){filters.savedOnly=event.target.checked;renderPlaces();}
  if(event.target.id==='backup-file'){
    const file=event.target.files[0];if(!file)return;
    if(file.size>1_000_000){toast('Choose a backup smaller than 1 MB.');return;}
    try{const raw=JSON.parse(await file.text());if(raw.version!==1)throw new Error('Unsupported backup');const imported=normalizeState(raw,places.map(p=>p.id));state=normalizeState({saved:[...state.saved,...imported.saved],plan:[...state.plan,...imported.plan],posts:[...new Map([...state.posts,...imported.posts].map(p=>[p.id,p])).values()],events:[...new Map([...state.events,...imported.events].map(p=>[p.id,p])).values()]},places.map(p=>p.id));persist();toast('Backup imported. Your places and plans are ready.');}catch{toast('Could not read this backup. Choose a Peninsula Neighbor JSON export.');}event.target.value='';
  }
});
document.addEventListener('submit',event=>{
  const form=event.target;if(!['plan-form','post-form','event-form'].includes(form.id))return;event.preventDefault();
  const data=Object.fromEntries(new FormData(form));
  if(form.id==='plan-form'){const generated=makePlan(places,data);if(!generated.length){toast('No stops fit these choices. Try more time or another category.');return;}state.plan=generated;persist();renderPlan();form.querySelector('button[type=submit]').firstChild.textContent='Replace with a suggested day ';toast('A little local adventure, ready to make your own.');}
  if(form.id==='post-form'){if(!data.title.trim()||!data.body.trim()){toast('Add a title and a few words before saving.');return;}if(state.posts.length>=100){toast('Your board is full. Remove a post before adding another.');return;}state.posts.unshift({...data,title:data.title.trim(),body:data.body.trim(),id:crypto.randomUUID(),date:new Date().toISOString()});persist();boardType='All';board();toast('Your post is saved on this device.');}
  if(form.id==='event-form'){if(!data.title.trim()||!data.location.trim()||Number.isNaN(new Date(data.start).valueOf())){toast('Add an event name, valid time, and location.');return;}if(state.events.length>=100){toast('Your calendar is full. Remove an event before adding another.');return;}state.events.push({...data,title:data.title.trim(),location:data.location.trim(),id:crypto.randomUUID()});persist();form.reset();renderEvents();toast('Saved to your personal calendar.');}
});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
render();
