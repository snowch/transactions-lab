// Small executable mechanisms with explicit state. No imports: also runnable in Node.
const copy = value => structuredClone(value);
const check = (name, pass) => ({name, pass});
function choose(config, key, values) {
  if (!values.includes(config[key])) throw Error(`${key} must be ${values.join(' or ')}.`);
}
function program(config) {
  if (!Array.isArray(config.schedule) || config.schedule.length > 80 || config.schedule.some(op => typeof op !== 'string')) throw Error('schedule must be an array of at most 80 operation strings.');
  return config.schedule;
}
function recorder(state, predicates) {
  const steps = [];
  const emit = label => steps.push({label, state:copy(state), checks:predicates(state)});
  emit('Initial state');
  return {emit, finish:() => ({steps})};
}

export function publish(base, writes, status) {
  return status === 'committed' ? {...base, ...writes} : {...base};
}
export function transactionManager(config) {
  choose(config, 'publication', ['each-write','commit']);
  const state = {public:{alice:100,bob:100}, privateWrites:{}, undo:{}, status:'active', observations:[]};
  const trace = recorder(state, s => [check('public state is a complete old or new transfer',
    (s.public.alice===100&&s.public.bob===100)||(s.public.alice===70&&s.public.bob===130))]);
  for (const op of program(config)) {
    const [action,key,text] = op.split(':');
    if (action==='observe') {state.observations.push(copy(state.public)); trace.emit('Another reader samples the public state'); continue;}
    if (state.status!=='active') throw Error('Writes and terminal transitions require an active transaction.');
    if (action==='write') {
      const value=Number(text);
      if (!['alice','bob'].includes(key)||!Number.isSafeInteger(value)||Math.abs(value)>10000) throw Error('Use write:alice:70 or write:bob:130 with a bounded integer.');
      if (!(key in state.undo)) state.undo[key]=state.public[key];
      state.privateWrites[key]=value;
      if (config.publication==='each-write') state.public[key]=value;
      trace.emit(`Stage ${key} = ${value}${config.publication==='each-write'?' and expose it immediately':''}`);
    } else if (action==='commit') {
      state.status='committing'; trace.emit('Enter committing; writes are still staged');
      state.public=publish(state.public,state.privateWrites,'committed');
      state.status='committed'; trace.emit('Publish the complete write set as one state transition');
    } else if (action==='abort') {
      if (config.publication==='each-write') state.public={...state.public,...state.undo};
      state.privateWrites={}; state.status='aborted'; trace.emit('Abort: discard private writes or restore before-images');
    } else throw Error(`Unknown operation ${op}`);
  }
  return trace.finish();
}

// Snapshot membership and transaction status, rather than the wall clock, decide visibility.
export function visible(version, snapshot, statuses) {
  const before = tx => tx===snapshot.self || (tx<snapshot.xmax&&!snapshot.active.includes(tx)&&statuses[tx]==='committed');
  if (!before(version.xmin)) return false;
  return version.xmax===null || !before(version.xmax);
}
export function mvcc(config) {
  choose(config,'isolation',['repeatable-read','read-committed']);
  choose(config,'retention',['latest-only','snapshot-aware']);
  const s={nextXid:1,statuses:{0:'committed'},versions:[{id:'v0',value:100,xmin:0,xmax:null}],reader:null,writer:null,snapshot:null,reads:[],vacuumRemoved:[]};
  const snapshot = self => ({self,xmax:s.nextXid,active:Object.keys(s.statuses).map(Number).filter(x=>x!==self&&s.statuses[x]==='active')});
  const read = snap => s.versions.find(v=>visible(v,snap,s.statuses))?.value??null;
  const t=recorder(s,s=>[check('a pinned repeatable snapshot still has its original visible row',
    config.isolation==='repeatable-read'&&s.snapshot?read(s.snapshot)===s.pinnedValue:null)]);
  for (const op of program(config)) {
    if (op==='begin-reader'||op==='begin-writer') {
      const role=op.slice(6); if(s[role]!==null)throw Error(`${role} already began.`);
      s[role]=s.nextXid++; s.statuses[s[role]]='active';
      if(role==='reader'){s.snapshot=snapshot(s.reader);s.pinnedValue=read(s.snapshot);}
      t.emit(`${role} receives transaction ID ${s[role]}`);
    } else if(op==='write') {
      if(s.writer===null||s.statuses[s.writer]!=='active'||s.versions.some(v=>v.xmin===s.writer))throw Error('Begin one active writer and update only once.');
      const old=s.versions.find(v=>visible(v,snapshot(s.writer),s.statuses));
      if(!old)throw Error('No visible version to update.');
      old.xmax=s.writer;s.versions.push({id:`v${s.writer}`,value:70,xmin:s.writer,xmax:null});
      t.emit('UPDATE marks the old tuple xmax and appends a new xmin tuple');
    } else if(op==='commit-writer'||op==='abort-writer') {
      if(s.writer===null||s.statuses[s.writer]!=='active')throw Error('No active writer.');
      s.statuses[s.writer]=op==='commit-writer'?'committed':'aborted'; t.emit(`${op}: change the transaction-status table`);
    } else if(op==='read-reader') {
      if(s.reader===null)throw Error('Begin the reader first.');
      const snap=config.isolation==='repeatable-read'?s.snapshot:snapshot(s.reader);
      s.reads.push({snapshot:copy(snap),value:read(snap)});t.emit('Apply the tuple visibility predicate');
    } else if(op==='vacuum') {
      const current=snapshot(-1),pins=config.isolation==='repeatable-read'&&s.snapshot?[s.snapshot]:[];
      const keep=v=>s.statuses[v.xmin]==='active'||(config.retention==='latest-only'?visible(v,current,s.statuses):[current,...pins].some(snap=>visible(v,snap,s.statuses)));
      s.vacuumRemoved=s.versions.filter(v=>!keep(v)).map(v=>v.id);s.versions=s.versions.filter(keep);
      t.emit('Vacuum removes versions invisible to the snapshots it protects');
    } else throw Error(`Unknown MVCC operation ${op}`);
  }
  return t.finish();
}

