import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mechanismDefinitions as d,transactionManager,mvcc,lockManager,validation,recoveryEngine,recoverEngine,replicatedLog,hasCycle,snapshotDependencies} from '../web/mechanisms.js';
import {benches,referenceSource,evaluateImplementation} from '../web/benchmarks.js';
const last=trace=>trace.steps.at(-1),fails=step=>step.checks.some(c=>c.pass===false);
for(const [id,bench] of Object.entries(benches))test(`${id}: reference meets independently specified cases, starter exposes a real defect`,()=>{
  assert.ok(evaluateImplementation(id,referenceSource(id)).every(c=>c.pass));
  assert.ok(evaluateImplementation(id,bench.starter).some(c=>!c.pass));
});
test('cycle detection agrees with independent topological elimination on all 512 three-node graphs',()=>{
  const nodes=['A','B','C'];
  for(let mask=0;mask<512;mask++){
    const graph=Object.fromEntries(nodes.map((node,i)=>[node,nodes.filter((_,j)=>mask&(1<<(i*3+j)))]));
    const degrees=Object.fromEntries(nodes.map(node=>[node,0]));for(const edges of Object.values(graph))for(const node of edges)degrees[node]++;
    const ready=nodes.filter(n=>degrees[n]===0);let removed=0;
    while(ready.length){const node=ready.pop();removed++;for(const next of graph[node])if(--degrees[next]===0)ready.push(next);}
    assert.equal(hasCycle(graph),removed!==nodes.length,JSON.stringify(graph));
  }
});
test('private publication hides every partial prefix and abort retains original data',()=>{
  for(const step of transactionManager(d['transaction-manager'].presets.repaired).steps)assert.equal(fails(step),false);
  assert.ok(transactionManager(d['transaction-manager'].presets.broken).steps.some(fails));
  assert.deepEqual(last(transactionManager(d['transaction-manager'].presets.abort)).state.public,{alice:100,bob:100});
  assert.throws(()=>transactionManager({publication:'commit',schedule:['commit','write:alice:70']}),/active/);
});
test('MVCC protects pinned history, active-at-capture membership and active future versions',()=>{
  assert.ok(fails(last(mvcc(d.mvcc.presets.broken))));
  const repaired=last(mvcc(d.mvcc.presets.repaired));assert.deepEqual(repaired.state.reads.map(r=>r.value),[100,100,100]);
  assert.equal(repaired.state.versions.length,2);
  const statement=last(mvcc(d.mvcc.presets['new-snapshot']));assert.deepEqual(statement.state.reads.map(r=>r.value),[100,70,70]);
  const earlier=mvcc({isolation:'repeatable-read',retention:'snapshot-aware',schedule:['begin-writer','begin-reader','read-reader','write','commit-writer','read-reader']});
  assert.deepEqual(last(earlier).state.reads.map(r=>r.value),[100,100]);assert.deepEqual(last(earlier).state.snapshot.active,[1]);
  const active=mvcc({isolation:'repeatable-read',retention:'snapshot-aware',schedule:['begin-reader','begin-writer','write','vacuum','commit-writer','read-reader']});
  assert.equal(last(active).state.versions.length,2);
  const aborted=mvcc({isolation:'repeatable-read',retention:'snapshot-aware',schedule:['begin-reader','begin-writer','write','abort-writer','vacuum','read-reader']});
  assert.equal(last(aborted).state.versions.length,1);assert.equal(last(aborted).state.reads[0].value,100);
});
test('lock grants follow compatibility; cycle abort releases an actual owner and wakes upgrade',()=>{
  const repaired=last(lockManager(d['lock-manager'].presets.repaired)).state;
  assert.deepEqual(repaired.victims,['B']);assert.deepEqual(repaired.locks.bike.holders,{A:'X'});assert.deepEqual(repaired.locks.bike.queue,[]);
  const blocked=lockManager({deadlock:'abort-youngest',schedule:['A:X:bike','B:S:bike','A:commit','B:commit']});
  assert.equal(blocked.steps.find(s=>s.state.waitFor.B).state.locks.bike.queue[0].tx,'B');
  assert.equal(last(blocked).state.transactions.B,'committed');
  assert.throws(()=>lockManager({deadlock:'ignore',schedule:['A:X:bike','B:S:bike','B:commit']}),/waiting/);
});
test('OCC derives abort from the stale read version rather than a fixed second-commit rule',()=>{
  const broken=last(validation(d.validation.presets.broken));assert.ok(fails(broken));
  const repaired=last(validation(d.validation.presets.repaired));assert.equal(repaired.state.transactions.T2.status,'aborted');
  assert.deepEqual(repaired.state.validationChecks.at(-1).tested,{A:0,B:0});assert.equal(repaired.state.validationChecks.at(-1).current.A,1);
  const disjoint=validation({validation:'read-set',schedule:['T1:begin','T2:begin','T1:read:A','T2:read:B','T1:write:A:false','T2:write:B:true','T1:commit','T2:commit']});
  assert.equal(last(disjoint).state.transactions.T2.status,'committed');
});
test('write skew builds read/write edges and rejects the actual cyclic candidate graph',()=>{
  const broken=last(snapshotDependencies({isolation:'snapshot',schedule:['A.read','B.read','A.write','B.write']}));
  assert.ok(hasCycle(broken.state.dependencies));assert.ok(fails(broken));
  const repaired=last(snapshotDependencies({isolation:'serializable',schedule:['A.read','B.read','B.write','A.write']}));
  assert.deepEqual(repaired.state.aborts,['A']);assert.ok(hasCycle(repaired.state.rejectedDependencies));assert.equal(hasCycle(repaired.state.dependencies),false);
});
test('steal/no-force recovery preserves every repaired prefix, including loser checkpoints',()=>{
  for(const preset of ['repaired','loser'])for(const step of recoveryEngine(d['recovery-engine'].presets[preset]).steps){
    const recovered=recoverEngine(step.state);assert.equal(fails(recovered),false,`${preset}: ${step.label}`);
    assert.equal(recovered.state.disk.alice.value+recovered.state.disk.bob.value,200);
    const twice=recoverEngine(recovered.state);assert.deepEqual(twice.state.disk,recovered.state.disk);
  }
  const bad=recoveryEngine(d['recovery-engine'].presets.broken).steps.find(s=>s.state.disk.alice.value===70&&s.state.flushedLSN===0);
  assert.ok(fails(recoverEngine(bad.state)));
  const committed=recoverEngine(last(recoveryEngine(d['recovery-engine'].presets.repaired)).state);
  assert.deepEqual(committed.state.analysis.winners,['T1']);assert.equal(committed.state.redo.find(r=>r.page==='bob').applied,true);
  assert.deepEqual(committed.state.undo,[]);
  const loser=recoverEngine(last(recoveryEngine(d['recovery-engine'].presets.loser)).state);
  assert.deepEqual(loser.state.analysis.losers,['T1']);assert.equal(loser.state.undo[0].restored,100);
  const chain=recoveryEngine({wal:'enforced',schedule:['update:alice:-10','checkpoint','update:alice:-20','flush:alice','update:bob:30','checkpoint']});
  const undone=recoverEngine(last(chain).state);assert.deepEqual(undone.state.undo.map(r=>r.lsn),[5,4,2]);assert.equal(fails(undone),false);
  assert.equal(last(chain).state.log.find(r=>r.lsn===4).prevLSN,2);assert.equal(undone.state.analysis.undoStartLSN,5);
  assert.deepEqual(undone.state.analysis.analysisScannedLSNs,[]);
});
test('replicated-log repair preserves acknowledged history through actual election and prefix backtracking',()=>{
  const broken=last(replicatedLog(d['replicated-log'].presets.broken));assert.ok(fails(broken));assert.equal(broken.state.recovered,null);
  const trace=replicatedLog(d['replicated-log'].presets.repaired),s=last(trace).state;
  assert.equal(fails(last(trace)),false);assert.equal(s.leader,'B');assert.equal(s.recovered.command,'COMMIT');assert.equal(s.nodes.B.commitIndex,2);
  assert.ok(trace.steps.some(step=>step.state.rpc?.result.includes('mismatch')));
  assert.deepEqual(s.nodes.B.log,s.nodes.C.log);
  const noQuorum=last(replicatedLog(d['replicated-log'].presets['missing-majority']));assert.equal(noQuorum.state.acknowledged.length,0);
  assert.throws(()=>replicatedLog({...d['replicated-log'].presets.repaired,schedule:d['replicated-log'].presets.repaired.schedule.map(op=>op==='elect:B'?'elect:C':op)}),/Elect a live leader/);
});

test('downloadable implementation checker runs an exported learner function and rejects its defective starter',async()=>{
  const {mkdtemp,writeFile,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');
  const folder=await mkdtemp(join(tmpdir(),'txbench-'));
  try{
    const path=join(folder,'solution.mjs');
    await writeFile(path,`export default ${referenceSource('mvcc')}`);
    const good=spawnSync(process.execPath,['web/verify-implementation.mjs','mvcc',path],{encoding:'utf8'});
    assert.equal(good.status,0,good.stderr);assert.match(good.stdout,/PASS · creator active at snapshot/);
    await writeFile(path,`export default ${benches.mvcc.starter}`);
    const bad=spawnSync(process.execPath,['web/verify-implementation.mjs','mvcc',path],{encoding:'utf8'});
    assert.equal(bad.status,1);assert.match(bad.stdout,/FAIL · aborted creator/);
  }finally{await rm(folder,{recursive:true,force:true});}
});
