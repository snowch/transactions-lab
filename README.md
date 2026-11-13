# Transactions Lab

**Build. Trace. Explain.** A 24-investigation core course in six parts on how transactions
work inside databases, storage engines and distributed workflows. Six implementation
benches execute learner-written algorithms in the browser. An optional advanced
[ARIES lab](https://snowch.github.io/transactions-lab/aries.html) adds repeat-history
redo, CLRs, undoNextLSN and repeated crashes during undo, with a seventh bench.

[Open the lab](https://snowch.github.io/transactions-lab/) ·
[Curriculum](scripts/catalog.mjs) · [Runtime boundaries](chapters/runtime.md)

## The hands-on path

1. Build transaction descriptors, private write sets and atomic publication.
2. Implement MVCC visibility, OCC validation and lock-manager cycle detection; derive anomalies and retries.
3. Inspect buffer frames, LSNs, checkpoints, redo and undo; crash between writes.
4. Trace prepared/decision records and a replicated log through elections and prefix repair.
5. Repair dual writes, uncertain outcomes and failed compensation.
6. Defend an order-service implementation using internal traces, code and failure evidence.

SQL pages run genuine PostgreSQL through self-hosted PGlite/WASM. Controlled
JavaScript models expose state transitions and invariants; they explicitly say
what they assume and do not claim live cluster or disk execution. Native Python
and independent-session PostgreSQL extensions take selected cases to real systems.
Twenty annotated concept diagrams introduce the mechanisms across all 25 core
and optional investigations before the prediction prompts. They explain the
components, dependencies, failure cases and guarantees without running code.
Live diagrams then follow each selected trace state: tuple-version chains, wait graphs,
WAL durability, replica prefixes and ARIES undo links. Mechanism source is extracted
from the engine that runs each trace. Implementation
benches accept JavaScript functions and report named edge cases; code and evidence
are exportable. Every investigation includes predictions, editable experiments, hints, explanations,
transfer tasks and a locally saved/exportable transaction design record.

## Develop and verify

Node.js 24, Python 3.12+ on Linux:

```sh
npm ci
npm run dev
# http://localhost:4173/transactions-lab/
```

```sh
npm run check
npx playwright install --with-deps chromium
npm run test:browser
npm run test:server  # Docker with Compose; starts and removes its own lab service
```

`CHROMIUM_PATH=/usr/bin/chromium npm run test:browser` uses an installed browser.
Build output is `dist/`. All asset and page links support `/transactions-lab/`.
GitHub Actions validates models, actual SQL, native exercises, browser behavior
and shared-server schedules before deploying to GitHub Pages.

[Whole-course learning-design and UX review](docs/course-review.md) records
lesson-by-lesson findings, fixes, executed evidence and remaining limits.

## Real-system extensions

[Server worksheet](server/README.md), [file replacement](native/files.py) and
[journal replay](native/journal.py) are copied into the built site's downloads.
Run `python3 native/files.py --help` for fault boundaries. These exercises test
process interruption, not power loss. See [the native guide](chapters/native.md).

## Provenance and limitations

SQL worker, editor, layout and build concepts are adapted from
[snowch/postgresql-lab](https://github.com/snowch/postgresql-lab).
Streaming recovery scenarios connect to
[snowch/event-streaming-lab](https://github.com/snowch/event-streaming-lab), and
file-system material to
[Systems From Scratch](https://snowch.github.io/computer-systems/the-file-system/).
Original material is copyright Christopher Snow. Dependencies retain their own licenses.

A passing invariant at one trace point is not a proof over arbitrary schedules.
PGlite has one connection per private database. Browser commit does not establish
power-loss durability. See [runtime and primary sources](chapters/runtime.md).
