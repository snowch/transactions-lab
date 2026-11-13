# Transactions Lab

**Design. Break. Repair.** An 18-investigation, six-part course on transaction
design across databases, durable files and distributed workflows.

[Open the lab](https://snowch.github.io/transactions-lab/) ·
[Curriculum](scripts/catalog.mjs) · [Runtime boundaries](chapters/runtime.md)

## The hands-on path

1. State invariants, choose transaction boundaries and reserve the last item.
2. Interleave requests, reproduce write skew, build deadlocks and retry decisions.
3. Crash between file/log writes and again during recovery.
4. Lose the two-phase coordinator and distinguish consensus from atomic commit.
5. Repair dual writes, uncertain outcomes and failed compensation.
6. Defend an order-service design using baseline/broken/repaired evidence.

SQL pages run genuine PostgreSQL through self-hosted PGlite/WASM. Controlled
JavaScript models expose state transitions and invariants; they explicitly say
what they assume and do not claim live cluster or disk execution. Native Python
and independent-session PostgreSQL extensions take selected cases to real systems.
Every investigation includes predictions, editable experiments, hints, explanations,
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
