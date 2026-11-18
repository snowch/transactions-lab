// Readable views of engine state. All cell content is assigned as text.
export function renderInternals(container,id,s) {
  container.replaceChildren();
  const text=value=>value===null?'—':typeof value==='object'?JSON.stringify(value):String(value);
  function table(title,headings,rows) {
    const heading=document.createElement('h3');heading.textContent=title;
    const scroll=document.createElement('div');scroll.className='table-scroll';scroll.tabIndex=0;
    const table=document.createElement('table'),head=table.createTHead().insertRow();
    for(const name of headings){const th=document.createElement('th');th.textContent=name;head.append(th);}
    const body=table.createTBody();
    for(const row of rows){const tr=body.insertRow();for(const value of row)tr.insertCell().textContent=text(value);}
    scroll.append(table);container.append(heading,scroll);return scroll;
  }
  if(id==='transaction-manager'){
    table('Transaction descriptor and publication',['Status','Private writes','Public map'],[[s.status,s.privateWrites,s.public]]);
    table('Reader observations retained across commit or abort',['Observation','Alice','Bob','Total'],s.observations.map((values,i)=>[i+1,values.alice,values.bob,values.alice+values.bob]));
  }
  if(id==='mvcc'){
    table('Physical tuple versions',['Version','Value','Creator xmin','Superseder xmax'],s.versions.map(v=>[v.id,v.value,v.xmin,v.xmax]));
    table('Snapshot and transaction status',['Pinned snapshot','Current transaction statuses','Observed values'],[[s.snapshot,s.statuses,s.reads.map(r=>r.value)]]);
  }
  if(id==='lock-manager'){
    table('Lock table and FIFO queues',['Resource','Granted owners','Waiting requests'],Object.entries(s.locks).map(([key,l])=>[key,l.holders,l.queue]));
    table('Wait-for edges',['Waiting transaction','Blocked by'],Object.entries(s.waitFor).map(([key,owners])=>[key,owners]));
  }
  if(id==='validation'){
    table('Recorded dependencies',['Transaction','Status','Read versions','Private writes'],Object.entries(s.transactions).map(([tx,t])=>[tx,t.status,t.reads,t.writes]));
    table('Committed version store',['Key','Value','Version'],Object.entries(s.rows).map(([key,r])=>[key,r.value,r.version]));
  }
  if(id==='recovery-engine'){
    table('Buffer pool versus data pages',['Page','Buffered value','Disk value','Disk pageLSN','First dirty recLSN'],Object.keys(s.disk).map(key=>[key,s.buffer[key]?.value,s.disk[key].value,s.disk[key].pageLSN,s.buffer[key]?.recLSN??null]));
    table(`Log records · flushed through LSN ${s.flushedLSN}`,['LSN','Type','Page','Before → after','prevLSN','Durable'],s.log.map(r=>[r.lsn,r.type,r.page??null,r.type==='UPDATE'?`${r.before} → ${r.after}`:'—',r.prevLSN??null,r.lsn<=s.flushedLSN?'yes':'buffered']));
    if(s.analysis){
      table('Recovery analysis',['Winners','Losers','Redo start','First dirty LSN by page'],[[s.analysis.winners,s.analysis.losers,s.analysis.redoStartLSN,s.analysis.dirtyPageTable]]);
      table('Redo decisions',['LSN','Page','Action'],s.redo.map(item=>[item.lsn,item.page,item.applied?'Applied':'Skipped']));
      table('Undo decisions',['LSN','Page','Restored value'],s.undo.map(item=>[item.lsn,item.page,item.restored]));
    }
  }
  if(id==='aries'){
    table(`ARIES restart ${s.pass} · ${s.phase}`,['Page','Buffered value / LSN','Disk value / LSN'],Object.keys(s.disk).map(p=>[p,`${s.buffer[p].value} @ ${s.buffer[p].pageLSN}`,`${s.disk[p].value} @ ${s.disk[p].pageLSN}`]));
    table('Transaction table and highest-LSN undo frontier',['Transaction','Status','lastLSN','ToUndo'],Object.entries(s.transactionTable).map(([tx,t])=>[tx,t.status,t.lastLSN,s.toUndo[tx]??null]));
    table('Dirty-page table',['Page','recLSN'],Object.entries(s.dirtyPageTable));
    const log=table(`UPDATEs and redo-only CLRs · durable through ${s.flushedLSN}`,['LSN','Type / tx','Page / delta','prevLSN','undoNextLSN','Compensates','Durable'],s.log.map(r=>[r.lsn,`${r.type}${r.tx?' / '+r.tx:''}`,r.page?`${r.page} / ${r.delta}`:'—',r.prevLSN??null,r.undoNextLSN??null,r.compensates??null,r.lsn<=s.flushedLSN?'yes':'buffered']));
    log.scrollTop=log.scrollHeight;
  }
  if(id==='replicated-log'){
    table('Replica logs and protocol state',['Node','Live / role','Term','Commit index','Log: index @ term command'],Object.entries(s.nodes).map(([name,n])=>[name,`${n.live?'live':'down'} / ${n.role}`,n.term,n.commitIndex,n.log.map(e=>`${e.index}@${e.term} ${e.command}`).join(' · ')]));
    if(s.votes.length)table('Election votes',['Voter'],s.votes.map(voter=>[voter]));
    if(s.rpc)table('Latest AppendEntries response',['Follower','Previous index','Response'],[[s.rpc.to,s.rpc.prevIndex,s.rpc.result]]);
  }
}
