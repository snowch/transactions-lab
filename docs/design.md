# Implementation and teaching design

The course asks one recurring question: which invariant is protected by which
boundary, under which concurrency and failure assumptions? The six parts move
from local SQL decisions to storage recovery, distributed commit and external
workflows. An exported design record connects the experiments.

## Structure

- `scripts/catalog.mjs` owns navigation and runtime classification.
- `chapters/*.md` contains all prose, executable SQL, predictions and transfer tasks.
- `scripts/build.mjs` renders static HTML, editable SQL, model controls and notebook
  fields. Vite bundles all runtime assets under relative URLs for Pages.
- `web/db-worker.js` executes genuine PGlite SQL. One private database per SQL page;
  errors roll back an open transaction; the UI bounds execution time and results.
- `web/models.js` contains pure, deterministic transitions, named predicates and
  recovery functions. Every UI trace comes from those transitions.
- `web/experiments.js` manages stepping, revisiting prefixes, recovery, config
  validation feedback, local drafts and evidence exports. No backend is needed.
- `native/` and `server/` contain runnable real-system extensions copied into downloads.

## What makes this a lab

Learners predict before seeing the trace, reproduce a defect, change the schedule
or policy, inspect independent resource checks and explain a repair. Presets are
starting experiments, not assessment answers. JSON inputs can be edited directly;
SQL is editable and executed. Native worksheets add manual independent-session
work, with an automated harness verifying the documented phenomena.

The capstone separates inventory, charges, dispatch deliveries and effects so an
apparently correct order count cannot conceal duplicate charges or delivery.
The final review requires new failure cases and a design for payment success
followed by reservation expiry; it cannot be completed just by selecting Repair.

## Boundaries to preserve

Browser models are deliberately small: no real threads, disk, broker, payment
service or consensus group is claimed. The file/WAL models assume whole writes
and explicit persistence. Consensus is a quorum/participant-vote exercise, not
Raft. Two-phase commit is safe while blocked in its waiting scenario. Serializability
is a property of the modeled schedule; PostgreSQL SSI is tested separately.
Native process interruption leaves kernel caches intact and never establishes
power-loss durability. These limits appear next to controls and in the runtime guide.

## Verification strategy

Model checks cover legal two-client schedules for conditional reservations,
every crash prefix of repaired file/WAL protocols, repeated replay and the
separation of safe decisions from progress. SQL checks assert real data values,
including deliberately false baseline results. Browser checks exercise all pages,
editable models, downloads, real SQL errors/reset, keyboard navigation, local
persistence, subpath resources and mobile layout. Server checks synchronize actual
independent sessions by observing lock waits before advancing the owner.
