export const groups = [
  {title:'I · Build a transaction', pages:[
    ['invariants','State the invariant','sql'],
    ['transaction-manager','Build the transaction manager','model','transaction-manager'],
    ['atomicity','Make a transfer atomic','sql'],
    ['constraints','Reserve the last item','sql']]},
  {title:'II · Implement isolation', pages:[
    ['mvcc','Build MVCC visibility','model','mvcc'],
    ['lost-update','Lose an update','model','lost-update'],
    ['write-skew','Break a rule with snapshots','model','write-skew'],
    ['validation','Validate a transaction','model','validation'],
    ['lock-manager','Build the lock manager','model','lock-manager'],
    ['locks','Build a deadlock','model','locks'],
    ['retries','Retry the whole decision','model','retries'],
    ['contention','Correct, but waiting','model','contention']]},
  {title:'III · Implement durability', pages:[
    ['files','Replace a file safely','model','files'],
    ['wal','Find the commit point','model','wal'],
    ['recovery-engine','Build log recovery','model','recovery-engine'],
    ['recovery','Crash during recovery','model','recovery']]},
  {title:'IV · Implement distributed decisions', pages:[
    ['two-phase','Lose the coordinator','model','two-phase'],
    ['consensus','Separate agreement from commit','model','consensus'],
    ['replicated-log','Replicate the decision log','model','replicated-log']]},
  {title:'V · Cross application boundaries', pages:[
    ['outbox','Close the dual-write gap','hybrid','outbox'],
    ['idempotency','Did it commit?','model','idempotency'],
    ['sagas','Undo a workflow','model','sagas']]},
  {title:'VI · Defend the implementation', pages:[
    ['order-workflow','Break the order service','model','order-workflow'],
    ['design-review','Defend your transaction','reading']]},
];
groups.push({title:'Advanced · Optional',optional:true,pages:[['aries','A1 · ARIES recovery','model','aries']]});
let number=0;
for(const group of groups)for(const page of group.pages)if(!group.optional)page[1]=`${String(++number).padStart(2,'0')} · ${page[1]}`;
export const labs = groups.flatMap(g=>g.pages.map(([slug,title,runtime,model])=>({slug,title,runtime,model,optional:Boolean(g.optional),group:g.title,file:`chapters/${slug}.md`})));
export const coreLabs=labs.filter(l=>!l.optional);
export const advancedLabs=labs.filter(l=>l.optional);
export const pages = [
  {slug:'index',title:'Transactions Lab',file:'chapters/index.md',runtime:'overview'},
  ...labs,
  {slug:'native',title:'Run against real systems',file:'chapters/native.md',runtime:'reference'},
  {slug:'runtime',title:'Runtime, sources and boundaries',file:'chapters/runtime.md',runtime:'reference'},
];
