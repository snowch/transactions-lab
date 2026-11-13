import {test} from 'node:test';
import assert from 'node:assert/strict';
import {definitions,runModel,recoverModel} from '../web/models.js';
const last=run=>run.steps.at(-1).state;

test('abort comparison: identical final maps can conceal different reader observations',()=>{
  const input=definitions['transaction-manager'].presets.abort;
  const safe=last(runModel('transaction-manager',input));
  const exposedRun=runModel('transaction-manager',{...input,publication:'each-write'}),exposed=last(exposedRun);
  assert.deepEqual(safe.public,{alice:100,bob:100});assert.deepEqual(exposed.public,safe.public);
  assert.deepEqual(exposed.observations[0],{alice:70,bob:100});
  assert.deepEqual(safe.observations[0],{alice:100,bob:100});
  assert.equal(exposedRun.steps.at(-1).checks.find(check=>check.name.startsWith('every recorded reader')).pass,false);
});
test('MVCC prediction: an active-at-capture writer stays outside the pinned snapshot after commit or abort',()=>{
  for(const terminal of ['commit-writer','abort-writer']){
    const state=last(runModel('mvcc',{...definitions.mvcc.presets.repaired,schedule:['begin-writer','begin-reader','read-reader','write',terminal,'read-reader','vacuum','read-reader']}));
    assert.ok(state.writer<state.snapshot.xmax);assert.ok(state.snapshot.active.includes(state.writer));
    assert.ok(state.reads.every(read=>read.value===100));assert.equal(state.versions[0].value,100);
  }
});
test('controlled comparisons hold stock or participant votes fixed',()=>{
  const input={stock:3,schedule:['A.read','B.read','A.write','B.write']};
  const stale=last(runModel('lost-update',{...input,strategy:'read-write'}));
  const conditional=last(runModel('lost-update',{...input,strategy:'conditional'}));
  assert.equal(stale.stock,2);assert.equal(stale.reservations,2);
  assert.equal(conditional.stock,1);assert.equal(conditional.reservations,2);
  assert.equal(last(runModel('consensus',{replicas:5,reachable:2,decision:'commit'})).decision,null);
  assert.equal(last(runModel('consensus',{replicas:5,reachable:3,decision:'commit'})).decision,'commit');
  assert.equal(last(runModel('consensus',{replicas:5,reachable:3,decision:'unknown'})).decision,null);
});
test('failed-election activity exposes a valid prefix before rejecting a leader-only extension',()=>{
  const input=structuredClone(definitions['replicated-log'].presets.repaired);
  input.schedule=input.schedule.slice(0,input.schedule.indexOf('elect:B')).concat('elect:C');
  const state=last(runModel('replicated-log',input));
  assert.deepEqual(state.votes,['C']);assert.equal(state.nodes.C.role,'candidate');assert.equal(state.nodes.A.live,false);
  assert.throws(()=>runModel('replicated-log',{...input,schedule:[...input.schedule,'append:NOOP']}),/Elect a live leader/);
});
test('replay prediction uses a changed fixture and recognizes a zero-amount blind spot',()=>{
  for(const representation of ['increment','after-image'])for(const amount of [5,0]){
    let state=last(runModel('recovery',{representation,initial:80,amount}));
    assert.equal(state.balance,80+amount);
    for(let i=0;i<2;i++)state=recoverModel('recovery',state).state;
    assert.equal(state.balance,representation==='increment'?80+amount*3:80+amount);
  }
});