export function compatible(held, requested) { return held==='S'&&requested==='S'; }
export function hasCycle(graph) {
  const visiting=new Set(),finished=new Set();
  function visit(node) {
    if(visiting.has(node))return true;
    if(finished.has(node))return false;
    visiting.add(node);
    if((graph[node]||[]).some(visit))return true;
    visiting.delete(node);finished.add(node);return false;
  }
  return Object.keys(graph).some(visit);
}
export function lockManager(config) {
  choose(config,'deadlock',['ignore','abort-youngest']);
  const s={transactions:{A:'active',B:'active'},locks:{},waitFor:{},victims:[],cycle:false};
  const t=recorder(s,s=>[check('the wait-for graph has no cycle',!s.cycle),check('incompatible locks never have different simultaneous owners',Object.values(s.locks).every(l=>Object.entries(l.holders).every(([a,m])=>Object.entries(l.holders).every(([b,n])=>a===b||compatible(m,n)))))]);
  const blockers=(lock,request)=>Object.entries(lock.holders).filter(([owner,mode])=>owner!==request.tx&&!compatible(mode,request.mode)).map(([owner])=>owner);
  function graph() {
    s.waitFor={};
    for(const lock of Object.values(s.locks))for(const [i,request] of lock.queue.entries()) {
      const ahead=lock.queue.slice(0,i).filter(r=>r.tx!==request.tx&&!compatible(r.mode,request.mode)).map(r=>r.tx);
      s.waitFor[request.tx]=[...new Set([...(s.waitFor[request.tx]||[]),...blockers(lock,request),...ahead])];
    }
    s.cycle=hasCycle(s.waitFor);
  }
  function wake() {
    for(const lock of Object.values(s.locks))while(lock.queue.length&&!blockers(lock,lock.queue[0]).length){const r=lock.queue.shift();lock.holders[r.tx]=r.mode;}
    graph();
  }
  function release(tx,terminal) {
    if(s.transactions[tx]!=='active')throw Error(`${tx} is not active.`);
    s.transactions[tx]=terminal;
    for(const lock of Object.values(s.locks)){delete lock.holders[tx];lock.queue=lock.queue.filter(r=>r.tx!==tx);}
    wake();
  }
  for(const op of program(config)) {
    if(op==='detect') {
      graph();
      if(s.cycle&&config.deadlock==='abort-youngest') {
        // Select a participant in a cycle, not an unrelated waiter downstream of it.
        const inCycle=Object.keys(s.waitFor).filter(tx=>{const reaches=(node,seen=new Set())=>node===tx||(!seen.has(node)&&(seen.add(node),(s.waitFor[node]||[]).some(n=>reaches(n,seen))));return(s.waitFor[tx]||[]).some(n=>reaches(n));});
        const victim=inCycle.sort().at(-1);s.victims.push(victim);release(victim,'aborted');t.emit(`Detector aborts ${victim}; release locks and grant the surviving upgrade`);
      }else t.emit(s.cycle?'Detector finds a cycle; policy leaves it blocked':'Detector finds no cycle');
      continue;
    }
    const [tx,mode,key]=op.split(':');
    if(!['A','B'].includes(tx)||s.transactions[tx]!=='active')throw Error('Use an active A or B transaction.');
    if(mode==='commit'&&Object.values(s.locks).some(l=>l.queue.some(r=>r.tx===tx)))throw Error('A waiting transaction must finish its blocked operation or abort before commit.');
    if(['commit','abort'].includes(mode)){release(tx,mode==='commit'?'committed':'aborted');t.emit(`${tx} ${mode}s and releases all locks`);continue;}
    if(!['S','X'].includes(mode)||!['bike','helmet'].includes(key))throw Error('Use A:S:bike, B:X:helmet, A:commit, or detect.');
    const lock=s.locks[key]??={holders:{},queue:[]};
    if(Object.values(s.locks).some(l=>l.queue.some(r=>r.tx===tx)))throw Error(`${tx} is waiting and cannot issue another operation.`);
    const request={tx,mode};
    if(lock.holders[tx]==='X'||(lock.holders[tx]===mode)){t.emit(`${tx} already owns ${mode} or stronger on ${key}`);continue;}
    if(!lock.queue.length&&!blockers(lock,request).length)lock.holders[tx]=mode;
    else lock.queue.push(request);
    graph();t.emit(`${tx} requests ${mode} on ${key}: ${lock.queue.some(r=>r.tx===tx)?'queued':'granted'}`);
  }
  return t.finish();
}

