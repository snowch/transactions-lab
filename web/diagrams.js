import {visible,hasCycle} from './mechanisms.js';

// Pure diagram data: presentation reads model state but never changes its transitions.
export function diagramSpec(id,s,input={}) {
  if(id==='transaction-manager')return {kind:'flow',title:'Private work → public state',summary:`Transaction ${s.status}. Tentative values and public values are separate stores.`,nodes:[{title:'Private write set',lines:Object.entries(s.privateWrites).map(([k,v])=>`${k}: ${v}`),empty:'No staged writes'},{title:`Transaction: ${s.status}`,lines:[s.status==='committed'?'Complete write set published':s.status==='aborted'?'Tentative work discarded':'Publication has not committed']},{title:'Public state',lines:Object.entries(s.public).map(([k,v])=>`${k}: ${v}`),tone:'selected'}]};
  if(id==='mvcc') {
    const snapshot=s.reader===null?null:input.isolation==='read-committed'?{self:s.reader,xmax:s.nextXid,active:Object.keys(s.statuses).map(Number).filter(x=>x!==s.reader&&s.statuses[x]==='active')}:s.snapshot;
    const versions=s.versions.map(v=>({...v,selected:snapshot?visible(v,snapshot,s.statuses):false,creator:s.statuses[v.xmin]||'unknown',deleter:v.xmax===null?'none':s.statuses[v.xmax]||'unknown'}));
    return {kind:'versions',title:'Which tuple does this snapshot see?',snapshot,view:input.isolation==='read-committed'?'Fresh statement view if read now':'Pinned transaction view',versions,removed:s.vacuumRemoved,summary:snapshot?`${input.isolation==='read-committed'?'A fresh statement now':'The pinned snapshot'} can read ${versions.filter(v=>v.selected).map(v=>v.value).join(', ')||'no retained tuple'}.`:'Begin the reader to capture its snapshot.'};
  }
  if(['lock-manager','locks','write-skew'].includes(id)) {
    const graph=id==='write-skew'?(s.rejectedDependencies||s.dependencies):id==='locks'?Object.fromEntries(Object.entries(s.waiting).map(([a,b])=>[a,[b]])):s.waitFor;
    const edges=Object.entries(graph).flatMap(([from,owners])=>owners.map(to=>({from,to})));
    const rejected=id==='write-skew'&&Boolean(s.rejectedDependencies),cyclic=hasCycle(graph);
    const nodes=['A','B'].map(name=>({id:name,label:`Tx ${name}`,status:id==='lock-manager'?s.transactions[name]:id==='write-skew'?s.aborts.includes(name)?'aborted':s.commits.includes(name)?'committed':'active':s.committed.includes(name)?'committed':'active'}));
    const ownership=id==='lock-manager'?Object.entries(s.locks).map(([key,l])=>`${key}: ${Object.entries(l.holders).map(([tx,mode])=>`${tx} (${mode})`).join(', ')||'unowned'}`):id==='locks'?Object.entries(s.locks).map(([key,tx])=>`${key}: ${tx}`):[];
    return {kind:'graph',title:id==='write-skew'?(rejected?'Rejected read/write dependency graph':'Read/write dependency graph'):'Wait-for graph',summary:edges.length?`${edges.map(e=>`${e.from} → ${e.to}`).join('; ')}. ${cyclic?(rejected?'Cycle rejected before publication.':'A cycle is present.'):'No cycle.'}`:'No dependency edges at this step.',nodes,edges,cyclic,rejected,ownership,edgeMeaning:id==='write-skew'?'Arrow: reader of an old version → transaction overwriting that version':'Arrow: waiting transaction → blocking owner or earlier incompatible request'};
  }
  if(id==='validation')return {kind:'validation',title:'Read versions → commit validation',summary:s.validationChecks.length?`${s.validationChecks.at(-1).tx}: ${input.validation} validation ${s.validationChecks.at(-1).valid?'passed':'failed'} at its commit attempt.`:'Reads collect version dependencies; writes remain private until validated.',transactions:Object.entries(s.transactions).map(([tx,t])=>({tx,status:t.status,reads:t.reads,writes:t.writes})),latest:s.validationChecks.at(-1)||null};
  if(id==='recovery-engine')return {kind:'storage',title:'WAL barrier: log before data page',summary:`Log durable through LSN ${s.flushedLSN}. ${Object.entries(s.disk).filter(([,p])=>p.pageLSN>s.flushedLSN).map(([name])=>`${name} is ahead of its durable log.`).join(' ')||'Persisted page LSNs are covered by the log.'}`,flushed:s.flushedLSN,records:s.log.map(r=>({...r,durable:r.lsn<=s.flushedLSN})),pages:Object.entries(s.disk).map(([name,page])=>({name,disk:page,buffer:s.buffer[name],unsafe:page.pageLSN>s.flushedLSN}))};
  if(id==='wal')return {kind:'flow',title:'Recovery information → commit decision → data pages',summary:`After-images ${s.logDurable?'durable':'not durable'}; commit marker ${s.commitDurable?'durable':'not durable'}.`,nodes:[{title:'Log after-images',lines:s.log?Object.entries(s.log).map(([k,v])=>`${k}: ${v}`):['Not recorded'],tone:s.logDurable?'selected':'neutral'},{title:'COMMIT marker',lines:[s.commitDurable?'Durable':'Not durable',s.acknowledged?'Caller acknowledged':'No acknowledgement'],tone:s.commitDurable?'selected':'neutral'},{title:'Disk pages now',lines:Object.entries(s.disk).map(([k,v])=>`${k}: ${v}`)}]};
  if(id==='aries') {
    const clr=[...s.log].reverse().find(r=>r.type==='CLR')||null;
    const find=lsn=>s.log.find(r=>r.lsn===lsn)||null;
    return {kind:'aries',title:clr?'A CLR has two different links':'Analysis → redo → undo',summary:clr?`CLR ${clr.lsn} ${clr.lsn<=s.flushedLSN?'is durable':'is buffered and can be lost'}. ${s.undoLink==='undoNextLSN'?'Undo follows its skip pointer.':'The faulty policy follows its transaction-order pointer.'}`:`Recovery phase: ${s.phase}. ${Object.keys(s.toUndo).length?'The highest pending LSN is selected next.':'No loser undo frontier is active yet.'}`,phase:s.phase,frontier:s.toUndo,clr,previous:clr?find(clr.prevLSN):null,next:clr?find(clr.undoNextLSN):null,compensated:clr?find(clr.compensates):null,link:s.undoLink,flushed:s.flushedLSN};
  }
  if(id==='replicated-log')return {kind:'replicas',title:'Replicated entries and committed prefixes',summary:`Current leader reference: ${s.leader}. Entries marked committed belong to that node's commitIndex prefix.`,nodes:Object.entries(s.nodes).map(([name,n])=>({name,...n,entries:n.log.map(e=>({...e,committed:e.index<=n.commitIndex}))})),rpc:s.rpc};
  if(id==='two-phase')return {kind:'two-phase',title:'One durable decision; separate participant knowledge',summary:`Coordinator ${s.coordinator}; durable decision ${s.durableDecision||'not recorded'}. ${s.progress==='blocked'?'B retains its prepared promise while waiting.':''}`,coordinator:s.coordinator,decision:s.durableDecision,participants:['A','B'].map(name=>({name,status:s[name],held:s.heldResources[name],records:s.stableLogs[name].map(r=>r.type),delivered:s.messages.some(m=>m.from==='coordinator'&&m.to===name)}))};
  if(id==='files')return {kind:'flow',title:'Visible namespace and durable state are separate',summary:`Visible target: ${s.visible}; durable target name: ${s.durableName}.`,nodes:[{title:'Buffered contents',lines:[s.bufferedTemp]},{title:'Visible target',lines:[s.visible,s.acknowledged?'Acknowledged':'Not acknowledged'],tone:'selected'},{title:'Durable replacement',lines:[`Name: ${s.durableName}`,`New file contents: ${s.durableTemp}`]}]};
  if(id==='outbox')return {kind:'flow',title:'Local commit → durable intent → relay',summary:`Order ${s.order}; ${s.published} publication(s). ${s.outbox?'A durable outbox intent exists.':'No outbox intent exists.'}`,nodes:[{title:'Order database',lines:[s.order]},{title:'Outbox intent',lines:[s.outbox?'Present in local transaction':'Absent'],tone:s.outbox?'selected':s.order==='paid'?'danger':'neutral'},{title:'Broker publication',lines:[String(s.published),s.relayAcknowledged?'Relay progress recorded':'Relay progress not recorded']} ]};
  return null;
}

