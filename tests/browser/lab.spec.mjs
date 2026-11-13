import {test,expect} from '@playwright/test';
import {pages,labs} from '../../scripts/catalog.mjs';
import {definitions} from '../../web/models.js';
import {benches,referenceSource} from '../../web/benchmarks.js';
import {concepts} from '../../chapters/concepts.mjs';
import {readFile} from 'node:fs/promises';

test('the complete course works under the Pages subpath without broken resources',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  for(const item of pages){
    await page.goto(`${item.slug}.html`);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    if(item.model){
      await page.getByRole('button',{name:'Run to end',exact:true}).click();
      await expect(page.locator('.model-state')).not.toHaveText('No execution yet.');
      await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('repaired');
      await page.getByRole('button',{name:'Run to end',exact:true}).click();
      await expect(page.locator('.checks .fail')).toHaveCount(0);
    }
    if(['sql','hybrid'].includes(item.runtime))await expect(page.locator('#db-status')).toContainText('Ready',{timeout:90000});
  }
  expect(errors).toEqual([]);
});

test('a learner changes a schedule, sees the violation disappear, and exports executed evidence',async({page})=>{
  await page.goto('lost-update.html');
  await page.getByRole('button',{name:'Step',exact:true}).click();
  await expect(page.locator('.model-status')).toContainText('Step 0');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(1);
  await page.locator('.config-panel summary').click();
  await page.getByRole('textbox',{name:'Experiment configuration'}).fill(JSON.stringify({...definitions['lost-update'].presets.broken,schedule:['A.read','A.write','B.read','B.write']}));
  await expect(page.getByRole('button',{name:'Download run evidence'})).toBeDisabled();
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(0);
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download run evidence'}).click();
  const download=await downloadPromise;const stream=await download.createReadStream();let content='';for await(const data of stream)content+=data;
  const record=JSON.parse(content);expect(record.input.schedule).toEqual(['A.read','A.write','B.read','B.write']);expect(record.trace.at(-1).state.reservations).toBe(2);
  await page.getByRole('textbox',{name:'Experiment configuration'}).fill('{broken');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.model-status')).toContainText('Cannot run');
  await page.getByRole('button',{name:'Restore scenario'}).click();
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(1);
});

test('crash recovery examines the selected prefix and repeated replay',async({page})=>{
  await page.goto('wal.html');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await page.getByRole('button',{name:'1. Install Alice’s page on disk',exact:true}).click();
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(1);
  await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('repaired');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(0);
  await expect(page.locator('.model-state')).toContainText('130');
  await page.goto('recovery.html');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.model-state')).toContainText('140');
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.model-state')).toContainText('160');
});

test('SQL is genuinely executable, errors roll back, edits are marked and reset recovers',async({page})=>{
  await page.goto('atomicity.html');
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:90000});
  const cells=page.locator('.sql-cell');
  for(let i=0;i<3;i++){
    await cells.nth(i).getByRole('button',{name:'Run SQL',exact:true}).click();
    await expect(page.locator('#db-status')).toContainText('Ready');
  }
  await expect(cells.nth(2).locator('.result')).toContainText('130');
  await cells.nth(2).locator('textarea').fill('BEGIN; UPDATE accounts SET balance=-1 WHERE id=\'alice\'; COMMIT;');
  await expect(cells.nth(2).locator('.execution-note')).toContainText('SQL edited');
  await cells.nth(2).getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cells.nth(2).locator('.result')).toContainText('SQL error');
  await cells.nth(2).locator('textarea').fill('SELECT sum(balance) AS total FROM accounts;');
  await cells.nth(2).getByRole('button',{name:'Run SQL',exact:true}).click();
  await expect(cells.nth(2).locator('.result')).toContainText('200');
  await page.getByRole('button',{name:'Reset database',exact:true}).click();
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:90000});
  await expect(cells.nth(2).locator('.result')).toBeEmpty();
});