export function validate(readVersions, currentVersions) {
  return Object.entries(readVersions).every(([key,version])=>currentVersions[key]===version);
}
export function validation(config) {
  choose(config,'validation',['write-set','read-set']);
  const s={rows:{A:{value:true,version:0},B:{value:true,version:0}},clock:0,transactions:{},validationChecks:[]};
  const t=recorder(s,s=>[check('the committed roster retains at least one doctor',Object.values(s.rows).some(r=>r.value))]);
  for(const op of program(config)) {
    const [tx,action,key,text]=op.split(':');
    if(!['T1','T2'].includes(tx))throw Error('Use T1 or T2.');
    if(action==='begin') {
      if(s.transactions[tx])throw Error('Transaction already began.');
      s.transactions[tx]={snapshot:copy(s.rows),reads:{},writes:{},status:'active'};t.emit(`${tx} captures a snapshot and opens read/write sets`);continue;
    }
    const local=s.transactions[tx];if(!local||local.status!=='active')throw Error(`${tx} needs an active transaction.`);
    if(action==='read') {
      if(!s.rows[key])throw Error('Read A or B.');local.reads[key]=local.snapshot[key].version;t.emit(`${tx} records ${key}@version${local.reads[key]}`);
    }else if(action==='write') {
      if(!s.rows[key]||!['true','false'].includes(text))throw Error('Use T1:write:A:false.');
      local.writes[key]=text==='true';t.emit(`${tx} stages ${key} = ${text}`);
    }else if(action==='commit') {
      const versions=Object.fromEntries(Object.entries(s.rows).map(([k,row])=>[k,row.version]));
      const writes=Object.fromEntries(Object.keys(local.writes).map(k=>[k,local.snapshot[k].version]));
      const tested=config.validation==='read-set'?{...local.reads,...writes}:writes;
      const valid=validate(tested,versions);s.validationChecks.push({tx,tested,current:versions,valid});
      if(valid){s.clock++;for(const [k,value] of Object.entries(local.writes))s.rows[k]={value,version:s.clock};local.status='committed';}
      else local.status='aborted';
      t.emit(`${tx} validates ${config.validation} and ${local.status}`);
    }else throw Error('Use begin, read, write or commit.');
  }
  return t.finish();
}

export function needsRedo(pageLSN, recordLSN) { return pageLSN < recordLSN; }
export function recoveryEngine(config) {
  choose(config,'wal',['disabled','enforced']);
  const s={disk:{alice:{value:100,pageLSN:0},bob:{value:100,pageLSN:0}},buffer:{alice:{value:100,pageLSN:0,recLSN:null},bob:{value:100,pageLSN:0,recLSN:null}},log:[],flushedLSN:0,transaction:{status:'active',lastLSN:0},checkpoint:null,acknowledged:false};
  const t=recorder(s,()=>[check('recovered transfer is atomic and acknowledged commits survive',null)]);
  const append=record=>{const lsn=s.log.length+1;s.log.push({lsn,...(record.tx?{prevLSN:s.transaction.lastLSN}:{}),...record});if(record.tx)s.transaction.lastLSN=lsn;return lsn;};
  append({type:'BEGIN',tx:'T1'});t.emit('Append BEGIN; the log buffer is not durable yet');
  for(const op of program(config)) {
    const [action,page,text]=op.split(':');
    if(action==='update') {
      if(s.transaction.status!=='active'||!s.buffer[page])throw Error('Update an active transaction on alice or bob.');
      const delta=Number(text);if(!Number.isSafeInteger(delta)||Math.abs(delta)>1000)throw Error('Use a bounded integer delta.');
      const frame=s.buffer[page],lsn=append({type:'UPDATE',tx:'T1',page,before:frame.value,beforePageLSN:frame.pageLSN,after:frame.value+delta});
      frame.value+=delta;frame.pageLSN=lsn;frame.recLSN??=lsn;t.emit(`Dirty ${page} in the buffer pool at LSN ${lsn}`);
    }else if(action==='flush') {
      const frame=s.buffer[page];if(!frame)throw Error('Flush alice or bob.');
      if(config.wal==='enforced')s.flushedLSN=Math.max(s.flushedLSN,frame.pageLSN);
      s.disk[page]={value:frame.value,pageLSN:frame.pageLSN};frame.recLSN=null;
      t.emit(`Flush ${page}${config.wal==='enforced'?' only after flushing its WAL dependency':' without enforcing write-ahead ordering'}`);
    }else if(action==='flush-log') {
      s.flushedLSN=s.log.length;t.emit('Flush all buffered log records');
    }else if(action==='checkpoint') {
      const dirty=Object.fromEntries(Object.entries(s.buffer).filter(([,f])=>f.recLSN!==null).map(([p,f])=>[p,f.recLSN]));
      const lsn=append({type:'CHECKPOINT',dirty,transaction:copy(s.transaction)});s.flushedLSN=lsn;
      s.checkpoint={lsn,dirty,transaction:copy(s.log.at(-1).transaction)};t.emit('Persist a fuzzy checkpoint: transaction and dirty-page metadata, without forcing pages');
    }else if(action==='commit') {
      if(s.transaction.status!=='active')throw Error('Transaction has already finished.');
      s.flushedLSN=append({type:'COMMIT',tx:'T1'});s.transaction.status='committed';s.acknowledged=true;
      t.emit('Flush COMMIT and earlier log records; acknowledge without forcing data pages');
    }else throw Error(`Unknown buffer/log operation ${op}`);
  }
  return t.finish();
}
export function recoverEngine(original) {
  const s=copy(original),durable=s.log.filter(r=>r.lsn<=s.flushedLSN);
  s.discardedLogLSNs=s.log.filter(r=>r.lsn>s.flushedLSN).map(r=>r.lsn);s.log=durable;
  const cp=[...durable].reverse().find(r=>r.type==='CHECKPOINT');
  const dirty={...(cp?.dirty||{})};
  let phase=cp?.transaction.status??'absent',lastLSN=cp?.transaction.lastLSN??0;
  const scanned=durable.filter(r=>r.lsn>(cp?.lsn||0));
  for(const r of scanned) {
    if(r.tx==='T1'){phase=r.type==='COMMIT'?'committed':'active';lastLSN=r.lsn;}
    if(r.type==='UPDATE')dirty[r.page]=Math.min(dirty[r.page]??r.lsn,r.lsn);
  }
  const committed=phase==='committed';
  const redoStart=Math.min(...Object.values(dirty));
  s.analysis={checkpointLSN:cp?.lsn||0,winners:committed?['T1']:[],losers:phase==='active'?['T1']:[],analysisScannedLSNs:scanned.map(r=>r.lsn),undoStartLSN:phase==='active'?lastLSN:null,dirtyPageTable:dirty,redoStartLSN:Number.isFinite(redoStart)?redoStart:null};
  s.redo=[];s.undo=[];
  for(const r of durable)if(r.type==='UPDATE'&&r.lsn>=redoStart) {
    const applied=needsRedo(s.disk[r.page].pageLSN,r.lsn);
    s.redo.push({lsn:r.lsn,page:r.page,applied});
    if(applied)s.disk[r.page]={value:r.after,pageLSN:r.lsn};
  }
  // One transaction, no interleaved writers: before-image undo in reverse LSN order.
  // This intentionally does not implement ARIES compensation log records.
  const byLSN=new Map(durable.map(r=>[r.lsn,r]));
  if(phase==='active')for(let next=lastLSN;next;) {
    const r=byLSN.get(next);if(!r)throw Error('Undo depends on a log record that was not retained.');
    if(r.type==='UPDATE'){s.disk[r.page]={value:r.before,pageLSN:r.beforePageLSN};s.undo.push({lsn:r.lsn,page:r.page,restored:r.before});}
    next=r.prevLSN;
  }
  s.buffer=copy(s.disk);s.transaction={status:committed?'committed':phase==='active'?'aborted':'absent',lastLSN};
  const expected=committed?{alice:70,bob:130}:{alice:100,bob:100};
  return {label:'Restart: analyze durable log, redo by pageLSN, then undo the loser',state:s,checks:[check('recovery yields the complete committed transfer or the complete old state',Object.entries(expected).every(([p,v])=>s.disk[p].value===v)),check('acknowledged COMMIT is present in the durable log',s.acknowledged?committed:null)]};
}