const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=String(text);return node;};
const ns='http://www.w3.org/2000/svg';
const svgEl=(tag,attrs={},text)=>{const node=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attrs))node.setAttribute(key,String(value));if(text!==undefined)node.textContent=String(text);return node;};
let serial=0;
function canvas(host,title,summary,height=220) {
  const scroll=el('div','diagram-scroll');scroll.tabIndex=0;scroll.setAttribute('aria-label',`${title}; diagram scroll area`);
  const svg=svgEl('svg',{viewBox:`0 0 360 ${height}`,role:'img',class:'diagram-svg'});
  svg.append(svgEl('title',{},title),svgEl('desc',{},summary));
  const markerId=`diagram-arrow-${++serial}`,defs=svgEl('defs'),marker=svgEl('marker',{id:markerId,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:7,markerHeight:7,orient:'auto-start-reverse'});
  marker.append(svgEl('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'context-stroke'}));defs.append(marker);svg.append(defs);scroll.append(svg);host.append(scroll);
  return {svg,arrow:(d,tone='')=>{const path=svgEl('path',{d,fill:'none','marker-end':`url(#${markerId})`,class:`diagram-edge ${tone}`});svg.append(path);return path;}};
}
function box(svg,x,y,w,h,title,subtitle,tone='') {
  const group=svgEl('g',{class:`diagram-node ${tone}`});
  group.append(svgEl('rect',{x,y,width:w,height:h,rx:8}),svgEl('text',{x:x+w/2,y:y+25,'text-anchor':'middle',class:'node-title'},title));
  if(subtitle)group.append(svgEl('text',{x:x+w/2,y:y+47,'text-anchor':'middle',class:'node-detail'},subtitle));
  svg.append(group);return group;
}
function flow(host,nodes) {
  const list=el('ol','diagram-flow');
  for(const node of nodes){const li=el('li',`diagram-block ${node.tone||''}`);li.append(el('h4','',node.title));for(const line of node.lines.length?node.lines:[node.empty||'—'])li.append(el('p','',line));list.append(li);}
  host.append(list);
}
export function renderDiagram(container,id,state,input={}) {
  container.replaceChildren();
  const spec=diagramSpec(id,state,input);container.hidden=!spec;
  if(!spec)return;
  const figure=el('figure','mechanism-figure'),caption=el('figcaption');caption.append(el('h3','',spec.title));figure.append(caption);
  const summary=el('p','diagram-summary',spec.summary);summary.setAttribute('role','status');figure.append(summary);
  const body=el('div','diagram-body');figure.append(body);container.append(figure);
  if(spec.kind==='flow')flow(body,spec.nodes);
  if(spec.kind==='versions') {
    if(spec.snapshot)flow(body,[{title:spec.view,lines:[`Reader T${spec.snapshot.self} · upper bound ${spec.snapshot.xmax}`,`Active at capture: ${spec.snapshot.active.join(', ')||'none'}`]}]);
    const chain=el('ol','version-chain');
    for(const [i,v] of spec.versions.entries()){
      const item=el('li',`version-node ${v.selected?'selected':''}`);item.dataset.version=v.id;item.dataset.visible=String(v.selected);
      item.append(el('span','version-position',i?'Newer version':'Oldest retained version'),el('strong','',`${v.id} · value ${v.value}`),el('span','',`xmin ${v.xmin} (${v.creator}) · xmax ${v.xmax??'—'} (${v.deleter})`),el('span','visibility-label',spec.snapshot?(v.selected?'VISIBLE to this snapshot':'HIDDEN from this snapshot'):'Snapshot not captured'));
      chain.append(item);
    }
    body.append(chain);if(spec.removed.length)body.append(el('p','diagram-note',`Vacuum removed: ${spec.removed.join(', ')}.`));
  }
  if(spec.kind==='graph') {
    const {svg,arrow}=canvas(body,spec.title,spec.summary);
    const a=spec.nodes[0],b=spec.nodes[1];
    if(spec.edges.some(e=>e.from==='A'&&e.to==='B'))arrow('M 138 88 Q 180 20 222 88',spec.cyclic?'danger':'');
    if(spec.edges.some(e=>e.from==='B'&&e.to==='A'))arrow('M 222 118 Q 180 182 138 118',spec.cyclic?'danger':'');
    box(svg,34,72,104,62,a.label,a.status,a.status==='aborted'?'muted':'');box(svg,222,72,104,62,b.label,b.status,b.status==='aborted'?'muted':'');
    svg.append(svgEl('text',{x:180,y:205,'text-anchor':'middle',class:'graph-outcome'},spec.cyclic?(spec.rejected?'Cycle rejected':'Cycle detected'):'No cycle'));
    body.append(el('p','diagram-note',spec.edgeMeaning));for(const line of spec.ownership)body.append(el('p','diagram-note',line));
  }
  if(spec.kind==='validation') {
    flow(body,spec.transactions.map(t=>({title:`${t.tx} · ${t.status}`,lines:[`Read set: ${Object.entries(t.reads).map(([k,v])=>`${k}@${v}`).join(', ')||'empty'}`,`Writes: ${Object.entries(t.writes).map(([k,v])=>`${k}=${v}`).join(', ')||'empty'}`]})));
    if(spec.latest){const compare=el('div','version-comparison');
      for(const [key,seen] of Object.entries(spec.latest.tested)){const current=spec.latest.current[key],match=seen===current;const row=el('div',`validation-pair ${match?'matched':'mismatched'}`);row.append(el('strong','',key),el('span','',`observed ${seen} → at validation ${current??'missing'}`),el('span','',match?'MATCH':'CONFLICT'));compare.append(row);}
      body.append(compare);
    }
  }
  if(spec.kind==='storage') {
    const log=el('ol','log-records');
    for(const r of spec.records){const chip=el('li',`log-record ${r.durable?'durable':'buffered'}`);chip.dataset.lsn=r.lsn;chip.dataset.durable=String(r.durable);chip.append(el('strong','',`LSN ${r.lsn}`),el('span','',r.type),el('span','',r.durable?'durable':'buffered'));log.append(chip);}
    body.append(el('h4','diagram-lane-label',`Log · durable prefix ends at ${spec.flushed}`),log);
    body.append(el('p','storage-barrier','↓ WAL permits a page flush only when its pageLSN is covered by the durable log.'));
    for(const page of spec.pages){const row=el('div','page-route');row.append(el('strong','',page.name));const pair=el('div','page-pair');flow(pair,[{title:'Buffer frame',lines:[`Value ${page.buffer.value}`,`pageLSN ${page.buffer.pageLSN}`]},{title:'Disk page',lines:[`Value ${page.disk.value}`,`pageLSN ${page.disk.pageLSN}`],tone:page.unsafe?'danger':'selected'}]);row.append(pair);body.append(row);}
  }
  if(spec.kind==='aries') {
    const phases=el('ol','recovery-phases');for(const name of ['normal','analysis','redo','undo','complete']){const item=el('li',name===spec.phase?'selected':'',name);if(name===spec.phase)item.setAttribute('aria-current','step');phases.append(item);}body.append(phases);
    if(spec.clr){
      const r=spec.clr,{svg,arrow}=canvas(body,`CLR ${r.lsn}: prevLSN and undoNextLSN`,`${spec.summary} prevLSN ${r.prevLSN}; undoNextLSN ${r.undoNextLSN}; compensates UPDATE ${r.compensates}.`,290);
      arrow('M 145 76 Q 80 101 80 164',spec.link==='prevLSN'?'danger':'inactive');
      arrow('M 215 76 Q 280 101 280 164',spec.link==='undoNextLSN'?'selected':'inactive');
      box(svg,104,12,152,66,`CLR ${r.lsn}`,`${r.page}: ${r.delta} · redo-only`,'selected');
      svg.append(svgEl('text',{x:150,y:122,'text-anchor':'middle'},'prevLSN'),svgEl('text',{x:216,y:148,'text-anchor':'middle'},'undoNextLSN'));
      box(svg,6,170,148,64,spec.previous?`${spec.previous.type} ${spec.previous.lsn}`:'End of chain',`Pointer ${r.prevLSN}`,spec.link==='prevLSN'?'danger':'muted');
      box(svg,206,170,148,64,spec.next?`${spec.next.type} ${spec.next.lsn}`:'End of undo',`Pointer ${r.undoNextLSN}`,spec.link==='undoNextLSN'?'selected':'');
      svg.append(svgEl('text',{x:180,y:270,'text-anchor':'middle'},`Compensates original UPDATE ${r.compensates}`));
    }else flow(body,Object.entries(spec.frontier).map(([tx,lsn])=>({title:tx,lines:[`Next undo position: ${lsn}`]})));
  }
  if(spec.kind==='replicas') {
    const lanes=el('div','replica-lanes');
    for(const n of spec.nodes){const row=el('section',`replica-lane ${n.live?'':'unavailable'}`);row.append(el('h4','',`${n.name} · ${n.role}`),el('p','replica-meta',`${n.live?'live':'down'} · term ${n.term} · commitIndex ${n.commitIndex}`));const entries=el('ol','replica-entries');
      for(const e of n.entries){const item=el('li',e.committed?'committed':'uncommitted');item.dataset.index=e.index;item.dataset.committed=String(e.committed);item.append(el('strong','',`${e.index} @ term ${e.term}`),el('span','',e.command),el('span','',e.committed?'COMMITTED':'uncommitted'));entries.append(item);}if(!n.entries.length)entries.append(el('li','empty-log','Empty log'));row.append(entries);lanes.append(row);}
    body.append(lanes);if(spec.rpc)body.append(el('p','diagram-note',`Latest send to ${spec.rpc.to}: ${spec.rpc.result}.`));
  }
  if(spec.kind==='two-phase') {
    const {svg,arrow}=canvas(body,spec.title,spec.summary,290);
    arrow('M 148 84 L 87 175',spec.participants[0].delivered?'selected':'inactive');arrow('M 212 84 L 273 175',spec.participants[1].delivered?'selected':'inactive');
    box(svg,90,14,180,66,'Coordinator',spec.coordinator,spec.coordinator==='unreachable'?'muted':'');
    svg.append(svgEl('text',{x:180,y:145,'text-anchor':'middle'},spec.decision?`Durable ${spec.decision.toUpperCase()}`:'No durable decision'));
    for(const [i,p] of spec.participants.entries()){const x=i?210:10;box(svg,x,184,140,64,`Participant ${p.name}`,p.status,p.status==='committed'?'selected':p.status==='aborted'&&spec.decision==='commit'?'danger':'');svg.append(svgEl('text',{x:x+70,y:274,'text-anchor':'middle'},p.held?'Resources held':'Resources released'));}
    for(const p of spec.participants)body.append(el('p','diagram-note',`${p.name} stable log: ${p.records.join(' → ')||'empty'} · ${p.delivered?'decision received':'no decision received'}`));
  }
}
