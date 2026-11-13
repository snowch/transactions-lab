import {mechanismDefinitions,mechanismRunners,recoverEngine,recoverAries} from './mechanisms.js';
// Explicit, deterministic teaching models. These are not database/storage implementations.
const clone = value => structuredClone(value);
const flag = (name, pass) => ({name, pass});
const integer = (c,k,min=0,max=10000) => {if(!Number.isSafeInteger(c[k])||c[k]<min||c[k]>max)throw Error(`${k} must be an integer from ${min} to ${max}.`);};
const choice = (c,k,values) => {if(!values.includes(c[k]))throw Error(`${k} must be one of: ${values.join(', ')}.`);};
function schedule(c, allowed) {
  if(!Array.isArray(c.schedule)||c.schedule.length>80||c.schedule.some(s=>!allowed.includes(s)))throw Error(`schedule must contain at most 80 of: ${allowed.join(', ')}.`);
}
function trace(state, checks) {
  const steps=[];
  const add=label=>steps.push({label,state:clone(state),checks:checks(state)});
  add('Initial state');
  return {steps,add,finish:()=>({steps})};
}
export const definitions = {
  ...mechanismDefinitions,
  'lost-update': {presets:{broken:{strategy:'read-write',stock:2,schedule:['A.read','B.read','A.write','B.write']},repaired:{strategy:'conditional',stock:1,schedule:['A.read','B.read','A.write','B.write']}},boundary:'A deterministic interleaving of two clients. Conditional updates represent an atomic database operation; no SQL server or real threads run here.'},
  'write-skew': {presets:{broken:{isolation:'snapshot',schedule:['A.read','B.read','A.write','B.write']},repaired:{isolation:'serializable',schedule:['A.read','B.read','A.write','B.write']}},boundary:'A two-row snapshot and read/write dependency engine. The serializable policy runs a DFS cycle check before publication; PostgreSQL SSI uses a different dangerous-structure algorithm.'},
  locks:{presets:{broken:{ordering:'opposite'},repaired:{ordering:'consistent'}},boundary:'A lock ownership and wait-for model. Victim selection and detector timing are not modeled.'},
  retries:{presets:{broken:{retry:'statement'},repaired:{retry:'transaction'}},boundary:'A version-validation model with one forced conflicting commit. It models a retry boundary, not a database isolation algorithm.'},
  contention:{presets:{broken:{lock:'global',requests:8,keys:4,service:3},repaired:{lock:'per-key',requests:8,keys:4,service:3}},boundary:'Synthetic logical ticks with equal service times and one request per key per batch. These are model results, not measured throughput. Per-key locking is valid only for independent invariants.'},
  files:{presets:{broken:{protocol:'rename-only'},repaired:{protocol:'durable'},'unsafe-order':{protocol:'directory-first'}},boundary:'A simplified Linux-style local-file model: fsync(file) persists contents; rename changes visibility; fsync(directory) persists the name. No torn writes, device faults, or concurrent writers are modeled.'},
  wal:{presets:{broken:{protocol:'in-place'},repaired:{protocol:'wal'}},boundary:'Whole-page writes and an atomic durable commit marker are assumed. Real WAL also needs checksums, record framing, storage barriers and a stated torn-write policy.'},
  recovery:{presets:{broken:{representation:'increment',initial:100,amount:20},repaired:{representation:'after-image',initial:100,amount:20}},boundary:'One committed log record and a second crash after replay but before clearing the log. No concurrent transactions or undo are modeled.'},
  'two-phase':{presets:{broken:{resolution:'timeout-abort'},repaired:{resolution:'wait'},recovered:{resolution:'recover'}},boundary:'Two participants with durable prepare/decision records. The coordinator commits and reaches A, then becomes unreachable from B. Stable storage survives; Byzantine faults are excluded.'},
  consensus:{presets:{broken:{replicas:3,reachable:1,decision:'unknown'},repaired:{replicas:3,reachable:2,decision:'commit'},'no-vote':{replicas:3,reachable:2,decision:'abort'}},boundary:'Quorum arithmetic and durable decision lookup only. This does not implement Raft/Paxos, leader election, or message delivery. Replication cannot invent a missing participant vote.'},
  outbox:{presets:{broken:{strategy:'dual-write',crash:'after-db'},repaired:{strategy:'outbox',crash:'after-db'},duplicate:{strategy:'outbox',crash:'after-publish'}},boundary:'An in-memory model of durable database state and a broker. The outbox guarantees a durable intent; a relay may publish twice. This is not a live broker or a transactional connector.'},
  idempotency:{presets:{broken:{key:'new-each-retry',binding:'checked',payloadChanged:false},repaired:{key:'stable',binding:'checked',payloadChanged:false},conflict:{key:'stable',binding:'checked',payloadChanged:true}},boundary:'The server stores request key, payload and result atomically with a charge. The response is lost once. Concurrent key insertion, retention and real payment APIs require additional validation.'},
  sagas:{presets:{broken:{compensation:'forget'},repaired:{compensation:'durable-retry'}},boundary:'A persisted workflow model with payment failure and one failed inventory compensation. Compensation restores a business resource; it does not erase observed history.'},
  'order-workflow':{presets:{broken:{design:'naive',failure:'after-charge'},repaired:{design:'protected',failure:'after-charge'},replay:{design:'protected',failure:'after-publish'}},boundary:'A small reservation/payment/outbox model. Payment uses a stable idempotency key; concurrent reservation is modeled by a conditional decrement. It is not a deployed payment or broker service.'},
};

