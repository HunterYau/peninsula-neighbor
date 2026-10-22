import type {AskKnowledge} from './ask-pv.ts';
const logistics=[/\bpick[ -]?up\b/i,/\bdrop[ -]?off\b/i,/\bappointments?\b/i,/\breserv(?:ation|ations|e|ed)\b/i,/\b(?:free|no[ -]cost|no charge)\b/i];
const numbers=(text:string)=>new Set((text.replace(/(?<=\d),(?=\d{3}\b)/g,'').match(/\d+(?:\.\d+)?/g)||[]).map(n=>String(Number(n))));
// This is a conservative guard for concrete details, not a general fact checker.
// Account mutations never pass through the model; they require actual action receipts.
export function checkGeneratedAnswer(answer:string,knowledge:AskKnowledge){
 const notes=knowledge.sources.map(s=>[s.title,s.text,s.requirements,s.schedule,s.area,s.checked].filter(Boolean).join(' ')).join('\n'),citations=[...answer.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1])),plain=answer.replace(/\[\d+\]/g,''),knownNumbers=numbers(notes);
 const unsupported=!citations.length||citations.some(n=>n<1||n>knowledge.sources.length)||logistics.some(pattern=>pattern.test(plain)&&!pattern.test(notes))||[...numbers(plain)].some(n=>!knownNumbers.has(n))||[...plain.matchAll(/[$€£]\s*\d+(?:[.,]\d+)*/g)].some(m=>!notes.includes(m[0]))||/\bI(?:['’]ve| have)?\s+(?:saved|booked|registered|submitted|reported|verified|sent)\b/i.test(plain)||/https?:\/\//i.test(plain);
 return {content:unsupported?knowledge.answer:answer,grounded:!unsupported};
}
