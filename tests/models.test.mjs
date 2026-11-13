import {test} from 'node:test';
import assert from 'node:assert/strict';
import {definitions,runModel,recoverModel} from '../web/models.js';
const last=run=>run.steps.at(-1);
const failures=step=>step.checks.filter(check=>check.pass===false);
for(const [id,def] of Object.entries(definitions)){
  for(const [name,input] of Object.entries(def.presets))test(`${id}/${name}: executable trace and explicit predicates`,()=>{
    const run=runModel(id,input);
    assert.ok(run.steps.length>=2);
    assert.equal(run.steps[0].label,'Initial state');
    assert.ok(run.steps.every(step=>step.state&&step.checks.length&&step.checks.every(check=>[true,false,null].includes(check.pass))));
    if(name==='repaired')assert.equal(failures(last(run)).length,0);
  });
}
test('all legal two-client schedules: atomic conditional reservation conserves inventory',()=>{
  const actions=['A.read','B.read','A.write','B.write'];
  function permutations(xs){return xs.length?xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>i!==j)).map(p=>[x,...p])):[[]];}
  let lost=0;
  for(const schedule of permutations(actions).filter(xs=>xs.indexOf('A.read')<xs.indexOf('A.write')&&xs.indexOf('B.read')<xs.indexOf('B.write'))){
    for(const stock of [1,2,5])assert.equal(failures(last(runModel('lost-update',{strategy:'conditional',stock,schedule}))).length,0);
    if(failures(last(runModel('lost-update',{strategy:'read-write',stock:2,schedule}))).length)lost++;
  }
  assert.ok(lost>0,'at least one interleaving exposes the stale write');
});
test('every prefix of the durable file protocol recovers complete data and honours acknowledgement',()=>{
  for(const step of runModel('files',definitions.files.presets.repaired).steps)assert.equal(failures(recoverModel('files',step.state)).length,0,step.label);
  const renameOnly=runModel('files',definitions.files.presets.broken);
  assert.ok(failures(recoverModel('files',last(renameOnly).state)).length);
  const badOrder=runModel('files',definitions.files.presets['unsafe-order']);
  assert.equal(recoverModel('files',last(badOrder).state).state.recovered,'incomplete');
});
test('every WAL prefix preserves all-or-none; in-place mid-write loses money',()=>{
  for(const step of runModel('wal',definitions.wal.presets.repaired).steps){
    const result=recoverModel('wal',step.state);assert.equal(failures(result).length,0,step.label);
    assert.equal(result.state.disk.alice+result.state.disk.bob,200);
  }
  const broken=runModel('wal',definitions.wal.presets.broken).steps.find(s=>s.state.disk.alice===70&&s.state.disk.bob===100);
  assert.ok(failures(recoverModel('wal',broken.state)).length);
});
test('recovery remains correct across repeated recovery crashes only with replay-safe records',()=>{
  for(const representation of ['increment','after-image']){
    let state=last(runModel('recovery',{representation,initial:100,amount:20})).state;
    for(let n=0;n<5;n++)state=recoverModel('recovery',state).state;
    assert.equal(state.balance,representation==='after-image'?120:220);
  }
});
test('safety and progress are distinct after coordinator failure',()=>{
  const bad=last(runModel('two-phase',definitions['two-phase'].presets.broken));assert.ok(failures(bad).length);
  const wait=last(runModel('two-phase',definitions['two-phase'].presets.repaired));assert.equal(failures(wait).length,0);assert.equal(wait.state.progress,'blocked');
  const recovered=last(runModel('two-phase',definitions['two-phase'].presets.recovered));assert.equal(recovered.state.B,'committed');
});
test('a quorum does not manufacture a missing participant vote',()=>{
  const result=last(runModel('consensus',{replicas:3,reachable:2,decision:'unknown'}));assert.equal(result.state.decision,null);assert.equal(result.state.progress,'waiting');
});
test('outbox replay duplicates deliveries; capstone inbox preserves effects',()=>{
  assert.equal(last(runModel('outbox',definitions.outbox.presets.duplicate)).state.published,2);
  const result=last(runModel('order-workflow',definitions['order-workflow'].presets.replay));
  assert.equal(result.state.deliveries,2);assert.equal(result.state.effects,1);assert.equal(result.state.charges,1);assert.equal(failures(result).length,0);
});
test('ambiguous outcome repair binds key and payload; compensation must finish',()=>{
  assert.equal(last(runModel('idempotency',definitions.idempotency.presets.broken)).state.charges,2);
  const conflict=last(runModel('idempotency',definitions.idempotency.presets.conflict));assert.equal(conflict.state.response,'payload conflict rejected');
  assert.ok(failures(last(runModel('idempotency',{...definitions.idempotency.presets.conflict,binding:'unchecked'}))).length);
  assert.ok(failures(last(runModel('sagas',definitions.sagas.presets.broken))).length);
  assert.equal(last(runModel('sagas',definitions.sagas.presets.repaired)).state.stock,1);
});
test('invalid configuration is rejected before unbounded work or misleading execution',()=>{
  assert.throws(()=>runModel('contention',{lock:'global',requests:100000,keys:4,service:3}),/requests/);
  assert.throws(()=>runModel('lost-update',{strategy:'read-write',stock:2,schedule:['A.write']}),/read/);
  assert.throws(()=>runModel('lost-update',{strategy:'read-write',stock:2,schedule:['A.read','A.read']}),/once/);
  assert.throws(()=>runModel('consensus',{replicas:4,reachable:2,decision:'commit'}),/odd/);
  assert.throws(()=>runModel('files',{protocol:'invented'}),/protocol/);
});
