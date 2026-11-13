import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const compose=['compose','-p','transactions-lab-verification','-f',fileURLToPath(new URL('./compose.yml',import.meta.url))];
const command=(args)=>{const r=spawnSync('docker',[...compose,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:180000});if(r.status!==0)throw Error(r.stderr||r.error?.message||`docker exited ${r.status}`);return r.stdout;};
let serial=0;
const sessions=[];
class Session {
  constructor(name){
    this.child=spawn('docker',[...compose,'exec','-T','-e',`PGAPPNAME=${name}`,'db','psql','-X','-A','-t','-q','-U','postgres','-d','transactions','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose'],{stdio:['pipe','pipe','pipe']});
    this.output='';this.errors='';this.pending=null;this.dead=false;
    this.child.stdout.on('data',data=>{this.output+=data.toString();this.check();});
    this.child.stderr.on('data',data=>{this.errors+=data.toString();});
    this.child.on('error',error=>this.fail(error));
    this.child.on('close',code=>{this.dead=true;if(this.pending)this.fail(Error(this.errors||`session ${name} exited ${code}`));});
    sessions.push(this);
  }
  check(){if(this.pending&&this.output.includes(this.pending.marker)){const {resolve,timer,marker}=this.pending;clearTimeout(timer);const text=this.output.slice(0,this.output.indexOf(marker)).trim();this.output=this.output.slice(this.output.indexOf(marker)+marker.length);this.pending=null;resolve(text);}}
  fail(error){if(this.pending){clearTimeout(this.pending.timer);this.pending.reject(error);this.pending=null;}}
  query(sql){if(this.pending||this.dead)return Promise.reject(Error('Session is busy or closed'));this.output='';const marker=`txlab_marker_${++serial}`;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{this.fail(Error('Session timed out: '+this.errors));this.close();},20000);this.pending={resolve,reject,timer,marker};this.child.stdin.write(`${sql}\n\\echo ${marker}\n`);});}
  close(){this.child.stdin.end();if(!this.dead)this.child.kill();}
}
const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
async function waitBlocked(observer,name){for(let i=0;i<80;i++){if((await observer.query(`SELECT count(*) FROM pg_stat_activity WHERE application_name='${name}' AND wait_event_type='Lock';`))==='1')return;await pause();}throw Error('Expected a real lock wait for '+name);}
try{
  process.stdout.write('Starting disposable PostgreSQL 17 service…\n');
  command(['up','-d','--wait','--wait-timeout','90']);
  const o=new Session('tx-observer');
  await o.query('DROP SCHEMA IF EXISTS lab CASCADE; CREATE SCHEMA lab; CREATE TABLE lab.inventory(sku text PRIMARY KEY, stock int CHECK(stock>=0)); INSERT INTO lab.inventory VALUES (\'bike\',1),(\'helmet\',1);');
  const a=new Session('tx-a'),b=new Session('tx-b');
  await a.query("BEGIN; UPDATE lab.inventory SET stock=stock-1 WHERE sku='bike' AND stock>0;");
  const reserve=b.query("BEGIN; UPDATE lab.inventory SET stock=stock-1 WHERE sku='bike' AND stock>0 RETURNING stock; COMMIT;");
  await waitBlocked(o,'tx-b');await a.query('COMMIT;');
  assert.equal(await reserve,'');assert.equal(await o.query("SELECT stock FROM lab.inventory WHERE sku='bike';"),'0');
  console.log('PASS · independent clients: blocked conditional reservation rechecks stock');
  await o.query("CREATE TABLE lab.on_call(name text PRIMARY KEY, available boolean); INSERT INTO lab.on_call VALUES ('A',true),('B',true);");
  for(const isolation of ['REPEATABLE READ','SERIALIZABLE']){
    await o.query('UPDATE lab.on_call SET available=true;');
    const x=new Session('tx-snapshot-a'),y=new Session('tx-snapshot-b');
    assert.equal(await x.query(`BEGIN ISOLATION LEVEL ${isolation}; SELECT count(*) FROM lab.on_call WHERE available;`),'2');
    assert.equal(await y.query(`BEGIN ISOLATION LEVEL ${isolation}; SELECT count(*) FROM lab.on_call WHERE available;`),'2');
    await x.query("UPDATE lab.on_call SET available=false WHERE name='A'; COMMIT;");
    if(isolation==='REPEATABLE READ'){
      await y.query("UPDATE lab.on_call SET available=false WHERE name='B'; COMMIT;");
      assert.equal(await o.query('SELECT count(*) FROM lab.on_call WHERE available;'),'0');
      console.log('PASS · Repeatable Read reproduces write skew');
    }else{
      await assert.rejects(y.query("UPDATE lab.on_call SET available=false WHERE name='B'; COMMIT;"),/40001/);
      const retry=new Session('tx-retry');
      await retry.query("BEGIN ISOLATION LEVEL SERIALIZABLE; UPDATE lab.on_call SET available=false WHERE name='B' AND (SELECT count(*) FROM lab.on_call WHERE available)>1; COMMIT;");
      assert.equal(await o.query('SELECT count(*) FROM lab.on_call WHERE available;'),'1');retry.close();
      console.log('PASS · Serializable aborts unsafe decision; whole-decision retry preserves roster');
    }
    x.close();y.close();
  }
  await o.query('CREATE TABLE lab.versions(id integer PRIMARY KEY,value integer); INSERT INTO lab.versions VALUES (1,100);');
  const pinned=new Session('tx-pinned-version');
  const old=await pinned.query('BEGIN ISOLATION LEVEL REPEATABLE READ; SELECT value,xmin::text FROM lab.versions;');
  const snapshot=await pinned.query('SELECT pg_current_snapshot()::text;');
  await b.query('UPDATE lab.versions SET value=70 WHERE id=1;');
  const current=await o.query('SELECT value,xmin::text FROM lab.versions;');
  assert.equal(old.split('|')[0],'100');assert.equal(current.split('|')[0],'70');assert.notEqual(old.split('|')[1],current.split('|')[1]);
  assert.equal(await pinned.query('SELECT value,xmin::text FROM lab.versions;'),old);
  assert.equal(await pinned.query('SELECT pg_current_snapshot()::text;'),snapshot);
  await pinned.query('COMMIT;');assert.equal(await pinned.query('SELECT value FROM lab.versions;'),'70');pinned.close();
  console.log('PASS · tuple creator XIDs change while a pinned snapshot retains the old version');
  const d1=new Session('tx-deadlock-a'),d2=new Session('tx-deadlock-b');
  await d1.query("BEGIN; SET LOCAL deadlock_timeout='100ms'; UPDATE lab.inventory SET stock=stock WHERE sku='bike';");
  await d2.query("BEGIN; SET LOCAL deadlock_timeout='100ms'; UPDATE lab.inventory SET stock=stock WHERE sku='helmet';");
  const waits=d1.query("UPDATE lab.inventory SET stock=stock WHERE sku='helmet'; COMMIT;");
  // Attach rejection handling immediately, before the second request closes the cycle.
  const outcome1=waits.then(value=>({value}),error=>({error}));
  await waitBlocked(o,'tx-deadlock-a');
  const outcome2=d2.query("UPDATE lab.inventory SET stock=stock WHERE sku='bike'; COMMIT;").then(value=>({value}),error=>({error}));
  const outcomes=await Promise.all([outcome1,outcome2]);
  assert.equal(outcomes.filter(x=>x.error&&/40P01/.test(x.error.message)).length,1);
  assert.equal(outcomes.filter(x=>!x.error).length,1);
  console.log('PASS · actual wait-for cycle raises SQLSTATE 40P01 and one transaction completes');
  const e1=new Session('tx-order-a'),e2=new Session('tx-order-b');
  await e1.query("BEGIN; SELECT sku FROM lab.inventory ORDER BY sku FOR UPDATE;");
  const ordered=e2.query("BEGIN; SELECT sku FROM lab.inventory ORDER BY sku FOR UPDATE; COMMIT;");
  await waitBlocked(o,'tx-order-b');await e1.query('COMMIT;');
  assert.match(await ordered,/bike\nhelmet/);
  console.log('PASS · consistent resource order waits and completes without the cycle');
} finally {
  sessions.forEach(s=>s.close());
  command(['down','-v','--remove-orphans']);
}
