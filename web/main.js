import './bench-ui.js';
import './experiments.js';
const menu = document.querySelector('#menu');
const sidebar = document.querySelector('#sidebar');
const wide = matchMedia('(min-width: 1200px)');
function setNavigation(open) {
  menu.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('nav-open', open);
  sidebar.inert = !open;
  document.querySelector('main').inert = open&&!wide.matches;
  if (open) sidebar.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest'});
}
setNavigation(wide.matches);
menu.addEventListener('click',()=>setNavigation(menu.getAttribute('aria-expanded')!=='true'));
wide.addEventListener('change',()=>setNavigation(wide.matches));
document.querySelector('#nav-backdrop').addEventListener('click',()=>setNavigation(false));
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && menu.getAttribute('aria-expanded')==='true') {
    setNavigation(false);menu.focus();
  }
});
document.querySelectorAll('.terminal-cell .copy').forEach(button=>button.addEventListener('click',async()=>{
  const code=button.closest('.terminal-cell').querySelector('code');
  try {await navigator.clipboard.writeText(code.textContent);button.textContent='Copied';}
  catch {const range=document.createRange();range.selectNodeContents(code);getSelection().removeAllRanges();getSelection().addRange(range);button.textContent='Select and copy';}
  setTimeout(()=>button.textContent='Copy',2000);
}));
const cells = [...document.querySelectorAll('.sql-cell')];
if (cells.length) startLab();
function download(blob, filename) {
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=filename;anchor.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function startLab() {
  let worker, active, timer, ready = false, execution = 0;
  const status = document.querySelector('#db-status');
  const reset = document.querySelector('#reset-db');
  const setControls = () => {
    for (const cell of cells) {
      const button = cell.querySelector('.run');
      button.disabled = !ready;
      button.setAttribute('aria-disabled', String(Boolean(active) || !ready));
    }
    reset.setAttribute('aria-disabled', String(Boolean(active)));
  };
  const activity = (cell, message, error = false) => {
    const note = cell.querySelector('.sql-activity');
    note.textContent = message;
    note.classList.toggle('sql-error', error);
  };
  const updateNotes = () => {
    for (const cell of cells) {
      const note = cell.querySelector('.execution-note');
      const output = cell.sqlOutput;
      note.hidden = !output;
      if (!output) continue;
      const edited = cell.querySelector('textarea').value !== output.source;
      const later = output.execution < execution;
      const failed = cell.sqlAttempt?.outcome === 'error';
      note.textContent = edited || failed || later
        ? `Showing successful execution ${output.execution}. ${edited ? 'SQL edited since this run. ' : ''}${failed ? 'The latest attempt failed.' : later ? 'Later SQL may have changed the database.' : ''}`
        : `Successful execution ${output.execution}.`;
    }
  };
  function render(container,results) {
    container.replaceChildren();
    const returned = results.filter(result => result.fields.length);
    if (!returned.length) {
      const note = document.createElement('p');
      note.className = 'result-note';
      note.textContent = 'SQL completed. No rows were returned.';
      container.append(note);
    }
    for (const result of returned) {
      const note = document.createElement('p');
      note.className = 'result-note';
      note.textContent = `${result.totalRows} ${result.totalRows === 1 ? 'row' : 'rows'}${result.totalRows > 100 ? ' (first 100 shown)' : ''}`;
      container.append(note);
      if(!result.rows.length)continue;
      if(result.fields[0]?.name==='QUERY PLAN') {
        const pre=document.createElement('pre');pre.textContent=result.rows.map(row=>row['QUERY PLAN']).join('\n');container.append(pre);
      }else{
        const table=document.createElement('table'),head=table.createTHead().insertRow();
        result.fields.forEach(field=>{const th=document.createElement('th');th.textContent=field.name;head.append(th);});
        const body=table.createTBody();
        result.rows.forEach(row=>{
          const tr=body.insertRow();
          result.fields.forEach(field=>{
            const value=row[field.name];
            tr.insertCell().textContent=value===null?'NULL':value instanceof Date?value.toISOString():typeof value==='object'?JSON.stringify(value):String(value);
          });
        });
        container.append(table);
      }
    }
  }
  const finish = () => {
    clearTimeout(timer);
    active = null;
    setControls();
  };
  const fail = (message) => {
    if (!active) return;
    const {cell, source, number} = active;
    cell.sqlAttempt = {source, execution: number, outcome: 'error', error: message};
    activity(cell, message, true);
    updateNotes();
  };
  function stop(message) {
    worker?.terminate();
    ready = false;
    fail(message);
    status.textContent = message;
    finish();
  }
  function initialize() {
    worker?.terminate();
    finish();
    ready = false;
    execution = 0;
    for (const cell of cells) {
      cell.querySelector('.result').replaceChildren();
      cell.sqlOutput = null;
      cell.sqlAttempt = null;
      activity(cell, '');
    }
    updateNotes();
    setControls();
    status.textContent = 'Preparing the sample database…';
    const job = new Worker(new URL('./db-worker.js', import.meta.url), {type: 'module'});
    worker = job;
    job.onmessage = ({data}) => {
      if (worker !== job) return;
      if (data.type === 'ready') {
        ready = true;
        status.textContent = 'Ready. Run the numbered SQL cells in order.';
        status.title = data.version;
      } else if (data.type === 'error' && active) {
        const rollback = data.rolledBack ? ' The lab rolled back the open transaction.' : '';
        const punctuation = /[.?!]$/.test(data.message) ? '' : '.';
        fail(`SQL error: ${data.message}${punctuation}${rollback}`);
      } else if (data.type === 'error') {
        stop(`PostgreSQL could not start: ${data.message}. Use Reset database to retry.`);
        return;
      } else if (active) {
        const {cell, source, number} = active;
        render(cell.querySelector('.result'), data.results);
        cell.sqlOutput = {source, execution: number};
        cell.sqlAttempt = {source, execution: number, outcome: 'success'};
        activity(cell, '');
        updateNotes();
      }
      finish();
    };
    job.onerror = event => {
      if (worker === job) stop(`PostgreSQL stopped: ${event.message || 'Worker error'}. Use Reset database to retry.`);
    };
    job.postMessage({type: 'init'});
    timer = setTimeout(() => stop('PostgreSQL did not start in 90 seconds. Use Reset database to retry.'), 90_000);
  }
  for (const cell of cells) {
    const editor = cell.querySelector('textarea');
    const original = editor.value;
    const restore = cell.querySelector('.restore');
    const recover = cell.querySelector('.recover-sql');
    let previous = null;
    const editorChanged = () => {
      restore.hidden = editor.value === original;
      recover.hidden = previous === null || previous === editor.value;
      updateNotes();
    };
    restore.addEventListener('click', () => {
      previous = editor.value;
      editor.value = original;
      editorChanged();
      editor.focus();
    });
    recover.addEventListener('click', () => {
      [editor.value, previous] = [previous, editor.value === original ? null : editor.value];
      editorChanged();
      editor.focus();
    });
    editor.addEventListener('input', editorChanged);
    const copy = cell.querySelector('.copy');
    copy.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(editor.value); copy.textContent = 'Copied'; }
      catch { editor.focus(); editor.select(); copy.textContent = 'Select and copy'; }
      setTimeout(() => { copy.textContent = 'Copy SQL'; }, 2000);
    });
    const run = () => {
      if (!ready || active) return;
      active = {cell, source: editor.value, number: ++execution};
      setControls();
      activity(cell, 'Running SQL…');
      worker.postMessage({type: 'exec', sql: editor.value});
      timer = setTimeout(() => stop('SQL stopped after 30 seconds. Use Reset database to continue.'), 30_000);
    };
    cell.querySelector('.run').addEventListener('click', run);
    editor.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); run(); }
    });
    cell.evidence = () => ({
      source: editor.value,
      output: [...cell.querySelector('.result').children].map(node => node.tagName === 'TABLE'
        ? [...node.rows].map(row => [...row.cells].map(item => item.textContent).join('\t')).join('\n')
        : node.textContent).join('\n'),
      executedSource: cell.sqlOutput?.source ?? null,
      execution: cell.sqlOutput?.execution ?? null,
      outcome: cell.sqlOutput ? 'success' : null,
      lastAttempt: cell.sqlAttempt ?? null,
    });
  }
  document.querySelector('#download-sql').addEventListener('click', () => {
    const sql = cells.map((cell, i) => `-- SQL ${i + 1}\n${cell.querySelector('textarea').value}`).join('\n\n');
    download(new Blob([sql], {type: 'text/plain'}), `${document.body.dataset.page}.sql`);
  });
  reset.addEventListener('click', () => { if (!active) initialize(); });
  initialize();
}
function revealAnchor() {
  const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if(!target)return;
  let parent=target.parentElement;
  while(parent){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}
  if(location.hash)requestAnimationFrame(()=>target.scrollIntoView());
}
window.addEventListener('hashchange',revealAnchor);
revealAnchor();
