import test from 'node:test';
import assert from 'node:assert/strict';
import {checkGeneratedAnswer} from '../lib/ask-grounding.ts';
import type {AskKnowledge} from '../lib/ask-pv.ts';
const knowledge:AskKnowledge={question:'How can the library deliver books?',status:'ready',asOf:'2026-10-22T00:00:00Z',answer:'PVLD Books By Mail: Library delivery for homebound residents in ZIP codes 90274 and 90275. [1]',sources:[{id:'mail',title:'PVLD Books By Mail',text:'Library delivery for homebound residents in ZIP codes 90274 and 90275. Eligible residents can apply for mailed books. Contact the library to apply.',requirements:'Review eligibility with the library.',url:'https://www.pvld.org/services/booksbymail',localUrl:'/resources/guide/pvld-books-mail',kind:'resource',area:'Across the Peninsula',checked:'2026-10-20',verification:'Official source checked'}]};
test('observed invented pickup and unsupported concrete details fall back to the retrieved source answer',()=>{
 for(const answer of ['Contact the library to apply and schedule a pickup. [1]','Make an appointment for delivery. [1]','The program costs $20. [1]','Apply from ZIP code 90277. [1]','Use the library. [2]','I have registered you for delivery. [1]','Visit https://invented.test to apply. [1]']){const checked=checkGeneratedAnswer(answer,knowledge);assert.equal(checked.grounded,false,answer);assert.equal(checked.content,knowledge.answer);}
});
test('source-supported paraphrases and supported pickup details remain actual model answers',()=>{
 const answer='Homebound residents in ZIP codes 90274 and 90275 can contact the library to apply for Books By Mail. [1]';assert.deepEqual(checkGeneratedAnswer(answer,knowledge),{content:answer,grounded:true});
 const holds={...knowledge,sources:[{...knowledge.sources[0],text:'Contact the library to arrange pickup of held books.'}]},pickup='Contact the library to arrange pickup. [1]';assert.equal(checkGeneratedAnswer(pickup,holds).grounded,true);
});