export function upToDate(candidate, voter) {
  const a=candidate.at(-1)||{term:0,index:0},b=voter.at(-1)||{term:0,index:0};
  return a.term>b.term||(a.term===b.term&&a.index>=b.index);
}
export function replicatedLog(config) {
  choose(config,'ack',['local','quorum']);
  const node=()=>({live:true,term:1,log:[],commitIndex:0,vote:null,voteTerm:0,role:'follower'});
  const s={nodes:{A:node(),B:node(),C:node()},leader:'A',nextIndex:{B:1,C:1},matchIndex:{A:0,B:0,C:0},target:null,acknowledged:[],votes:[],rpc:null,recovered:null,readAttempted:false};
  s.nodes.A.role='leader';
  const same=(a,b)=>a&&b&&a.index===b.index&&a.term===b.term&&a.command===b.command;
  const t=recorder(s,s=>[check('every acknowledgement refers to a quorum-committed entry',s.acknowledged.every(a=>a.quorumCommitted)),check('after failover the acknowledged decision remains in the committed prefix',s.readAttempted&&s.acknowledged.length?s.acknowledged.every(a=>same(s.nodes[s.leader].log[a.index-1],a)&&s.nodes[s.leader].commitIndex>=a.index):null)]);
  for(const op of program(config)) {
    const [action,arg]=op.split(':');
    if(action==='crash'||action==='restart') {
      if(!s.nodes[arg])throw Error('Name node A, B or C.');s.nodes[arg].live=action==='restart';s.nodes[arg].role='follower';t.emit(`${action} ${arg}; stable log and vote survive`);continue;
    }
    if(action==='elect') {
      const candidate=s.nodes[arg];if(!candidate?.live)throw Error('Candidate must be live.');
      candidate.term++;candidate.role='candidate';s.votes=[];
      for(const [name,voter] of Object.entries(s.nodes))if(voter.live&&candidate.term>=voter.term) {
        if(candidate.term>voter.term){voter.term=candidate.term;voter.vote=null;voter.voteTerm=0;voter.role='follower';}
        if((voter.voteTerm!==candidate.term||voter.vote===arg)&&upToDate(candidate.log,voter.log)){voter.vote=arg;voter.voteTerm=candidate.term;s.votes.push(name);}
      }
      if(s.votes.length>=2){candidate.role='leader';s.leader=arg;s.nextIndex={};s.matchIndex={A:0,B:0,C:0};s.matchIndex[arg]=candidate.log.length;for(const name of Object.keys(s.nodes))if(name!==arg)s.nextIndex[name]=candidate.log.length+1;}
      t.emit(`${arg} requests votes in term ${candidate.term}: ${s.votes.length>=2?'elected':'no majority'}`);continue;
    }
    const leader=s.nodes[s.leader];if(!leader.live||leader.role!=='leader')throw Error('Elect a live leader before continuing.');
    if(action==='append') {
      if(!['COMMIT','NOOP'].includes(arg))throw Error('Append COMMIT or NOOP.');
      const entry={index:leader.log.length+1,term:leader.term,command:arg};leader.log.push(entry);s.matchIndex[s.leader]=entry.index;
      if(arg==='COMMIT')s.target=copy(entry);t.emit(`Leader appends ${arg} at index ${entry.index}, term ${entry.term}`);
    }else if(action==='replicate') {
      const follower=s.nodes[arg];if(!follower||arg===s.leader)throw Error('Choose a follower A, B or C.');
      if(!follower.live){t.emit(`${arg} is unreachable; no replication acknowledgement`);continue;}
      if(leader.term<follower.term)throw Error('Stale leader term: elect a current leader.');
      if(follower.term<leader.term){follower.vote=null;follower.voteTerm=0;}follower.term=leader.term;follower.role='follower';
      const next=s.nextIndex[arg]??1,prev=next-1,expected=leader.log[prev-1];
      if(prev>0&&!same(follower.log[prev-1],expected)) {
        s.nextIndex[arg]=Math.max(1,next-1);s.rpc={to:arg,prevIndex:prev,result:'prefix mismatch; backtrack nextIndex'};
      }else {
        const entries=leader.log.slice(next-1);let i=0;
        while(i<entries.length&&same(follower.log[next-1+i],entries[i]))i++;
        if(i<entries.length)follower.log=[...follower.log.slice(0,next-1+i),...copy(entries.slice(i))];
        s.matchIndex[arg]=prev+entries.length;s.nextIndex[arg]=s.matchIndex[arg]+1;
        for(let n=leader.log.length;n>leader.commitIndex;n--)if(leader.log[n-1].term===leader.term&&Object.values(s.matchIndex).filter(index=>index>=n).length>=2){leader.commitIndex=n;break;}
        follower.commitIndex=Math.max(follower.commitIndex,Math.min(leader.commitIndex,follower.log.length));
        s.rpc={to:arg,prevIndex:prev,result:'prefix matched; entries persisted',matchIndex:s.matchIndex[arg]};
      }
      t.emit(`AppendEntries to ${arg}: ${s.rpc.result}`);
    }else if(action==='ack') {
      if(!s.target)throw Error('Append a COMMIT decision first.');
      const valid=same(leader.log[s.target.index-1],s.target)&&leader.commitIndex>=s.target.index;
      if(config.ack==='local'||valid){s.acknowledged.push({...s.target,quorumCommitted:valid});t.emit('Acknowledge the decision to its caller');}
      else t.emit('Withhold acknowledgement: the decision is not yet quorum committed');
    }else if(action==='recover') {
      s.readAttempted=true;s.recovered=leader.log.slice(0,leader.commitIndex).find(e=>e.command==='COMMIT')||null;t.emit('Read the recovered committed prefix after the explicit election/replication schedule');
    }else throw Error(`Unknown replicated-log operation ${op}`);
  }
  return t.finish();
}

