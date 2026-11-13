# Build the machinery.<br>Understand the promise.

How can a database hide uncommitted work, preserve an old snapshot, or recover a commit whose data pages were never written? Build and inspect the mechanisms that make transactions work.

<div class="hero-actions"><a class="start-link" href="./invariants.html">Enter the laboratory →</a><a href="./transaction-manager.html">Start inside the engine</a></div>

<div class="lab-strip"><span><strong>24</strong> investigations</span><span><strong>6</strong> implementation benches</span><span><strong>0</strong> accounts to create</span></div>

## Open the engine

A transaction is more than BEGIN and COMMIT. Inside the system are transaction descriptors, private write sets, tuple versions, snapshots, lock queues, validation rules, buffer frames and log records. Each exists because another operation or a crash can occur at an inconvenient point.

You will trace those structures, implement small algorithms, break their assumptions and explain how the resulting behavior reaches an application. Transaction design stays part of the course: it becomes easier to choose a boundary once you can explain what enforces it.

**Build → predict → step → break → repair → explain.**

## What you will implement

| Mechanism | Implementation exercise | Internal evidence |
| --- | --- | --- |
| Transaction manager | Publish a write set only at commit | lifecycle, private/public maps and abort before-images |
| MVCC | Decide tuple visibility | xmin/xmax, snapshot active IDs, status table and version retention |
| Optimistic concurrency | Validate recorded versions | read/write sets, commit versions and abort decisions |
| Lock manager | Detect directed wait-for cycles | S/X owners, upgrade queues, dependencies and wakeups |
| WAL recovery | Implement the pageLSN redo guard | before/after records, durable log prefix, dirty pages, checkpoint and undo |
| Replicated decision log | Compare election logs correctly | terms, votes, prefix rejection, nextIndex and quorum commit |

Each implementation bench executes your JavaScript against named cases, including edge cases. The engine code shown beside the trace is taken from the source that runs the model. Download the complete modules to inspect or change them locally.

## A journey through the mechanisms

<div class="course-grid">
<a href="./invariants.html"><span>01—04 / TRANSACTION MANAGER</span><h3>Where do tentative writes live?</h3><p>State an invariant, build staging and publication, then observe real SQL commit and rollback.</p></a>
<a href="./mvcc.html"><span>05—12 / ISOLATION</span><h3>Which version can you see?</h3><p>Build visibility, validation and lock management; derive anomalies, aborts, deadlocks and contention.</p></a>
<a href="./files.html"><span>13—16 / RECOVERY</span><h3>Which writes survive?</h3><p>Trace persistence ordering, log records, page LSNs, checkpoints, redo and undo.</p></a>
<a href="./two-phase.html"><span>17—19 / DISTRIBUTED DECISIONS</span><h3>How is a decision preserved?</h3><p>Follow prepare records and coordinator recovery, then replicate a log through an election.</p></a>
<a href="./outbox.html"><span>20—22 / APPLICATION BOUNDARIES</span><h3>Where does the mechanism stop?</h3><p>Connect local commit to outbox relays, idempotency records and compensation state machines.</p></a>
<a href="./order-workflow.html"><span>23—24 / IMPLEMENTATION REVIEW</span><h3>Can you explain every guarantee?</h3><p>Defend a workflow using internal traces, your algorithm implementations and failure evidence.</p></a>
</div>

## Before you begin

Be comfortable reading basic SQL and short JavaScript functions using objects, arrays and sets. We introduce transaction internals as they become necessary. The first investigations establish the invariant and lifecycle; you can revisit them from later implementation labs.

Start in a modern browser with JavaScript and WebAssembly. SQL investigations run genuine PostgreSQL through self-hosted PGlite. Mechanism labs execute small, explicit engines on your device. Selected native Python and shared-server exercises connect the model to real files and independent PostgreSQL sessions.

The engines are intentionally bounded. They expose real algorithms without pretending to reproduce every detail of PostgreSQL, ARIES or Raft. Each mechanism states which parts it implements and which assumptions make the trace valid. Reading a toy engine and examining a production system are complementary activities.

## Leave with an implementation and an explanation

Record a prediction before running. Step through state changes and identify the exact read, dependency, publication or durable record behind the result. Implement a primitive, inspect failing cases, and download your code and evidence. Then apply what you learned to an independent design task.

Draft notes and implementation code save locally when browser storage is available. SQL database state and run results last only for the current page. Download the complete notebook before leaving if you need to preserve evidence. A passing case is evidence for that case, not proof over all inputs.

[Runtime and primary sources](./runtime.html) · [Run the mechanisms locally](./native.html) · [Source and issue tracker](https://github.com/snowch/transactions-lab)
