import {publish,visible,hasCycle,validate,needsRedo,upToDate} from './mechanisms.js';
const entry=(term,index)=>({term,index});
const snap={self:8,xmax:10,active:[6]};
const states={0:'committed',2:'committed',3:'aborted',4:'committed',6:'committed',8:'active',11:'committed'};
const v=(xmin,xmax=null)=>({xmin,xmax});
export const benches={
  'transaction-manager':{
    title:'Implement publication',contract:'solve(base, writes, status) returns a new public object. Publish writes only for status "committed". Keep base and writes unchanged.',
    starter:'function solve(base, writes, status) {\n  return {...base, ...writes}; // Which state permits publication?\n}',reference:publish,
    cases:[{name:'active writes remain private',args:[{alice:100,bob:100},{alice:70},'active'],expected:{alice:100,bob:100}}, {name:'aborted writes disappear',args:[{alice:100},{alice:70},'aborted'],expected:{alice:100}}, {name:'commit publishes the complete set',args:[{alice:100,bob:100},{alice:70,bob:130},'committed'],expected:{alice:70,bob:130}}, {name:'empty transaction preserves unrelated data',args:[{stock:3},{},'committed'],expected:{stock:3}}]},
  mvcc:{
    title:'Implement tuple visibility',contract:'solve(version, snapshot, statuses) returns a boolean. version has xmin/xmax; null xmax means no deleter. A transaction is visible if it is self, or committed AND below snapshot.xmax AND absent from snapshot.active. The creator must be visible and the deleter must not be visible.',
    starter:'function solve(version, snapshot, statuses) {\n  return version.xmax === null; // Does every undeleted tuple belong to this snapshot?\n}',reference:visible,
    cases:[{name:'old committed insertion',args:[v(2),snap,states],expected:true},{name:'aborted creator',args:[v(3),snap,states],expected:false},{name:'creator started after snapshot',args:[v(11),snap,states],expected:false},{name:'creator active at snapshot, committed now',args:[v(6),snap,states],expected:false},{name:'read own insertion',args:[v(8),snap,states],expected:true},{name:'committed earlier deletion',args:[v(2,4),snap,states],expected:false},{name:'aborted deletion keeps the old version',args:[v(2,3),snap,states],expected:true},{name:'deletion active at snapshot',args:[v(2,6),snap,states],expected:true},{name:'read own deletion',args:[v(2,8),snap,states],expected:false},{name:'future deletion does not erase snapshot history',args:[v(2,11),snap,states],expected:true}]},
  'lock-manager':{
    title:'Implement deadlock detection',contract:'solve(graph) returns true exactly when the directed wait-for graph contains a cycle. Keys are transaction IDs; each array lists owners that transaction waits for. A shared dependency and a long acyclic chain are not cycles.',
    starter:'function solve(graph) {\n  return Object.keys(graph).length > 1; // Replace this guess with graph traversal.\n}',reference:hasCycle,
    cases:[{name:'empty graph',args:[{}],expected:false},{name:'one blocking edge',args:[{A:['B']}],expected:false},{name:'two-way cycle',args:[{A:['B'],B:['A']}],expected:true},{name:'three-way cycle',args:[{A:['B'],B:['C'],C:['A']}],expected:true},{name:'diamond with shared downstream owner',args:[{A:['B','C'],B:['D'],C:['D'],D:[]}],expected:false},{name:'cycle in disconnected component',args:[{A:[],B:['C'],C:['B']}],expected:true},{name:'long acyclic chain',args:[{A:['B'],B:['C'],C:['D']}],expected:false},{name:'self cycle',args:[{A:['A']}],expected:true}]},
  validation:{
    title:'Implement optimistic validation',contract:'solve(readVersions, currentVersions) returns true only when every recorded read version still equals the current version. Missing current keys conflict too. Empty read sets are valid.',
    starter:'function solve(readVersions, currentVersions) {\n  return true; // What did another commit invalidate?\n}',reference:validate,
    cases:[{name:'no intervening write',args:[{A:2,B:3},{A:2,B:3}],expected:true},{name:'one stale read',args:[{A:2,B:3},{A:4,B:3}],expected:false},{name:'unrelated key changed',args:[{A:2},{A:2,B:9}],expected:true},{name:'read row was removed',args:[{A:2},{}],expected:false},{name:'empty read set',args:[{},{A:5}],expected:true},{name:'zero is a real version',args:[{A:0},{A:0}],expected:true}]},
  'recovery-engine':{
    title:'Implement the page redo guard',contract:'solve(pageLSN, recordLSN) returns true only when the data page has not incorporated this log record. LSNs are monotonic nonnegative integers. Equal means already applied.',
    starter:'function solve(pageLSN, recordLSN) {\n  return pageLSN <= recordLSN; // What happens on the second recovery?\n}',reference:needsRedo,
    cases:[{name:'newer log record',args:[2,5],expected:true},{name:'already applied record',args:[5,5],expected:false},{name:'page is ahead',args:[9,5],expected:false},{name:'first record on an empty page',args:[0,1],expected:true},{name:'equal zero positions',args:[0,0],expected:false}]},
  'replicated-log':{
    title:'Implement the election log check',contract:'solve(candidateLog, voterLog) returns true when the candidate is at least as up to date: compare last-entry term first, then index if terms tie. An empty log has term 0/index 0. Log length alone is insufficient.',
    starter:'function solve(candidateLog, voterLog) {\n  return candidateLog.length >= voterLog.length;\n}',reference:upToDate,
    cases:[{name:'two empty logs',args:[[],[]],expected:true},{name:'older term despite longer log',args:[[entry(1,1),entry(1,2)],[entry(2,1)]],expected:false},{name:'newer term despite shorter log',args:[[entry(3,1)],[entry(2,1),entry(2,2)]],expected:true},{name:'same term but missing suffix',args:[[entry(2,1)],[entry(2,1),entry(2,2)]],expected:false},{name:'identical last position',args:[[entry(2,1)],[entry(2,1)]],expected:true},{name:'empty candidate against nonempty voter',args:[[],[entry(1,1)]],expected:false}]},
};
export function referenceSource(id) {return benches[id].reference.toString().replace(/^function \w+/, 'function solve');}
export function evaluateImplementation(id, source) {
  const bench=benches[id];if(!bench)throw Error('Unknown implementation bench.');
  if(typeof source!=='string'||source.length>20000)throw Error('Keep the implementation below 20,000 characters.');
  const solve=new Function(`"use strict"; return (${source});`)();
  if(typeof solve!=='function')throw Error('Define a function solve.');
  return bench.cases.map(item=>{
    const args=structuredClone(item.args),before=JSON.stringify(args);
    try {
      const actual=solve(...args),mutated=JSON.stringify(args)!==before;
      const normalize=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,normalize(v)])):value;
      const pass=!mutated&&JSON.stringify(normalize(actual))===JSON.stringify(normalize(item.expected));
      return {name:item.name,input:item.args,expected:item.expected,actual:actual===undefined?'undefined':actual,mutated,pass};
    }catch(error){return {name:item.name,input:item.args,expected:item.expected,error:error.message,pass:false};}
  });
}