const transfer=['write:alice:70','observe','write:bob:130','commit','observe'];
const versions=['begin-reader','read-reader','begin-writer','write','commit-writer','read-reader','vacuum','read-reader'];
const upgrades=['A:S:bike','B:S:bike','A:X:bike','B:X:bike','detect'];
const optimistic=['T1:begin','T2:begin','T1:read:A','T1:read:B','T2:read:A','T2:read:B','T1:write:A:false','T2:write:B:false','T1:commit','T2:commit'];
const logging=['update:alice:-30','flush:alice','checkpoint','update:bob:30','commit'];
export const mechanismDefinitions={
  'transaction-manager':{presets:{broken:{publication:'each-write',schedule:transfer},repaired:{publication:'commit',schedule:transfer},abort:{publication:'commit',schedule:['write:alice:70','observe','abort','observe']}},boundary:'A single-writer private-write-set engine. Publication is one JavaScript state transition, not durable storage. The next mechanisms add visibility, concurrency and logging.'},
  mvcc:{presets:{broken:{isolation:'repeatable-read',retention:'latest-only',schedule:versions},repaired:{isolation:'repeatable-read',retention:'snapshot-aware',schedule:versions},'new-snapshot':{isolation:'read-committed',retention:'snapshot-aware',schedule:versions}},boundary:'An executable tuple-version and snapshot-membership algorithm with bounded transaction IDs. One writer and one reader; no PostgreSQL command IDs, wraparound, subtransactions or physical vacuum implementation.'},
  'lock-manager':{presets:{broken:{deadlock:'ignore',schedule:upgrades},repaired:{deadlock:'abort-youngest',schedule:upgrades}},boundary:'Actual S/X compatibility checks, FIFO queues, graph construction and DFS cycle detection. Two named clients and two keys; no lock escalation or SQL lock modes. Locking protects access, not durable storage.'},
  validation:{presets:{broken:{validation:'write-set',schedule:optimistic},repaired:{validation:'read-set',schedule:optimistic}},boundary:'An executable optimistic transaction engine with versioned key reads and atomic validate/publish. Finite key reads only; range predicates need additional tracking. This is OCC, not PostgreSQL SSI.'},
  'recovery-engine':{presets:{broken:{wal:'disabled',schedule:logging},repaired:{wal:'enforced',schedule:logging},loser:{wal:'enforced',schedule:['update:alice:-30','flush:alice','checkpoint']}},boundary:'A one-writer steal/no-force buffer and log engine with LSNs, a fuzzy checkpoint, redo and before-image undo. No torn pages, log truncation, concurrent writers or ARIES compensation records. A model crash discards volatile frames and log suffixes.'},
  'replicated-log':{presets:{broken:{ack:'local',schedule:['append:COMMIT','ack','crash:A','elect:B','append:NOOP','replicate:C','recover']},repaired:{ack:'quorum',schedule:['append:COMMIT','replicate:B','ack','crash:A','elect:B','append:NOOP','replicate:C','replicate:C','recover']},'missing-majority':{ack:'quorum',schedule:['append:COMMIT','crash:B','crash:C','ack']}},boundary:'An executable three-node Raft-style log core: durable entries/votes, up-to-date elections, prefix matching/backtracking and current-term majority commit. Sends are explicit atomic events; no timers, partitions with concurrent leaders, membership changes, snapshots or production Raft claim.'},
};
export const mechanismRunners={'transaction-manager':transactionManager,mvcc,'lock-manager':lockManager,validation,'recovery-engine':recoveryEngine,'replicated-log':replicatedLog};
export const mechanismSources={
  'transaction-manager':[publish,transactionManager],mvcc:[visible,mvcc],'lock-manager':[compatible,hasCycle,lockManager],validation:[validate,validation],'recovery-engine':[needsRedo,recoveryEngine,recoverEngine],'replicated-log':[upToDate,replicatedLog],
};