test('notebook persists drafts and exports the current executed inputs and evidence',async({page})=>{
  await page.goto('idempotency.html');
  await page.locator('[data-note=prediction]').fill('I expect the retry to charge twice.');
  await page.locator('.design-record summary').click();
  await page.locator('[data-note=invariant]').fill('One charge per logical order.');
  await page.reload();
  await expect(page.locator('[data-note=prediction]')).toHaveValue('I expect the retry to charge twice.');
  await page.locator('.design-record summary').click();
  await expect(page.locator('[data-note=invariant]')).toHaveValue('One charge per logical order.');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  const pending=page.waitForEvent('download');
  await page.getByRole('button',{name:'Download notebook + evidence'}).click();
  const stream=await(await pending).createReadStream();let body='';for await(const chunk of stream)body+=chunk;
  const notebook=JSON.parse(body);expect(notebook.notes.invariant).toBe('One charge per logical order.');expect(notebook.runs[0].trace.at(-1).state.charges).toBe(2);
});

test('keyboard navigation and narrow layout retain access to chapters and experiments',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('files.html');
  await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();
  await page.keyboard.press('Enter');
  const menu=page.getByRole('button',{name:'Chapters',exact:true});await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded','true');
  await expect(page.getByRole('link',{name:labs.find(l=>l.slug==='idempotency').title,exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await expect(menu).toBeFocused();await expect(menu).toHaveAttribute('aria-expanded','false');
  await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('repaired');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/files-mobile.png',fullPage:true});
});

test('desktop and mobile reading surfaces and SQL fit the viewport',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('index.html');
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
  await page.goto('lost-update.html');await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/lost-update-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto('atomicity.html');
  await expect(page.locator('#db-status')).toContainText('Ready',{timeout:90000});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/sql-mobile.png',fullPage:true});
});

test('all implementation benches execute learner code, report edge cases and accept a correct algorithm',async({page})=>{
  for(const [id,bench] of Object.entries(benches)){
    await page.goto(`${id}.html`);
    await page.getByRole('button',{name:'Test implementation',exact:true}).click();
    await expect(page.locator('.implementation-status')).toContainText('inspect the failing inputs');
    await expect(page.locator('.implementation-results .fail')).not.toHaveCount(0);
    await page.getByRole('textbox',{name:'Your JavaScript implementation',exact:true}).fill(referenceSource(id));
    await expect(page.locator('.implementation-results>li')).toHaveCount(0);
    await page.getByRole('button',{name:'Test implementation',exact:true}).click();
    await expect(page.locator('.implementation-status')).toContainText(`${bench.cases.length} / ${bench.cases.length} cases passed`);
    await expect(page.locator('.implementation-results .fail')).toHaveCount(0);
    await page.getByRole('button',{name:'Run to end',exact:true}).click();
    await expect(page.locator('.internals-view table')).not.toHaveCount(0);
  }
});

test('implementation code persists, nonterminating code is bounded and notebook records tested source',async({page})=>{
  await page.goto('mvcc.html');
  const code=page.getByRole('textbox',{name:'Your JavaScript implementation',exact:true});
  await code.fill(referenceSource('mvcc'));await page.reload();await expect(code).toHaveValue(referenceSource('mvcc'));
  await page.getByRole('button',{name:'Test implementation',exact:true}).click();await expect(page.locator('.implementation-status')).toContainText('10 / 10 cases passed');
  const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download notebook + evidence'}).click();
  const stream=await(await pending).createReadStream();let data='';for await(const chunk of stream)data+=chunk;
  const book=JSON.parse(data);expect(book.implementations[0].testedSource).toBe(referenceSource('mvcc'));expect(book.implementations[0].results.every(r=>r.pass)).toBe(true);
  await code.fill('function solve() { while (true) {} }');await page.getByRole('button',{name:'Test implementation',exact:true}).click();
  await expect(page.locator('.implementation-status')).toContainText('Stopped after 2 seconds',{timeout:10000});
  await code.fill('function solve(');await page.getByRole('button',{name:'Test implementation',exact:true}).click();await expect(page.locator('.implementation-status')).toContainText('Cannot test');
  await page.getByRole('button',{name:'Restore starter',exact:true}).click();await expect(code).toHaveValue(benches.mvcc.starter);
});

test('internal tables, source and implementation editor remain usable at desktop and mobile widths',async({page})=>{
  await page.setViewportSize({width:1440,height:1000});await page.goto('recovery-engine.html');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(0);await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/recovery-engine-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.goto('mvcc.html');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await page.locator('.engine-source summary').click();await expect(page.locator('.engine-source pre')).toContainText('function visible');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/mvcc-mobile.png',fullPage:true});
});

test('optional ARIES lab exposes both CLR pointers and survives multiple interrupted undo passes',async({page})=>{
  await page.goto('aries.html');
  await expect(page.locator('main')).toContainText('Optional advanced lab A1');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.checks .fail')).not.toHaveCount(0);
  await expect(page.locator('.internals-view')).toContainText('undoNextLSN');
  await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('repeated-crashes');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(0);
  await expect(page.locator('.model-state')).toContainText('"complete": true');
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.checks .fail')).toHaveCount(0);
  await expect(page.locator('.model-state')).toContainText('"undoNextLSN"');
  await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:'test-results/aries-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:'test-results/aries-mobile.png',fullPage:true});
});

test('live diagrams follow execution, scenario changes and selected history without stale data',async({page})=>{
  await page.goto('mvcc.html');
  await expect(page.locator('.mechanism-visual figure')).toBeVisible();
  await expect(page.locator('.diagram-summary')).toContainText('Begin the reader');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.version-node[data-visible=true]')).toHaveCount(0);
  await expect(page.locator('.diagram-note')).toContainText('Vacuum removed: v0');
  await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('repaired');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.version-node[data-visible=true]')).toContainText('value 100');
  await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('new-snapshot');
  await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.version-node[data-visible=true]')).toContainText('value 70');
  await page.locator('.config-panel summary').click();await page.getByRole('textbox',{name:'Experiment configuration'}).fill('{invalid');
  await expect(page.locator('.mechanism-visual')).toBeHidden();
  await page.goto('lock-manager.html');await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.mechanism-visual svg')).toHaveAccessibleName('Wait-for graph');
  await expect(page.locator('.mechanism-visual .graph-outcome')).toHaveText('Cycle detected');
  await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption('repaired');await page.getByRole('button',{name:'Run to end',exact:true}).click();
  await expect(page.locator('.mechanism-visual .graph-outcome')).toHaveText('No cycle');
  await page.goto('recovery-engine.html');await page.getByRole('button',{name:'Run to end',exact:true}).click();
  const target=page.locator('.trace button').filter({hasText:'Flush alice without enforcing'});await target.click();
  await expect(page.locator('.diagram-summary')).toContainText('alice is ahead');
  await expect(page.locator('.mechanism-visual .diagram-block.danger')).toContainText('pageLSN 2');
  await page.getByRole('button',{name:'Crash & recover here',exact:true}).click();
  await expect(page.locator('.log-record')).toHaveCount(0);
});

test('diagrams remain readable at narrow widths and controls stay available while inspecting them',async({page})=>{
  for(const [slug,width] of [['mvcc',390],['lock-manager',320],['aries',390],['replicated-log',390],['two-phase',390],['recovery-engine',1440]]){
    await page.setViewportSize({width,height:1200});await page.goto(`${slug}.html`);
    await page.getByRole('combobox',{name:'Experiment scenario'}).selectOption(slug==='lock-manager'?'broken':'repaired');
    await page.getByRole('button',{name:'Run to end',exact:true}).click();
    const drawing=page.locator('.mechanism-visual');await expect(drawing).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await drawing.scrollIntoViewIfNeeded();
    const bounds=await drawing.boundingBox();
    const sticky=await page.locator('.experiment-console').evaluate(el=>({top:parseFloat(getComputedStyle(el).top),height:el.getBoundingClientRect().height}));
    await page.evaluate(delta=>window.scrollBy(0,delta),bounds.y-sticky.top-sticky.height-16);
    const controls=await page.locator('.experiment-console').boundingBox();expect(controls.y).toBeGreaterThanOrEqual(64);expect(controls.y).toBeLessThan(120);
    expect((await drawing.boundingBox()).y).toBeGreaterThanOrEqual(controls.y+controls.height);
    await drawing.screenshot({path:`test-results/${slug}-diagram-${width}.png`});
  }
});

test('concept explanations precede prediction and remain readable without JavaScript',async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,baseURL:test.info().project.use.baseURL});
  const page=await context.newPage();
  for(const width of [1440,390,320]){
    await page.setViewportSize({width,height:1000});
    const captured=new Set();
    for(const lab of labs){
      await page.goto(`${lab.slug}.html`);
      const figure=page.locator('.concept-figure'),image=figure.getByRole('img');
      await expect(figure).toHaveCount(1);
      await expect.poll(()=>image.evaluate(img=>img.naturalWidth)).toBeGreaterThan(0);
      const src=await image.getAttribute('src'),id=src.match(/\/([a-zA-Z]+)\.svg$/)[1];
      await expect(image).toHaveAccessibleName(concepts[id].alt);
      const chosen=await image.evaluate(img=>img.currentSrc);
      expect(chosen.endsWith(`${id}${width<=600?'-mobile':''}.svg`)).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      const prediction=page.locator('h2').filter({hasText:/^Predict/}).first();
      expect(await figure.evaluate((el,id)=>Boolean(el.compareDocumentPosition(document.getElementById(id))&Node.DOCUMENT_POSITION_FOLLOWING),await prediction.getAttribute('id'))).toBe(true);
      if(width!==320&&!captured.has(id)){
        const bounds=await figure.boundingBox();
        await page.setViewportSize({width,height:Math.max(1000,Math.ceil(bounds.height+240))});
        await figure.evaluate(el=>window.scrollBy(0,el.getBoundingClientRect().y-100));
        await figure.screenshot({path:`test-results/concept-${id}-${width}.png`});captured.add(id);
        await page.setViewportSize({width,height:1000});
      }
      if((width===1440&&lab.slug==='wal')||(width===390&&lab.slug==='mvcc')){
        await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/concept-page-${lab.slug}-${width}.png`,fullPage:true});
      }
    }
  }
  await context.close();
});

test('concept SVG labels fit their nodes and responsive panels',async({page})=>{
  const allProblems=[];
  for(const id of Object.keys(concepts))for(const mobile of [false,true])for(const font of ['system-ui','DejaVu Sans','Liberation Sans']){
    const svg=await readFile(`dist/concepts/${id}${mobile?'-mobile':''}.svg`,'utf8');
    await page.setContent(`<style>body{margin:0}svg{display:block;width:${mobile?344:688}px}</style>${svg}`);
    await page.locator('svg').evaluate((svg,font)=>svg.style.fontFamily=font,font);
    const problems=await page.locator('svg').evaluate(svg=>{
      const problems=[];
      for(const group of svg.querySelectorAll('.box')){
        const r=group.querySelector('rect').getBBox();
        for(const text of group.querySelectorAll('text')){
          const b=text.getBBox();
          if(b.x<r.x||b.x+b.width>r.x+r.width+1||b.y<r.y||b.y+b.height>r.y+r.height+1)problems.push(`Node overflow: ${text.textContent}`);
        }
      }
      for(const panel of svg.querySelectorAll(':scope > g')){
        const bounds=panel.getBBox();
        if(bounds.x<0||bounds.x+bounds.width>321)problems.push(`Panel overflow: ${panel.textContent}`);
      }
      return problems;
    });
    allProblems.push(...problems.map(problem=>`${id}${mobile?' mobile':''} (${font}): ${problem}`));
  }
  expect(allProblems).toEqual([]);
});
