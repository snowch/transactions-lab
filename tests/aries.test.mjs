import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ariesRecovery,recoverAries,ariesFlush,mechanismDefinitions} from '../web/mechanisms.js';
const presets=mechanismDefinitions.aries.presets;
const last=run=>run.steps.at(-1),values=s=>Object.fromEntries(Object.entries(s.disk).map(([page,p])=>[page,p.value]));
const failures=result=>result.checks.filter(c=>c.pass===false);
test('ARIES repair preserves winner and removes both interleaved losers; wrong CLR link double-undoes B',()=>{
  const bad=last(ariesRecovery(presets.broken)),good=last(ariesRecovery(presets.repaired));
  assert.deepEqual(values(bad.state),{A:110,B:95,C:100});assert.ok(failures(bad).length);
  assert.deepEqual(values(good.state),{A:110,B:100,C:100});assert.equal(failures(good).length,0);
  const clrs=good.state.log.filter(r=>r.type==='CLR');
  assert.deepEqual(clrs.map(r=>r.compensates),[8,6,5]);assert.ok(clrs.every(r=>r.tx!=='T1'));
  assert.equal(clrs[0].prevLSN,11);assert.equal(clrs[0].undoNextLSN,5);
});
test('every corrected trace prefix can restart to the independently expected committed counters',()=>{
  const trace=ariesRecovery(presets.repaired);
  for(const step of trace.steps){
    const committed=step.state.log.some(r=>r.type==='COMMIT'&&r.tx==='T1'&&r.lsn<=step.state.flushedLSN);
    const result=recoverAries(step.state);
    assert.deepEqual(values(result.state),{A:committed?110:100,B:100,C:100},step.label);
    assert.equal(failures(result).length,0,step.label);
    assert.ok(result.state.log.filter(r=>r.type==='CLR').every(clr=>result.state.log.find(r=>r.lsn===clr.compensates)?.type==='UPDATE'));
  }
});
test('all supplied durability boundaries and repeated crash counts keep compensation logging bounded',()=>{
  for(const failure of ['before-clr-flush','after-clr-flush','after-undo-flush'])for(const pageFlush of ['none','B','B-and-C'])for(const attempts of [1,2,4,6]){
    const result=last(ariesRecovery({undoLink:'undoNextLSN',failure,pageFlush,attempts}));
    assert.deepEqual(values(result.state),{A:110,B:100,C:100});assert.equal(failures(result).length,0);
    assert.deepEqual(result.state.log.filter(r=>r.type==='CLR').map(r=>r.compensates).sort((a,b)=>a-b),[5,6,8]);
    for(const tx of ['T1','T2','T3'])assert.equal(result.state.log.filter(r=>r.type==='END'&&r.tx===tx).length,1);
  }
});
test('repeat-history redo includes a loser UPDATE and redoes or skips a CLR according to its pageLSN',()=>{
  const missing=ariesRecovery(presets['clr-durable-page-missing']);
  assert.ok(last(missing).state.redoDecisions.some(d=>d.pass===1&&d.lsn===6&&d.tx==='T3'&&d.applied));
  assert.ok(last(missing).state.redoDecisions.some(d=>d.pass===2&&d.lsn===13&&d.type==='CLR'&&d.applied));
  const persisted=ariesRecovery(presets.repaired);
  assert.ok(last(persisted).state.redoDecisions.some(d=>d.pass===2&&d.lsn===13&&d.type==='CLR'&&!d.applied));
  const beforeFlush=ariesRecovery(presets['clr-not-durable']);
  assert.ok(beforeFlush.steps.some(step=>step.state.analysis?.discardedLogLSNs.includes(13)));
});
test('completed ARIES restart is a fixed point for data and durable log, with no new compensation records',()=>{
  let state=last(ariesRecovery(presets['repeated-crashes'])).state;
  const disk=structuredClone(state.disk),log=structuredClone(state.log);
  for(let n=0;n<4;n++){state=recoverAries(state).state;assert.deepEqual(state.disk,disk);assert.deepEqual(state.log,log);}
});
test('ARIES enforces WAL before an undo page flush and bounds configuration work',()=>{
  assert.throws(()=>ariesFlush({buffer:{B:{value:120,pageLSN:13}},disk:{},flushedLSN:12},'B'),/WAL violation/);
  assert.throws(()=>ariesRecovery({...presets.repaired,attempts:99}),/attempts/);
  assert.throws(()=>ariesRecovery({...presets.repaired,undoLink:'guess'}),/undoLink/);
});