export function snapshotDependencies(config) {
  choose(config,'isolation',['snapshot','serializable']);
  const s={onCall:{A:true,B:true},rowVersions:{A:0,B:0},reads:{},readVersions:{},dependencies:{},rejectedDependencies:null,commits:[],aborts:[]};
  const t=recorder(s,s=>[check('at least one doctor remains on call',s.onCall.A||s.onCall.B)]);
  for(const op of program(config)) {
    const [who,action]=op.split('.');
    if(!['A','B'].includes(who))throw Error('Use A.read, B.read, A.write or B.write.');
    if(action==='read') {
      if(who in s.reads)throw Error('Each transaction reads once.');
      s.reads[who]=Number(s.onCall.A)+Number(s.onCall.B);s.readVersions[who]=copy(s.rowVersions);
      t.emit(`${who} reads a snapshot and records both row versions`);
    }else if(action==='write') {
      if(!(who in s.reads)||s.commits.includes(who)||s.aborts.includes(who))throw Error('Read once before writing once.');
      if(s.reads[who]<=1){s.commits.push(who);t.emit(`${who} stays: already the last doctor`);continue;}
      const graph=copy(s.dependencies);
      for(const [reader,versions] of Object.entries(s.readVersions))if(reader!==who&&versions[who]===s.rowVersions[who])graph[reader]=[...new Set([...(graph[reader]||[]),who])];
      if(config.isolation==='serializable'&&hasCycle(graph)){
        s.rejectedDependencies=graph;s.aborts.push(who);t.emit(`${who} aborts before publication: proposed read/write graph has a cycle`);
      }else{
        s.dependencies=graph;s.onCall[who]=false;s.rowVersions[who]++;s.commits.push(who);t.emit(`${who} publishes its row and read/write dependencies`);
      }
    }else throw Error('Use a read or write operation.');
  }
  return t.finish();
}

export function twoPhaseCommit(config) {
  choose(config,'resolution',['timeout-abort','wait','recover']);
  const s={A:'active',B:'active',durableDecision:null,coordinator:'reachable',progress:'running',stableLogs:{coordinator:[],A:[],B:[]},messages:[],heldResources:{A:true,B:true}};
  const t=recorder(s,s=>[check('participants never decide commit and abort',!([s.A,s.B].includes('committed')&&[s.A,s.B].includes('aborted')))]);
  for(const p of ['A','B']){
    s.stableLogs[p].push({type:'PREPARED',tx:'T1'});s[p]='prepared';s.messages.push({from:p,to:'coordinator',vote:'YES'});
    t.emit(`${p} flushes PREPARED before sending its YES vote`);
  }
  s.stableLogs.coordinator.push({type:'COMMIT',tx:'T1'});s.durableDecision='commit';t.emit('Coordinator flushes the COMMIT decision before notifying participants');
  s.messages.push({from:'coordinator',to:'A',decision:'COMMIT'});s.stableLogs.A.push({type:'COMMIT',tx:'T1'});s.A='committed';s.heldResources.A=false;
  t.emit('A records COMMIT, installs its effect and releases held resources');
  s.coordinator='unreachable';s.progress='blocked';t.emit('Lose the coordinator before B receives the decision');
  if(config.resolution==='timeout-abort'){
    s.stableLogs.B.push({type:'ABORT',tx:'T1'});s.B='aborted';s.heldResources.B=false;s.progress='unsafe completion';t.emit('B guesses ABORT from a timeout despite its durable PREPARED promise');
  }else if(config.resolution==='recover'){
    // Reconstruct from the durable coordinator record; do not decide from the timeout.
    const record=s.stableLogs.coordinator.find(r=>r.tx==='T1');s.durableDecision=record.type.toLowerCase();s.coordinator='recovered';
    s.messages.push({from:'coordinator',to:'B',decision:record.type});s.stableLogs.B.push(copy(record));s.B=record.type==='COMMIT'?'committed':'aborted';s.heldResources.B=false;s.progress='complete';t.emit('Restart coordinator, look up its durable decision and resolve B');
  }else t.emit('B keeps its PREPARED record and resources until a decision can be learned');
  return t.finish();
}
mechanismRunners['write-skew']=snapshotDependencies;
mechanismRunners['two-phase']=twoPhaseCommit;
mechanismSources['write-skew']=[hasCycle,snapshotDependencies];
mechanismSources['two-phase']=[twoPhaseCommit];

