# Transactions Lab

Trace what a transaction exposes to readers, what it commits, and what can be recovered after a failure. Then implement the rules that control those outcomes.

<div class="hero-actions"><a class="start-link" href="./invariants.html">Start with the transfer invariant</a></div>

## Open the engine

Start each investigation with a diagram and a prediction. Run the original experiment, change one input, and compare the resulting SQL rows or model state. The implementation benches run your JavaScript function on named cases.

Use the diagram to understand the mechanism. Cite the output from your actual run in the design record.

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

## Optional advanced topic: ARIES

[Recover from a crash during undo](./aries.html) after you finish the WAL and recovery investigations. This advanced lab adds a seventh implementation bench and is optional for the final design review.

## Before you begin

Read basic SQL and short JavaScript functions using objects, arrays and sets. Use a modern browser with JavaScript and WebAssembly to run the experiments. The first investigation introduces invariants and transaction boundaries.

SQL investigations run PostgreSQL through PGlite. The teaching models use explicit schedules and named failure assumptions. The optional native and server exercises use real files or independent PostgreSQL sessions.

## Leave with an implementation and an explanation

Keep your prediction, the decisive result, and an explanation of what changed. When a preset changes several settings, match the other values before attributing the outcome to one setting. The final review uses the six core functions and their run evidence.

Notes and bench code can save in this browser. SQL and execution results last for the current page. Open **Download notes and evidence** and choose **Download notebook + evidence** to keep them.

[Runtime and primary sources](./runtime.html) · [Run the mechanisms locally](./native.html) · [Source and issue tracker](https://github.com/snowch/transactions-lab)
