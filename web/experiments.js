import {renderDiagram} from './diagrams.js';
import {renderInternals} from './internals-view.js';
import {definitions, runModel, recoverModel} from './models.js';

const page = document.body.dataset.page;
const revision = __BUILD_REVISION__;
const records = [];
const summaryFields = {
  'lost-update': ['initial', 'stock', 'reservations', 'reads', 'rejected'],
  'write-skew': ['onCall', 'reads', 'commits', 'aborts'],
  locks: ['locks', 'waiting', 'committed', 'deadlock'],
  retries: ['observed', 'expectedVersion', 'version', 'onCall', 'attempts'],
  contention: ['completed', 'waiting', 'slots', 'clock', 'serviceTicks'],
  files: ['visible', 'durableName', 'durableTemp', 'acknowledged', 'recovered'],
  wal: ['logDurable', 'commitDurable', 'acknowledged', 'disk'],
  recovery: ['balance', 'target', 'replays', 'logPresent'],
  'two-phase': ['durableDecision', 'coordinator', 'progress', 'A', 'B', 'heldResources'],
  consensus: ['replicas', 'reachable', 'quorum', 'participantVote', 'decision', 'progress'],
  outbox: ['order', 'outbox', 'published', 'relayAcknowledged'],
  idempotency: ['charges', 'chargedAmount', 'storedKey', 'storedAmount', 'response', 'attempts'],
  sagas: ['stock', 'reserved', 'payment', 'workflow', 'compensationAttempts', 'history'],
  'order-workflow': ['stock', 'reservations', 'charges', 'order', 'outbox', 'deliveries', 'effects'],
};
const save = (value, name, type = 'application/json') => {
  const url = URL.createObjectURL(new Blob([type === 'application/json' ? JSON.stringify(value, null, 2) : value], {type}));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

function showSummary(container, state, fields) {
  container.replaceChildren();
  if (!fields) return;
  const heading = document.createElement('h3');
  heading.textContent = 'Values at this step';
  const values = document.createElement('dl');
  for (const name of fields) {
    if (!(name in state)) continue;
    const term = document.createElement('dt');
    term.textContent = name;
    const description = document.createElement('dd');
    description.textContent = state[name] === null ? 'None yet' : typeof state[name] === 'object' ? JSON.stringify(state[name]) : String(state[name]);
    values.append(term, description);
  }
  container.append(heading, values);
}

for (const el of document.querySelectorAll('.experiment')) {
  const id = el.dataset.model;
  const config = el.querySelector('.config');
  const preset = el.querySelector('.preset');
  const status = el.querySelector('.model-status');
  const trace = el.querySelector('.trace');
  const results = el.querySelector('.model-results');
  const restoreButton = el.querySelector('.reset-model');
  const exportButton = el.querySelector('.export-run');
  const crash = el.querySelector('.crash');
  const tools = el.querySelector('.run-tools');
  let run = null, cursor = -1, revealed = -1, recovery = null, history = [];
  const presetText = () => JSON.stringify(definitions[id].presets[preset.value], null, 2);
  const describeSettings = () => {
    const note = el.querySelector('.scenario-note');
    try {
      const input = JSON.parse(config.value), base = definitions[id].presets.broken;
      if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Expected an object');
      const changed = Object.keys({...base, ...input}).filter(key => JSON.stringify(base[key]) !== JSON.stringify(input[key]));
      note.dataset.changedFields = changed.join(',');
      note.textContent = changed.length
        ? `Changed from Baseline: ${changed.join(', ')}.${changed.length > 1 ? ' Match the other settings to test one change.' : ''}`
        : 'Baseline settings.';
    } catch {
      note.dataset.changedFields = '';
      note.textContent = 'The settings are incomplete or invalid JSON.';
    }
    restoreButton.hidden = config.value === presetText();
  };
  const invalidate = message => {
    run = null;
    cursor = revealed = -1;
    recovery = null;
    history = [];
    trace.replaceChildren();
    for (const selector of ['.checks', '.state-overview', '.internals-view', '.mechanism-visual']) el.querySelector(selector).replaceChildren();
    el.querySelector('.model-state').textContent = 'No execution yet.';
    el.querySelector('.mechanism-visual').hidden = true;
    exportButton.disabled = true;
    results.hidden = true;
    tools.open = false;
    if (crash) crash.hidden = true;
    status.textContent = message;
  };
  const showTrace = () => {
    const previousFocus = document.activeElement;
    for (let i = trace.childElementCount; i <= revealed; ++i) {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${i}. ${run.steps[i].label}`;
      button.addEventListener('click', () => { cursor = i; recovery = null; render(); });
      li.append(button);
      trace.append(li);
    }
    for (const [i, li] of [...trace.children].entries()) {
      li.firstChild.setAttribute('aria-current', i === cursor ? 'step' : 'false');
    }
    if (!trace.contains(previousFocus)) {
      const selected = trace.children[cursor];
      const boxes = [trace.getBoundingClientRect(), selected.getBoundingClientRect()];
      if (boxes[1].bottom > boxes[0].bottom) trace.scrollTop += boxes[1].bottom - boxes[0].bottom;
      else if (boxes[1].top < boxes[0].top) trace.scrollTop += boxes[1].top - boxes[0].top;
    }
  };
  const render = () => {
    const step = recovery || run.steps[cursor];
    el.querySelector('.model-state').textContent = JSON.stringify(step.state, null, 2);
    showSummary(el.querySelector('.state-overview'), step.state, summaryFields[id]);
    renderDiagram(el.querySelector('.mechanism-visual'), id, step.state, run.input);
    renderInternals(el.querySelector('.internals-view'), id, step.state);
    const list = el.querySelector('.checks');
    list.replaceChildren();
    for (const check of step.checks) {
      const li = document.createElement('li');
      li.className = check.pass === null ? 'pending' : check.pass ? 'pass' : 'fail';
      li.textContent = `${check.pass === null ? 'Pending' : check.pass ? 'Holds' : 'Violated'} · ${check.name}`;
      list.append(li);
    }
    status.textContent = recovery ? `Recovery from step ${cursor}. ${recovery.label}` : `Step ${cursor} of ${run.steps.length - 1}. ${step.label}`;
    showTrace();
    results.hidden = false;
    exportButton.disabled = false;
    if (crash) crash.hidden = false;
  };
  const execute = toEnd => {
    try {
      if (!run) {
        const input = JSON.parse(config.value);
        run = {...runModel(id, input), input};
      }
      cursor = toEnd ? run.steps.length - 1 : Math.min(cursor + 1, run.steps.length - 1);
      revealed = Math.max(revealed, cursor);
      recovery = null;
      render();
    } catch (error) {
      status.textContent = `Cannot run: ${error.message}`;
    }
  };
  const evidence = () => run ? {
    schema: 1, revision, model: id, scenario: preset.value, input: run.input, boundary: definitions[id].boundary,
    trace: run.steps.slice(0, cursor + 1), recovery, recoveryAttempts: history, created: new Date().toISOString(),
  } : null;
  const stepButton = el.querySelector('.step');
  const runButton = el.querySelector('.run-model');
  stepButton.disabled = runButton.disabled = preset.disabled = false;
  stepButton.addEventListener('click', () => execute(false));
  runButton.addEventListener('click', () => execute(true));
  crash?.addEventListener('click', () => {
    try {
      recovery = recoverModel(id, (recovery || run.steps[cursor]).state);
      history.push({atStep: cursor, ...structuredClone(recovery)});
      render();
    } catch (error) { status.textContent = `Cannot recover: ${error.message}`; }
  });
  const preview = () => {
    const input = JSON.parse(config.value);
    const initial = runModel(id, input).steps[0];
    renderDiagram(el.querySelector('.mechanism-visual'), id, initial.state, input);
  };
  const restore = () => {
    const restoreFocused = document.activeElement === restoreButton;
    config.value = presetText();
    invalidate('Scenario ready. Select Step to inspect its initial state.');
    describeSettings();
    preview();
    if (restoreFocused) config.focus();
  };
  preset.addEventListener('change', restore);
  restoreButton.addEventListener('click', restore);
  config.addEventListener('input', () => {
    invalidate('Settings changed. Run the edited scenario to see new evidence.');
    describeSettings();
  });
  exportButton.addEventListener('click', () => {
    const record = structuredClone(evidence());
    records.push(record);
    save(record, `${page}-${preset.value}-run.json`);
  });
  el.evidence = evidence;
  describeSettings();
  preview();
}

const notes = [...document.querySelectorAll('[data-note]')];
const unsaved = new Set();
const unread = new Set();
const noteStatus = document.querySelector('.note-status');
const describeNotes = saved => {
  noteStatus.textContent = unsaved.size ? 'This browser could not save all current notes. Download the notebook before leaving.'
    : unread.size ? 'This browser could not read all saved notes.'
      : saved ? 'Draft saved in this browser.' : '';
};
for (const input of notes) {
  const key = `txlab:v1:${page}:${input.dataset.note}`;
  try {
    const value = localStorage.getItem(key);
    if (value !== null) {
      if (input.type === 'checkbox') input.checked = value === 'true';
      else input.value = value;
    }
  } catch { unread.add(key); }
  input.addEventListener('input', () => {
    try {
      localStorage.setItem(key, input.type === 'checkbox' ? String(input.checked) : input.value);
      unsaved.delete(key);
      unread.delete(key);
      describeNotes(true);
    } catch { unsaved.add(key); describeNotes(false); }
  });
}
if (noteStatus) describeNotes(false);
const notebook = () => ({
  schema: 1, revision, chapter: page, created: new Date().toISOString(),
  notes: Object.fromEntries(notes.map(input => [input.dataset.note, input.type === 'checkbox' ? input.checked : input.value])),
  implementations: [...document.querySelectorAll('.implementation-bench')].map(el => el.evidence?.()).filter(Boolean),
  sql: [...document.querySelectorAll('.sql-cell')].map(el => el.evidence?.()).filter(Boolean),
  runs: [...records, ...[...document.querySelectorAll('.experiment')].map(el => el.evidence()).filter(Boolean)],
});
document.querySelector('#download-notes')?.addEventListener('click', () => {
  const book = notebook();
  const markdown = `# Transaction design record: ${page}\n\n${Object.entries(book.notes).map(([key, value]) => `## ${key}\n\n${value}`).join('\n\n')}\n`;
  save(markdown, `${page}-design.md`, 'text/markdown');
});
document.querySelector('#download-evidence')?.addEventListener('click', () => save(notebook(), `${page}-notebook.json`));
