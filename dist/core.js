export const STORE_KEY = 'peninsula-neighbor-v1';
export const emptyState = () => ({ saved: [], plan: [], posts: [], events: [] });
export function normalizeState(raw, validIds) {
  const base = emptyState();
  if (!raw || typeof raw !== 'object') return base;
  for (const key of ['saved', 'plan']) base[key] = [...new Set(Array.isArray(raw[key]) ? raw[key].filter(id => validIds.includes(id)) : [])];
  base.posts = (Array.isArray(raw.posts) ? raw.posts : []).filter(p => p && typeof p.id === 'string' && typeof p.title === 'string' && typeof p.body === 'string' && ['Offer', 'Request', 'Lost & found', 'Idea'].includes(p.type) && typeof p.area === 'string').slice(0, 100).map(p => ({id:p.id.slice(0,100), title:p.title.slice(0,80), body:p.body.slice(0,500), type:p.type, area:p.area.slice(0,60), date:typeof p.date === 'string' ? p.date.slice(0,40) : ''}));
  base.events = (Array.isArray(raw.events) ? raw.events : []).filter(e => e && typeof e.id === 'string' && typeof e.title === 'string' && typeof e.location === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(e.start) && !Number.isNaN(new Date(e.start).valueOf())).slice(0,100).map(e => ({id:e.id.slice(0,100), title:e.title.slice(0,80), location:e.location.slice(0,120), start:e.start}));
  return base;
}
export function filterPlaces(places, { query = '', category = 'All', area = 'All areas', savedOnly = false, saved = [] } = {}) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return places.filter(p => (category === 'All' || p.category === category) && (area === 'All areas' || p.area === area) && (!savedOnly || saved.includes(p.id)) && terms.every(term => `${p.name} ${p.description} ${p.area} ${p.category}`.toLocaleLowerCase().includes(term)));
}
export function toggle(items, id) { return items.includes(id) ? items.filter(x => x !== id) : [...items, id]; }
export function makePlan(places, { area = 'All areas', category = 'All', minutes = 180 } = {}) {
  const candidates = filterPlaces(places, { area, category });
  let remaining = Number(minutes);
  const result = [];
  for (const p of candidates) {
    const needed = p.duration + (result.length ? 20 : 0);
    if (needed <= remaining) { result.push(p.id); remaining -= needed; }
    if (result.length === 3) break;
  }
  return result;
}
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const planMinutes = (plan, places) => plan.reduce((n,id) => n + (places.find(p => p.id === id)?.duration || 0), 0) + Math.max(0,plan.length - 1) * 20;
export function calendarFile(event) {
  const esc = text => String(text).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
  const stamp = date => date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  const start = new Date(event.start);
  if (Number.isNaN(start.valueOf())) throw new Error('Invalid event date');
  return ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Peninsula Neighbor//Community Planner//EN','BEGIN:VEVENT',`UID:${esc(event.id)}@peninsula-neighbor`, `DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(start)}`,`DTEND:${stamp(new Date(start.valueOf()+3600000))}`,`SUMMARY:${esc(event.title)}`,`LOCATION:${esc(event.location)}`,'END:VEVENT','END:VCALENDAR',''].join('\r\n');
}
