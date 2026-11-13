export const groups = [
  {title:'I · Design the boundary', pages:[
    ['invariants','01 · State the invariant','sql'],
    ['atomicity','02 · Make a transfer atomic','sql'],
    ['constraints','03 · Reserve the last item','sql']]},
  {title:'II · Share the state', pages:[
    ['lost-update','04 · Lose an update','model','lost-update'],
    ['write-skew','05 · Break a rule with snapshots','model','write-skew'],
    ['locks','06 · Build a deadlock','model','locks'],
    ['retries','07 · Retry the whole decision','model','retries'],
    ['contention','08 · Correct, but waiting','model','contention']]},
  {title:'III · Survive a crash', pages:[
    ['files','09 · Replace a file safely','model','files'],
    ['wal','10 · Find the commit point','model','wal'],
    ['recovery','11 · Crash during recovery','model','recovery']]},
  {title:'IV · Agree to commit', pages:[
    ['two-phase','12 · Lose the coordinator','model','two-phase'],
    ['consensus','13 · Separate agreement from commit','model','consensus']]},
  {title:'V · Cross application boundaries', pages:[
    ['outbox','14 · Close the dual-write gap','hybrid','outbox'],
    ['idempotency','15 · Did it commit?','model','idempotency'],
    ['sagas','16 · Undo a workflow','model','sagas']]},
  {title:'VI · Defend the design', pages:[
    ['order-workflow','17 · Break the order service','model','order-workflow'],
    ['design-review','18 · Defend your transaction','reading']]},
];
export const labs = groups.flatMap(g=>g.pages.map(([slug,title,runtime,model])=>({slug,title,runtime,model,group:g.title,file:`chapters/${slug}.md`})));
export const pages = [
  {slug:'index',title:'Transactions Lab',file:'chapters/index.md',runtime:'overview'},
  ...labs,
  {slug:'native',title:'Run against real systems',file:'chapters/native.md',runtime:'reference'},
  {slug:'runtime',title:'Runtime, sources and boundaries',file:'chapters/runtime.md',runtime:'reference'},
];
