import {test,expect} from '@playwright/test';
import {pages,labs} from '../../scripts/catalog.mjs';
import {definitions} from '../../web/models.js';

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
  await expect(page.getByRole('link',{name:'15 · Did it commit?',exact:true})).toBeVisible();
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
