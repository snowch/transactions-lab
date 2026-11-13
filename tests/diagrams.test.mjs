import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagramSpec} from '../web/diagrams.js';
import {definitions,runModel,recoverModel} from '../web/models.js';
const last=run=>run.steps.at(-1).state;
const spec=(id,preset='repaired')=>diagramSpec(id,last(runModel(id,definitions[id].presets[preset])),definitions[id].presets[preset]);
test('MVCC drawing selects retained versions using the actual pinned or fresh-statement visibility rule',()=>{
  const pinned=spec('mvcc');assert.deepEqual(pinned.versions.filter(v=>v.selected).map(v=>v.value),[100]);
  const statement=spec('mvcc','new-snapshot');assert.deepEqual(statement.versions.filter(v=>v.selected).map(v=>v.value),[70]);
  const lost=spec('mvcc','broken');assert.equal(lost.versions.some(v=>v.selected),false);assert.deepEqual(lost.removed,['v0']);
});
test('wait and read/write diagrams preserve direction, cycles and rejected-versus-committed graphs',()=>{
  const deadlock=spec('lock-manager','broken');assert.deepEqual(deadlock.edges,[{from:'A',to:'B'},{from:'B',to:'A'}]);assert.equal(deadlock.cyclic,true);
  const repaired=spec('lock-manager');assert.equal(repaired.cyclic,false);assert.equal(repaired.nodes.find(n=>n.id==='B').status,'aborted');
  const rejected=spec('write-skew');assert.equal(rejected.rejected,true);assert.equal(rejected.cyclic,true);assert.ok(rejected.summary.includes('rejected'));
});
test('WAL drawing distinguishes buffered log records and a page persisted ahead of its dependency',()=>{
  const input=definitions['recovery-engine'].presets.broken;
  const step=runModel('recovery-engine',input).steps.find(step=>step.state.disk.alice.pageLSN===2&&step.state.flushedLSN===0);
  const drawing=diagramSpec('recovery-engine',step.state,input);
  assert.equal(drawing.pages.find(p=>p.name==='alice').unsafe,true);assert.equal(drawing.records.every(r=>!r.durable),true);
  const good=spec('recovery-engine');assert.equal(good.pages.some(p=>p.unsafe),false);assert.ok(good.records.every(r=>r.durable));
});
test('ARIES drawing shows the actual CLR pointers and durable state before or after a crash',()=>{
  const input=definitions.aries.presets.repaired,trace=runModel('aries',input);
  const point=trace.steps.find(step=>step.state.log.at(-1)?.type==='CLR'&&step.state.log.at(-1).lsn===13&&step.state.flushedLSN===13);
  const drawing=diagramSpec('aries',point.state,input);assert.equal(drawing.clr.prevLSN,11);assert.equal(drawing.clr.undoNextLSN,5);assert.equal(drawing.compensated.lsn,8);assert.equal(drawing.previous.type,'ABORT');assert.equal(drawing.next.type,'UPDATE');
  const recovered=recoverModel('aries',point.state);const after=diagramSpec('aries',recovered.state,input);assert.equal(after.phase,'complete');assert.equal(after.link,'undoNextLSN');
});
test('replication and 2PC drawings distinguish local state from committed knowledge',()=>{
  const replicas=spec('replicated-log');assert.equal(replicas.nodes.find(n=>n.name==='A').live,false);assert.equal(replicas.nodes.find(n=>n.name==='B').entries.filter(e=>e.committed).length,2);
  const prepared=spec('two-phase');assert.equal(prepared.decision,'commit');assert.equal(prepared.participants.find(p=>p.name==='B').delivered,false);assert.equal(prepared.participants.find(p=>p.name==='B').held,true);
});
test('diagram projection leaves every source snapshot unchanged and unsupported labs have no invented visual',()=>{
  for(const [id,def] of Object.entries(definitions))for(const input of Object.values(def.presets)){
    const state=last(runModel(id,input)),before=structuredClone(state);diagramSpec(id,state,input);assert.deepEqual(state,before);
  }
  assert.equal(diagramSpec('unrecognized',{}),null);
});