// Optional advanced ARIES core. Transactions modify disjoint fixed pages; no media faults.
export function ariesUndoNext(record) {
  return record.type==='CLR' ? record.undoNextLSN : record.prevLSN;
}
export function ariesExpected(s) {
  const durable=s.log.filter(r=>r.lsn<=s.flushedLSN);
  const winners=new Set(durable.filter(r=>r.type==='COMMIT').map(r=>r.tx));
  const expected={A:100,B:100,C:100};
  for(const r of durable)if(r.type==='UPDATE'&&winners.has(r.tx))expected[r.page]+=r.delta;
  return expected;
}
export function ariesChecks(s) {
  const durable=s.log.filter(r=>r.lsn<=s.flushedLSN),counts={};
  for(const r of durable)if(r.type==='CLR')counts[r.compensates]=(counts[r.compensates]||0)+1;
  const winners=new Set(durable.filter(r=>r.type==='COMMIT').map(r=>r.tx));
  return [
    check('completed recovery preserves committed updates and removes loser updates',s.complete?Object.entries(ariesExpected(s)).every(([p,v])=>s.disk[p].value===v):null),
    check('no original UPDATE has more than one durable compensation record',Object.values(counts).every(n=>n===1)),
    check('every persisted page is covered by the durable log',Object.values(s.disk).every(p=>p.pageLSN<=s.flushedLSN)),
    check('completed loser rollback has exactly one durable CLR per original UPDATE',s.complete?durable.filter(r=>r.type==='UPDATE').every(r=>winners.has(r.tx)?!counts[r.lsn]:counts[r.lsn]===1):null),
  ];
}
export function ariesAppend(s,record) {
  const lsn=(s.log.at(-1)?.lsn||0)+1;
  const r={lsn,...(record.tx?{prevLSN:s.transactionTable[record.tx]?.lastLSN||0}:{}),...copy(record)};
  s.log.push(r);
  if(r.tx){const status=r.type==='COMMIT'?'committing':['ABORT','CLR'].includes(r.type)?'aborting':s.transactionTable[r.tx]?.status||'running';s.transactionTable[r.tx]={status,lastLSN:lsn};}
  return r;
}
export function ariesApply(s,record) {
  const frame=s.buffer[record.page];
  if(frame.pageLSN>=record.lsn)return false;
  frame.value+=record.delta;frame.pageLSN=record.lsn;
  return true;
}
export function ariesFlush(s,page) {
  if(s.buffer[page].pageLSN>s.flushedLSN)throw Error('WAL violation: flush the page’s log dependency first.');
  s.disk[page]=copy(s.buffer[page]);
}
export function ariesPass(s,emit=()=>{},failure='none') {
  s.pass++;s.phase='analysis';s.complete=false;
  const discarded=s.log.filter(r=>r.lsn>s.flushedLSN).map(r=>r.lsn);
  s.log=s.log.filter(r=>r.lsn<=s.flushedLSN);s.buffer=copy(s.disk);
  s.transactionTable={};s.dirtyPageTable={};s.toUndo={};
  const cp=s.log.find(r=>r.lsn===s.masterCheckpointLSN&&r.type==='CHECKPOINT');
  if(cp){s.transactionTable=copy(cp.transactions);s.dirtyPageTable=copy(cp.dirtyPages);}
  const scanned=s.log.filter(r=>r.lsn>(cp?.lsn||0));
  for(const r of scanned) {
    if(r.type==='END'){delete s.transactionTable[r.tx];continue;}
    if(r.tx){const status=r.type==='COMMIT'?'committing':['ABORT','CLR'].includes(r.type)?'aborting':s.transactionTable[r.tx]?.status||'running';s.transactionTable[r.tx]={status,lastLSN:r.lsn};}
    if(['UPDATE','CLR'].includes(r.type))s.dirtyPageTable[r.page]??=r.lsn;
  }
  s.analysis={checkpointLSN:cp?.lsn||0,scannedLSNs:scanned.map(r=>r.lsn),discardedLogLSNs:discarded};
  emit(`Restart ${s.pass}: rebuild transaction/dirty-page tables from durable records`);
  for(const [tx,entry] of Object.entries(s.transactionTable)) {
    if(entry.status==='committing'){
      ariesAppend(s,{type:'END',tx});s.flushedLSN=s.log.at(-1).lsn;delete s.transactionTable[tx];emit(`Analysis finishes durable winner ${tx} with END`);
    }else if(entry.status==='running'){
      ariesAppend(s,{type:'ABORT',tx});s.flushedLSN=s.log.at(-1).lsn;emit(`Analysis records ${tx} as aborting`);
    }
  }
  s.phase='redo';s.redoStartLSN=Object.values(s.dirtyPageTable).length?Math.min(...Object.values(s.dirtyPageTable)):null;
  emit('Redo repeats history, including loser UPDATEs and existing CLRs');
  for(const r of s.log.filter(r=>r.lsn<=s.flushedLSN))if(['UPDATE','CLR'].includes(r.type)) {
    const eligible=s.dirtyPageTable[r.page]!==undefined&&r.lsn>=s.dirtyPageTable[r.page];
    const applied=eligible&&ariesApply(s,r);
    s.redoDecisions.push({pass:s.pass,lsn:r.lsn,type:r.type,tx:r.tx,page:r.page,applied});
    emit(`Redo ${r.type} ${r.lsn} on ${r.page}: ${applied?'apply':'skip by DPT/pageLSN'}`);
  }
  s.phase='undo';
  s.toUndo=Object.fromEntries(Object.entries(s.transactionTable).filter(([,t])=>t.status==='aborting').map(([tx,t])=>[tx,t.lastLSN]));
  emit('Undo starts from each loser’s lastLSN; choose the highest remaining LSN');
  while(Object.keys(s.toUndo).length) {
    const [tx,cursor]=Object.entries(s.toUndo).sort((a,b)=>b[1]-a[1])[0];
    const r=s.log.find(record=>record.lsn===cursor);
    if(cursor===0||r?.type==='BEGIN') {
      ariesAppend(s,{type:'END',tx});s.flushedLSN=s.log.at(-1).lsn;delete s.transactionTable[tx];delete s.toUndo[tx];emit(`Undo finishes ${tx}; append END`);continue;
    }
    if(!r)throw Error(`Missing undo dependency at LSN ${cursor}.`);
    if(r.type==='CLR') {
      s.toUndo[tx]=s.undoLink==='undoNextLSN'?ariesUndoNext(r):r.prevLSN;
      emit(`CLR ${r.lsn} is redo-only: follow ${s.undoLink} to ${s.toUndo[tx]}`);continue;
    }
    if(r.type!=='UPDATE'){s.toUndo[tx]=r.prevLSN;emit(`Follow ${r.type} ${r.lsn} to prevLSN ${r.prevLSN}`);continue;}
    const clr=ariesAppend(s,{type:'CLR',tx,page:r.page,delta:-r.delta,compensates:r.lsn,undoNextLSN:r.prevLSN});
    emit(`Append CLR ${clr.lsn}: compensate UPDATE ${r.lsn}; undoNextLSN = ${r.prevLSN}`);
    if(failure==='before-clr-flush'){s.crashes.push({pass:s.pass,at:failure,clr:clr.lsn});emit('Crash before flushing the new CLR; its volatile suffix will be lost');return;}
    s.flushedLSN=clr.lsn;emit(`Flush CLR ${clr.lsn} before any compensated data page can reach disk`);
    if(failure==='after-clr-flush'){s.crashes.push({pass:s.pass,at:failure,clr:clr.lsn});emit('Crash with a durable CLR whose page action has not been installed');return;}
    ariesApply(s,clr);s.undoActions.push({pass:s.pass,tx,update:r.lsn,clr:clr.lsn,page:r.page,delta:clr.delta});
    emit(`Apply CLR ${clr.lsn} to the buffered page; never compensate the CLR itself`);
    if(failure==='after-undo-flush'){ariesFlush(s,r.page);s.crashes.push({pass:s.pass,at:failure,clr:clr.lsn});emit('Flush the undo page, then crash before finishing rollback');return;}
    s.toUndo[tx]=r.prevLSN;
  }
  s.flushedLSN=s.log.at(-1)?.lsn||0;
  for(const page of Object.keys(s.disk))ariesFlush(s,page);
  s.phase='complete';s.complete=true;emit('Recovery complete: persist final pages for independent verification');
}
export function ariesRecovery(config) {
  choose(config,'undoLink',['prevLSN','undoNextLSN']);
  choose(config,'failure',['none','before-clr-flush','after-clr-flush','after-undo-flush']);
  choose(config,'pageFlush',['none','B','B-and-C']);
  if(!Number.isSafeInteger(config.attempts)||config.attempts<1||config.attempts>6)throw Error('attempts must be an integer from 1 to 6.');
  const disk={A:{value:100,pageLSN:0},B:{value:100,pageLSN:0},C:{value:100,pageLSN:0}};
  const s={disk,buffer:copy(disk),log:[],flushedLSN:0,masterCheckpointLSN:0,transactionTable:{},dirtyPageTable:{},toUndo:{},phase:'normal',pass:0,complete:false,undoLink:config.undoLink,redoDecisions:[],undoActions:[],crashes:[]};
  const t=recorder(s,ariesChecks);
  for(const tx of ['T1','T2','T3']){ariesAppend(s,{type:'BEGIN',tx});t.emit(`Begin ${tx}`);}
  for(const [tx,page,delta] of [['T1','A',10],['T2','B',20],['T3','C',7]]){
    const r=ariesAppend(s,{type:'UPDATE',tx,page,delta});ariesApply(s,r);s.dirtyPageTable[page]??=r.lsn;t.emit(`Append UPDATE ${r.lsn}: ${tx} changes ${page} by ${delta}`);
  }
  const cp=ariesAppend(s,{type:'CHECKPOINT',transactions:copy(s.transactionTable),dirtyPages:copy(s.dirtyPageTable)});
  s.flushedLSN=cp.lsn;s.masterCheckpointLSN=cp.lsn;t.emit('Persist checkpoint metadata without forcing its dirty pages');
  const extra=ariesAppend(s,{type:'UPDATE',tx:'T2',page:'B',delta:5});ariesApply(s,extra);t.emit(`T2 appends another UPDATE at LSN ${extra.lsn}`);
  const commit=ariesAppend(s,{type:'COMMIT',tx:'T1'});s.flushedLSN=commit.lsn;t.emit('T1 flushes COMMIT; T2 and T3 remain losers');
  if(config.pageFlush!=='none'){ariesFlush(s,'B');if(config.pageFlush==='B-and-C')ariesFlush(s,'C');t.emit(`Steal uncommitted ${config.pageFlush} pages after their WAL is durable`);}
  for(let attempt=0;attempt<config.attempts;attempt++)ariesPass(s,t.emit,attempt<config.attempts-1?config.failure:'none');
  return t.finish();
}
export function recoverAries(original) {
  const s=copy(original);ariesPass(s);
  return {state:s,checks:ariesChecks(s),label:'ARIES restart: repeat durable history, then resume losers through CLR undoNextLSN links'};
}
mechanismDefinitions.aries={
  presets:{
    broken:{undoLink:'prevLSN',failure:'after-undo-flush',pageFlush:'B',attempts:2},
    repaired:{undoLink:'undoNextLSN',failure:'after-undo-flush',pageFlush:'B',attempts:2},
    'clr-durable-page-missing':{undoLink:'undoNextLSN',failure:'after-clr-flush',pageFlush:'B',attempts:2},
    'clr-not-durable':{undoLink:'undoNextLSN',failure:'before-clr-flush',pageFlush:'none',attempts:2},
    'repeated-crashes':{undoLink:'undoNextLSN',failure:'after-undo-flush',pageFlush:'B-and-C',attempts:4},
  },
  boundary:'Optional advanced ARIES core with interleaved winner/loser transactions, TT/DPT analysis, repeat-history redo, redo-only CLRs and highest-LSN undo. Transactions modify disjoint fixed pages with full-transaction rollback only. Checkpoint metadata is captured atomically in one record; no full fuzzy-checkpoint merge, logical index undo, nested top actions, media recovery or production-engine claim. CLR flushes are deliberately conservative.',
};
mechanismRunners.aries=ariesRecovery;
mechanismSources.aries=[ariesUndoNext,ariesExpected,ariesChecks,ariesAppend,ariesApply,ariesFlush,ariesPass,ariesRecovery,recoverAries];