export function runModel(id, input) {
  if(!definitions[id])throw Error('Unknown model');
  const c=clone(input);
  if(mechanismRunners[id])return mechanismRunners[id](c);
  if(id==='lost-update') {
    choice(c,'strategy',['read-write','conditional']);integer(c,'stock',1);
    schedule(c,['A.read','B.read','A.write','B.write']);
    const s={initial:c.stock,stock:c.stock,reservations:0,reads:{},written:[],rejected:[]};
    const t=trace(s,s=>[flag('stock + reservations = initial stock',s.stock+s.reservations===s.initial),flag('stock never negative',s.stock>=0)]);
    for(const op of c.schedule){const [who,action]=op.split('.');
      if(action==='read'){if(who in s.reads)throw Error(`${who} can read only once in this schedule.`);s.reads[who]=s.stock;t.add(`${who} reads stock ${s.stock}`);}
      else {if(!(who in s.reads)||s.written.includes(who)||s.rejected.includes(who))throw Error(`${who} needs one read before one write.`);
        const available=c.strategy==='conditional'?s.stock:s.reads[who];
        if(available<1){s.rejected.push(who);t.add(`${who} rejects: no stock`);}
        else {s.stock=available-1;s.reservations++;s.written.push(who);t.add(`${who} commits reservation`);}}
    }return t.finish();
  }
  if(id==='locks') {
    choice(c,'ordering',['opposite','consistent']);
    const s={locks:{},waiting:{},committed:[],deadlock:false};
    const t=trace(s,s=>[flag('no cycle in wait-for graph',!s.deadlock)]);
    const lock=(who,key)=>{if(s.locks[key]&&s.locks[key]!==who){s.waiting[who]=s.locks[key];s.deadlock=Boolean(s.waiting.A==='B'&&s.waiting.B==='A');t.add(`${who} waits for ${key}, owned by ${s.locks[key]}`);}else{s.locks[key]=who;t.add(`${who} acquires ${key}`);}};
    lock('A','bike');lock('B',c.ordering==='opposite'?'helmet':'bike');lock('A','helmet');
    if(c.ordering==='opposite')lock('B','bike');
    else {s.locks={};s.committed.push('A');s.waiting={};t.add('A commits and releases both locks');lock('B','bike');lock('B','helmet');s.locks={};s.committed.push('B');t.add('B commits');}
    return t.finish();
  }
  if(id==='retries') {
    choice(c,'retry',['statement','transaction']);
    const s={onCall:2,observed:null,version:0,expectedVersion:0,aborted:false,attempts:1};
    const t=trace(s,s=>[flag('at least one doctor remains',s.onCall>=1)]);
    s.observed=s.onCall;t.add('A reads two doctors and decides to leave');
    s.onCall--;s.version++;t.add('B commits leaving; one doctor remains');
    s.aborted=true;t.add('A fails version validation; its transaction aborts');
    s.attempts++;s.aborted=false;
    if(c.retry==='transaction'){s.observed=s.onCall;s.expectedVersion=s.version;t.add('A starts a new transaction and rereads the roster');}
    else t.add('A starts again but reuses the old decision');
    if(s.observed>1){s.onCall--;t.add('A commits leaving');}else t.add('A stays on call');
    return t.finish();
  }
  if(id==='contention') {
    choice(c,'lock',['global','per-key']);integer(c,'requests',1,40);integer(c,'keys',1,8);integer(c,'service',1,20);
    const s={completed:0,clock:0,waiting:c.requests,slots:c.lock==='global'?1:c.keys,serviceTicks:c.service};
    const t=trace(s,s=>[flag('all completed work is counted once',s.completed+s.waiting===c.requests)]);
    while(s.waiting){const n=Math.min(s.waiting,s.slots);s.clock+=c.service;s.completed+=n;s.waiting-=n;t.add(`Complete a batch of ${n} independent requests`);}
    return t.finish();
  }
  if(id==='files') {
    choice(c,'protocol',['rename-only','durable','directory-first']);
    const s={visible:'old',bufferedTemp:'none',durableTemp:'none',durableName:'old',acknowledged:false};
    const t=trace(s,s=>[flag('visible contents are complete',s.visible==='old'||s.bufferedTemp==='new'),flag('acknowledged new version survives a crash',s.acknowledged?s.durableName==='new'&&s.durableTemp==='new':null)]);
    s.bufferedTemp='new';t.add('Write the complete new contents to a temporary file');
    if(c.protocol==='durable'){s.durableTemp='new';t.add('fsync the temporary file');}
    s.visible='new';t.add('rename atomically replaces the visible target');
    if(c.protocol!=='rename-only'){s.durableName='new';t.add('fsync the parent directory persists the replacement name');}
    s.acknowledged=true;t.add('Acknowledge the update to the caller');return t.finish();
  }
  if(id==='wal') {
    choice(c,'protocol',['in-place','wal']);
    const s={disk:{alice:100,bob:100},log:null,logDurable:false,commitDurable:false,acknowledged:false};
    const t=trace(s,()=>[flag('recovered transfer is all old or all new',null)]);
    if(c.protocol==='wal'){s.log={alice:70,bob:130};t.add('Append both after-images to the log buffer');s.logDurable=true;t.add('Flush the log records');s.commitDurable=true;t.add('Flush the commit marker after the log records');}
    s.disk.alice=70;t.add('Install Alice’s page on disk');s.disk.bob=130;t.add('Install Bob’s page on disk');s.acknowledged=true;t.add('Acknowledge the complete transfer');return t.finish();
  }
  if(id==='recovery') {
    choice(c,'representation',['increment','after-image']);integer(c,'initial');integer(c,'amount');
    const s={balance:c.initial,initial:c.initial,amount:c.amount,target:c.initial+c.amount,logPresent:true,replays:0,representation:c.representation};
    const t=trace(s,s=>[flag('after replay, the effect occurs once',s.replays?s.balance===s.target:null)]);
    s.balance=c.representation==='increment'?s.balance+c.amount:s.target;s.replays++;t.add('Replay the committed record once');t.add('Crash before the log can be cleared');return t.finish();
  }
  if(id==='consensus') {
    integer(c,'replicas',3,9);integer(c,'reachable',0,c.replicas);choice(c,'decision',['unknown','commit','abort']);
    if(c.replicas%2===0)throw Error('Use an odd replica count for this exercise.');
    const s={replicas:c.replicas,reachable:c.reachable,quorum:Math.floor(c.replicas/2)+1,participantVote:c.decision==='unknown'?'missing':c.decision==='commit'?'all YES':'one NO',decision:null,progress:'waiting'};
    const t=trace(s,s=>[flag('commit only with all participant YES votes',s.decision!=='commit'||s.participantVote==='all YES')]);
    if(s.reachable<s.quorum)t.add('No quorum: this model cannot recover/append an authoritative decision');
    else if(c.decision==='unknown')t.add('Quorum is available, but a participant vote is missing: do not invent COMMIT');
    else {s.decision=c.decision;s.progress='decision available';t.add(`Quorum makes the durable ${c.decision.toUpperCase()} decision available`);}
    return t.finish();
  }
  if(id==='outbox') {
    choice(c,'strategy',['dual-write','outbox']);choice(c,'crash',['after-db','after-publish']);
    const s={order:'absent',outbox:false,published:0,relayAcknowledged:false,crashed:false};
    const t=trace(s,s=>[flag('paid order has durable event intent or a published event',s.order!=='paid'||s.outbox||s.published>0)]);
    s.order='paid';s.outbox=c.strategy==='outbox';t.add(c.strategy==='outbox'?'Commit paid order and outbox intent together':'Commit paid order alone');
    if(c.crash==='after-publish'){s.published++;t.add('Publish event; relay progress is not yet recorded');}
    s.crashed=true;t.add('Crash and restart the application');
    if(s.outbox){s.published++;t.add('Relay reads durable intent and publishes (possibly again)');s.relayAcknowledged=true;t.add('Record relay progress');}
    else t.add('No durable intent exists to drive publication after restart');
    return t.finish();
  }
  if(id==='idempotency') {
    choice(c,'key',['stable','new-each-retry']);choice(c,'binding',['checked','unchecked']);if(typeof c.payloadChanged!=='boolean')throw Error('payloadChanged must be boolean.');
    const s={charges:0,chargedAmount:0,storedKey:null,storedAmount:null,response:'pending',attempts:0};
    const t=trace(s,s=>[flag('one logical request produces one charge',s.charges<=1),flag('a reused key cannot silently accept a different payload',!(c.payloadChanged&&c.key==='stable'&&s.response==='cached result'&&c.binding==='unchecked'))]);
    s.attempts++;s.charges++;s.chargedAmount=30;s.storedKey='request-1';s.storedAmount=30;t.add('Server atomically stores the charge, request key and result');
    s.response='lost';t.add('Commit succeeded, but the response is lost');s.attempts++;
    if(c.key==='new-each-retry'){s.charges++;s.chargedAmount+=c.payloadChanged?40:30;s.response='new charge';t.add('Retry with a new key creates another charge');}
    else if(c.payloadChanged&&c.binding==='checked'){s.response='payload conflict rejected';t.add('Reject the changed payload bound to the existing key');}
    else {s.response='cached result';t.add('Return the stored result for the same request key');}
    return t.finish();
  }
  if(id==='sagas') {
    choice(c,'compensation',['forget','durable-retry']);
    const s={stock:1,reserved:false,payment:'not attempted',workflow:'started',compensationAttempts:0,history:[]};
    const t=trace(s,s=>[flag('a completed failed workflow has released inventory',s.workflow==='failed-complete'?!s.reserved:null)]);
    s.stock--;s.reserved=true;s.history.push('reserved');t.add('Reserve inventory in a local transaction');
    s.payment='declined';t.add('Payment fails: begin compensation');s.workflow='compensating';s.compensationAttempts++;t.add('Release request fails once before taking effect');
    if(c.compensation==='forget'){s.workflow='failed-complete';t.add('Forget compensation and mark the workflow complete');}
    else {t.add('Persist pending compensation and restart the worker');s.compensationAttempts++;s.stock++;s.reserved=false;s.history.push('released');s.workflow='failed-complete';t.add('Retry the idempotent release and record completion');}
    return t.finish();
  }
  if(id==='order-workflow') {
    choice(c,'design',['naive','protected']);choice(c,'failure',['after-charge','after-publish']);
    const s={stock:1,reservations:0,charges:0,order:'absent',outbox:false,deliveries:0,effects:0,completed:false};
    const t=trace(s,s=>[flag('inventory is conserved',s.stock+s.reservations===1&&s.stock>=0),flag('one logical order has at most one charge',s.charges<=1),flag('one dispatch effect per order',s.effects<=1),flag('completed paid order has dispatch intent',s.completed?s.order==='paid'&&(s.outbox||s.deliveries>0):null)]);
    s.stock--;s.reservations++;t.add('Conditionally reserve the last item');
    t.add('Competing reservation sees no stock and is rejected');s.charges++;t.add('Payment service commits charge for order-1');
    if(c.failure==='after-charge')t.add('Lose the payment response, crash, then retry');
    if(c.failure==='after-charge'&&c.design==='naive'){s.charges++;t.add('Retry without the original payment key charges again');}
    else if(c.failure==='after-charge')t.add('Stable payment key returns the existing result');
    s.order='paid';s.outbox=c.design==='protected';t.add(s.outbox?'Commit paid status and outbox intent together':'Commit paid status without an outbox');
    if(c.failure==='after-publish'){s.deliveries++;s.effects++;t.add('Publish dispatch event before recording relay progress');}
    t.add('Restart relay after failure');
    if(s.outbox){s.deliveries++;if(!s.effects)s.effects++;t.add('Publish/replay event; inbox deduplicates the dispatch effect');}
    s.completed=true;t.add('Verify order, inventory, charges and dispatch independently');
    return t.finish();
  }
  throw Error('No transition implementation');
}

