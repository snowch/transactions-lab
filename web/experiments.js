import {renderDiagram} from './diagrams.js';
import {renderInternals} from './internals-view.js';
import {definitions,runModel,recoverModel} from './models.js';
const page=document.body.dataset.page;
const revision=__BUILD_REVISION__;
const records=[];
const save=(value,name,type='application/json')=>{const url=URL.createObjectURL(new Blob([type==='application/json'?JSON.stringify(value,null,2):value],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
for(const el of document.querySelectorAll('.experiment')){
  const id=el.dataset.model,config=el.querySelector('.config'),preset=el.querySelector('.preset'),status=el.querySelector('.model-status');
  let run=null,cursor=-1,recovery=null,submitted='',history=[];
  const invalidate=()=>{run=null;cursor=-1;recovery=null;submitted='';el.querySelector('.trace').replaceChildren();el.querySelector('.model-state').textContent='No execution yet.';el.querySelector('.checks').replaceChildren();el.querySelector('.internals-view').replaceChildren();el.querySelector('.mechanism-visual').replaceChildren();el.querySelector('.mechanism-visual').hidden=true;el.querySelector('.export-run').disabled=true;status.textContent='Settings changed. Make a prediction, then run the new configuration.';};
  const render=()=>{
    const step=recovery||run.steps[cursor];
    el.querySelector('.model-state').textContent=JSON.stringify(step.state,null,2);
    renderDiagram(el.querySelector('.mechanism-visual'),id,step.state,run.input);
    renderInternals(el.querySelector('.internals-view'),id,step.state);
    const list=el.querySelector('.checks');list.replaceChildren();
    for(const check of step.checks){const li=document.createElement('li');li.className=check.pass===null?'pending':check.pass?'pass':'fail';li.textContent=`${check.pass===null?'Pending':check.pass?'PASS':'FAIL'} · ${check.name}`;list.append(li);}
    status.textContent=recovery?recovery.label:`Step ${cursor} of ${run.steps.length-1} · ${step.label}`;
    const trace=el.querySelector('.trace');trace.replaceChildren();
    for(const [i,item] of run.steps.slice(0,cursor+1).entries()){const li=document.createElement('li');const button=document.createElement('button');button.type='button';button.textContent=`${i}. ${item.label}`;button.setAttribute('aria-current',String(i===cursor&&!recovery));button.addEventListener('click',()=>{cursor=i;recovery=null;render();});li.append(button);trace.append(li);}
    trace.scrollTop=trace.scrollHeight;
    el.querySelector('.export-run').disabled=false;
  };
  const execute=toEnd=>{
    try{
      if(!run||submitted!==config.value){const input=JSON.parse(config.value);run={...runModel(id,input),input};cursor=0;submitted=config.value;}
      else cursor=Math.min(cursor+1,run.steps.length-1);
      recovery=null;if(toEnd)cursor=run.steps.length-1;render();
    }catch(error){status.textContent=`Cannot run: ${error.message}`;}
  };
  const evidence=()=>run?{schema:1,revision,model:id,scenario:preset.value,input:run.input,boundary:definitions[id].boundary,trace:run.steps.slice(0,cursor+1),recovery,recoveryAttempts:history,created:new Date().toISOString()}:null;
  el.querySelector('.step').addEventListener('click',()=>execute(false));
  el.querySelector('.run-model').addEventListener('click',()=>execute(true));
  el.querySelector('.crash')?.addEventListener('click',()=>{try{if(!run)execute(false);if(!run)return;recovery=recoverModel(id,(recovery||run.steps[cursor]).state);history.push({atStep:cursor,...structuredClone(recovery)});render();}catch(error){status.textContent=error.message;}});
  const preview=()=>{try{const input=JSON.parse(config.value),initial=runModel(id,input).steps[0];renderDiagram(el.querySelector('.mechanism-visual'),id,initial.state,input);}catch{}};
  const restore=()=>{config.value=JSON.stringify(definitions[id].presets[preset.value],null,2);history=[];invalidate();preview();};
  preset.addEventListener('change',restore);el.querySelector('.reset-model').addEventListener('click',restore);
  config.addEventListener('input',()=>{history=[];invalidate();});
  el.querySelector('.export-run').addEventListener('click',()=>{const record=evidence();records.push(record);save(record,`${page}-${preset.value}-run.json`);});
  el.evidence=evidence;
  preview();
}
const notes=[...document.querySelectorAll('[data-note]')];
let storageAvailable=true;
const noteStatus=document.querySelector('.note-status');
for(const input of notes){
  const key=`txlab:v1:${page}:${input.dataset.note}`;
  try{const stored=localStorage.getItem(key);if(stored!==null){if(input.type==='checkbox')input.checked=stored==='true';else input.value=stored;}}
  catch{storageAvailable=false;}
  input.addEventListener('input',()=>{try{localStorage.setItem(key,input.type==='checkbox'?String(input.checked):input.value);noteStatus.textContent='Draft saved on this device. Download to keep a separate copy.';}catch{storageAvailable=false;noteStatus.textContent='Browser storage is unavailable. Download your record before leaving.';}});
}
if(noteStatus&&!storageAvailable)noteStatus.textContent='Browser storage is unavailable. Download your record before leaving.';
const notebook=()=>({schema:1,revision,chapter:page,created:new Date().toISOString(),notes:Object.fromEntries(notes.map(input=>[input.dataset.note,input.type==='checkbox'?input.checked:input.value])),implementations:[...document.querySelectorAll('.implementation-bench')].map(el=>el.evidence?.()).filter(Boolean),sql:[...document.querySelectorAll('.sql-cell')].map(cell=>({source:cell.querySelector('textarea').value,output:cell.querySelector('.result').textContent,executedSource:cell.dataset.executed||null,execution:cell.dataset.execution||null,outcome:cell.dataset.outcome||null})),runs:[...records,...[...document.querySelectorAll('.experiment')].map(el=>el.evidence()).filter(Boolean)]});
document.querySelector('#download-notes')?.addEventListener('click',()=>{const book=notebook();save(`# Transaction design record: ${page}\n\n${Object.entries(book.notes).map(([key,value])=>`## ${key}\n\n${value}`).join('\n\n')}\n`,`${page}-design.md`,'text/markdown');});
document.querySelector('#download-evidence')?.addEventListener('click',()=>save(notebook(),`${page}-notebook.json`));
