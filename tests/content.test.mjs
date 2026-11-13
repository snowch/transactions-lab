import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {labs,pages,coreLabs,advancedLabs} from '../scripts/catalog.mjs';
import {definitions} from '../web/models.js';
import {benches} from '../web/benchmarks.js';
test('all investigations offer experiment, feedback, transfer and design record',async()=>{
  assert.equal(coreLabs.length,24);assert.equal(advancedLabs.length,1);assert.equal(advancedLabs[0].slug,'aries');assert.equal(advancedLabs[0].optional,true);
  for(const lab of labs){
    const source=await readFile(lab.file,'utf8'),html=await readFile(`dist/${lab.slug}.html`,'utf8');
    assert.match(source,/Transfer the idea/);assert.match(source,/<details>/);assert.match(html,/data-note="invariant"/);
    if(lab.model){assert.ok(definitions[lab.model]);assert.match(html,/class="experiment"/);assert.ok(!html.includes('<!-- experiment -->'));}
    if(benches[lab.model]){assert.match(html,/class="implementation-bench"/);assert.match(html,/Read the engine code executed/);assert.ok(!html.includes('<!-- implementation -->'));}
    assert.ok(source.length>1500,`${lab.slug}: substantive investigation`);
  }
});
test('every generated local page and download link resolves, including fragments',async()=>{
  for(const page of pages){
    const html=await readFile(`dist/${page.slug}.html`,'utf8');
    for(const [,link] of html.matchAll(/(?:href|src)="([^"?#]+(?:#[^"]*)?)"/g)){
      if(/^(https?:|data:)/.test(link))continue;
      const [path,fragment]=link.split('#');const target=resolve('dist',path||`${page.slug}.html`);
      await access(target);
      if(fragment){const destination=await readFile(target,'utf8');assert.ok(destination.includes(`id="${fragment}"`),`${page.slug}: ${link}`);}
    }
  }
});
