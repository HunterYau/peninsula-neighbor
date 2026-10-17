import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const bundle=readFileSync(new URL('../dist/bundle.js',import.meta.url),'utf8');
for(const route of ['home','explore','events','volunteer','board','planner','resources']){
  test(`portable bundle renders the ${route} route without a runtime error`,()=>{
    const elements=new Map();
    const element=selector=>{
      if(!elements.has(selector)) elements.set(selector,{innerHTML:'',textContent:'',addEventListener(){},insertAdjacentHTML(){},classList:{add(){},remove(){}}});
      return elements.get(selector);
    };
    const document={querySelector:element,querySelectorAll:()=>[],addEventListener(){},title:''};
    vm.runInNewContext(bundle,{document,location:{hash:`#${route}`},localStorage:{getItem:()=>null},window:{addEventListener(){}},URL,console,setTimeout,clearTimeout});
    assert.ok(element('#main').innerHTML.length>200);
    assert.ok(document.title.includes('Peninsula Neighbor'));
    if(route==='explore')assert.ok(element('#place-results').innerHTML.includes('Malaga Cove Library'));
  });
}
