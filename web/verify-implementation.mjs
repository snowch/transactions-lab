// Run from the repo: node web/verify-implementation.mjs mvcc ./mvcc-implementation.mjs
// Or download this script, mechanisms.js and benchmarks.js into the same folder.
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {evaluateImplementation,benches} from './benchmarks.js';
const [id,path]=process.argv.slice(2);
if(!benches[id]||!path){console.error('Usage: node verify-implementation.mjs <mechanism-id> <implementation.mjs>');process.exit(2);}
const implementation=await import(pathToFileURL(resolve(path)).href);
const results=evaluateImplementation(id,implementation.default.toString());
for(const result of results)console.log(`${result.pass?'PASS':'FAIL'} · ${result.name}${result.pass?'':' '+JSON.stringify(result)}`);
if(results.some(r=>!r.pass))process.exitCode=1;
