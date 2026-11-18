import {benches} from './benchmarks.js';

for (const el of document.querySelectorAll('.implementation-bench')) {
  const id = el.dataset.bench;
  const starter = benches[id].starter;
  const source = el.querySelector('.implementation-code');
  const status = el.querySelector('.implementation-status');
  const saveStatus = el.querySelector('.implementation-storage');
  const list = el.querySelector('.implementation-results');
  const test = el.querySelector('.test-implementation');
  const stop = el.querySelector('.stop-implementation');
  const restore = el.querySelector('.restore-implementation');
  const recover = el.querySelector('.recover-implementation');
  const key = `txlab:implementation-drafts:${id}`;
  let worker, timer, submitted = null, results = null, previous = null;

  function readDraft() {
    try {
      const current = localStorage.getItem(key);
      if (current !== null) {
        try {
          const record = JSON.parse(current);
          if (record && [record.draft, record.previous].every(value => value === null || typeof value === 'string')) {
            return record;
          }
        } catch { /* Try the original draft key. */ }
      }
      return {draft: localStorage.getItem(`txlab:implementation:${id}`), previous: null};
    } catch {
      saveStatus.textContent = 'This browser could not read saved code.';
      return {draft: null, previous: null};
    }
  }
  const stored = readDraft();
  if (stored.draft !== null) {
    source.value = stored.draft;
    status.textContent = 'Your saved code is in the editor. Test it to collect fresh results.';
  }
  previous = stored.previous;

  const asDraft = value => value === starter ? null : value;
  const updateControls = () => {
    restore.hidden = source.value === starter;
    recover.hidden = previous === null || previous === source.value;
  };
  const save = (value, backup) => {
    try { localStorage.setItem(key, JSON.stringify({draft: asDraft(value), previous: backup})); return true; }
    catch { return false; }
  };
  const end = () => {
    clearTimeout(timer);
    worker?.terminate();
    worker = null;
    const focusedStop = document.activeElement === stop;
    test.setAttribute('aria-disabled', 'false');
    stop.hidden = true;
    if (focusedStop) test.focus();
  };
  const invalidate = () => {
    end();
    submitted = null;
    results = null;
    list.replaceChildren();
    status.textContent = 'Code changed. Test this version to collect new results.';
  };

  function switchDraft(value, message) {
    const backup = asDraft(source.value);
    if (!save(value, backup)) {
      saveStatus.textContent = 'This browser could not save a recovery copy. Your code is still in the editor. Download it before leaving.';
      return;
    }
    source.value = value;
    previous = backup;
    invalidate();
    updateControls();
    saveStatus.textContent = message;
    source.focus();
  }
  test.disabled = false;
  updateControls();
  test.addEventListener('click', () => {
    if (worker) return;
    submitted = source.value;
    results = null;
    list.replaceChildren();
    test.setAttribute('aria-disabled', 'true');
    stop.hidden = false;
    status.textContent = 'Testing your function…';
    const job = new Worker(new URL('./bench-worker.js', import.meta.url), {type: 'module'});
    worker = job;
    job.onmessage = ({data}) => {
      if (worker !== job) return;
      end();
      if (data.error) { status.textContent = `Cannot test: ${data.error}`; return; }
      results = data.results;
      const passed = results.filter(item => item.pass).length;
      status.textContent = `${passed} / ${results.length} cases passed. ${passed < results.length ? 'Inspect the failing inputs and revise your function.' : 'Explain why your rule handles each case.'}`;
      for (const item of results) {
        const li = document.createElement('li');
        li.className = item.pass ? 'pass' : 'fail';
        const detail = document.createElement('details');
        detail.open = !item.pass;
        const title = document.createElement('summary');
        title.textContent = `${item.pass ? 'Passed' : 'Failed'} · ${item.name}`;
        const evidence = document.createElement('pre');
        evidence.textContent = JSON.stringify({input: item.input, expected: item.expected, ...(item.error ? {error: item.error} : {actual: item.actual}), ...(item.mutated ? {problem: 'Input was mutated'} : {})}, null, 2);
        detail.append(title, evidence);
        li.append(detail);
        list.append(li);
      }
    };
    job.onerror = event => {
      if (worker !== job) return;
      end();
      status.textContent = `The test worker could not finish: ${event.message}`;
    };
    timer = setTimeout(() => {
      end();
      status.textContent = 'Stopped after 2 seconds. Check for a loop that cannot finish, edit, and retry.';
    }, 2000);
    job.postMessage({id, source: submitted});
  });
  stop.addEventListener('click', () => { end(); status.textContent = 'Stopped. Edit the function and test again.'; });
  source.addEventListener('input', () => {
    invalidate();
    updateControls();
    saveStatus.textContent = save(source.value, previous) ? '' : 'This browser could not save your code. Download it before leaving.';
  });
  restore.addEventListener('click', () => {
    if (previous !== null && previous !== source.value && !confirm('Replace the existing recovery copy with the code in the editor and restore the starter?')) return;
    switchDraft(starter, 'Starter restored. Select Recover draft to return to your code.');
  });
  recover.addEventListener('click', () => switchDraft(previous, 'Draft recovered. Test it to collect fresh results.'));
  el.querySelector('.download-implementation').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([`export default ${source.value}\n`], {type: 'text/javascript'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${id}-implementation.mjs`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  el.evidence = () => ({id, revision: __BUILD_REVISION__, source: source.value, testedSource: submitted, results, status: status.textContent, created: new Date().toISOString()});
}