export function recoverModel(id, state) {
  if(id==='recovery-engine')return recoverEngine(state);
  if(id==='aries')return recoverAries(state);
  const s=clone(state);
  if(id==='files') {
    const recovered=s.durableName==='old'?'old':s.durableTemp==='new'?'new':'incomplete';
    return {state:{...s,recovered},checks:[flag('recovered target is a complete old or new file',recovered!=='incomplete'),flag('an acknowledged replacement is recovered',s.acknowledged?recovered==='new':null)],label:'Discard volatile contents and names; recover durable namespace'};
  }
  if(id==='wal') {
    if(s.commitDurable&&s.logDurable)s.disk=clone(s.log);
    const old=s.disk.alice===100&&s.disk.bob===100,newState=s.disk.alice===70&&s.disk.bob===130;
    return {state:s,checks:[flag('transfer recovers all old or all new',old||newState),flag('acknowledged transfer is recovered',s.acknowledged?newState:null)],label:s.commitDurable?'Replay committed after-images':'Ignore uncommitted log; retain durable pages'};
  }
  if(id==='recovery') {
    if(s.logPresent){s.balance=s.representation==='increment'?s.balance+s.amount:s.target;s.replays++;}
    return {state:s,checks:[flag('replay applies the committed effect exactly once',s.balance===s.target)],label:'Restart and replay the surviving committed log record again'};
  }
  throw Error('This lab has no crash/recovery transition.');
}
export const crashModels = new Set(['files','wal','recovery','recovery-engine','aries']);
