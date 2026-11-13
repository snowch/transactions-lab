import {benches} from './benchmarks.js';
for(const el of document.querySelectorAll('.implementation-bench')) {
  const id=el.dataset.bench,source=el.querySelector('.implementation-code'),status=el.querySelector('.implementation-status');
  const test=el.querySelector('.test-implementation'),stop=el.querySelector('.stop-implementation');
  let worker,timer,submitted=null,results=null;
  const storageKey=`txlab:implementation:${id}`;
  try{const saved=localStorage.getItem(storageKey);if(saved!==null){source.value=saved;status.textContent='Your saved implementation is restored. Run checks to produce fresh evidence.';}}catch{}
  const end=()=>{clearTimeout(timer);worker?.terminate();worker=null;test.disabled=false;stop.disabled=true;};
  const invalidate=()=>{end();submitted=null;results=null;el.querySelector('.implementation-results').replaceChildren();status.textContent='Code changed. Test this implementation to collect new evidence.';};
  test.addEventListener('click',()=>{
    end();submitted=source.value;results=null;test.disabled=true;stop.disabled=false;
    el.querySelector('.implementation-results').replaceChildren();status.textContent='Running your implementation in a worker…';
    worker=new Worker(new URL('./bench-worker.js',import.meta.url),{type:'module'});
    const job=worker;
    worker.onmessage=({data})=>{
      if(worker!==job)return;
      end();
      if(data.error){status.textContent=`Cannot test: ${data.error}`;return;}
      results=data.results;
      status.textContent=`${results.filter(r=>r.pass).length} / ${results.length} cases passed${results.some(r=>!r.pass)?' · inspect the failing inputs and revise your algorithm.':' · explain why the rule handles each case.'}`;
      for(const item of results){const li=document.createElement('li');li.className=item.pass?'pass':'fail';const title=document.createElement('strong');title.textContent=`${item.pass?'PASS':'FAIL'} · ${item.name}`;const evidence=document.createElement('pre');evidence.textContent=JSON.stringify({input:item.input,expected:item.expected,...(item.error?{error:item.error}:{actual:item.actual}),...(item.mutated?{problem:'Input was mutated'}:{})},null,2);li.append(title,evidence);el.querySelector('.implementation-results').append(li);}
    };
    worker.onerror=event=>{if(worker!==job)return;end();status.textContent=`Implementation failed: ${event.message}`;};
    timer=setTimeout(()=>{end();status.textContent='Stopped after 2 seconds. Check for a loop that cannot finish, edit, and retry.';},2000);
    worker.postMessage({id,source:submitted});
  });
  stop.addEventListener('click',()=>{end();status.textContent='Stopped. Edit the algorithm and test again.';});
  source.addEventListener('input',()=>{invalidate();try{localStorage.setItem(storageKey,source.value);status.textContent='Code changed and saved on this device. Test to collect new evidence.';}catch{status.textContent='Code changed. Storage is unavailable; download your implementation before leaving.';}});
  el.querySelector('.restore-implementation').addEventListener('click',()=>{source.value=benches[id].starter;invalidate();try{localStorage.removeItem(storageKey);}catch{}});
  el.querySelector('.download-implementation').addEventListener('click',()=>{
    const url=URL.createObjectURL(new Blob([`export default ${source.value}\n`],{type:'text/javascript'}));const a=document.createElement('a');a.href=url;a.download=`${id}-implementation.mjs`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  el.evidence=()=>({id,revision:__BUILD_REVISION__,source:source.value,testedSource:submitted,results,status:status.textContent,created:new Date().toISOString()});
}
