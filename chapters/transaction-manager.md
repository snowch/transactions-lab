# Build the transaction manager.

BEGIN does not make a sequence of arbitrary writes indivisible. Something inside the engine must track the transaction, retain its private work, and control when other readers can observe it.

**You will:** implement publication of a write set, trace commit and abort state transitions, and explain which guarantees this mechanism does and does not provide. **Prerequisites:** invariants and basic objects/maps. **Runtime:** an executable single-writer engine, followed by a JavaScript implementation bench.

<!-- concept: publication -->

## Predict

Alice and Bob each have 100. The writer stages Alice = 70 before staging Bob = 130. Where can those intermediate values live without another reader seeing half a transfer?

## The machinery

A **transaction descriptor** records the identity and lifecycle of an attempt. A **write set** maps keys to tentative new values. A **before-image** records a value before it was modified. An engine can buffer changes privately, or install changes into shared structures while using versions or locks to control visibility. These are different implementations of the same visibility requirement.

This engine uses a private map and replaces the public map in one event:

| Event | Descriptor | Private write set | Public state |
| --- | --- | --- | --- |
| Begin | active | empty | Alice 100, Bob 100 |
| Debit | active | Alice 70 | Alice 100, Bob 100 |
| Credit | active | Alice 70, Bob 130 | Alice 100, Bob 100 |
| Commit starts | committing | unchanged | still the old pair |
| Publish | committed | complete set | Alice 70, Bob 130 |
| Abort instead | aborted | discarded | old pair retained |

The single publish transition is the **linearization point for this model's public map change**. A production engine needs an appropriate latch, version/status protocol or other synchronization around its publication boundary. A JavaScript object replacement does not establish disk durability or correctness with multiple unsynchronized writers.

## Control the experiment

Step the baseline. The writer exposes Alice immediately, and the next observation captures a total of 170. Even if later undo restores both accounts, it cannot make that earlier reader forget the partial state.

<!-- experiment -->

The diagram separates the private write set from public values. Step across publication and watch which store changes; the arrows show the model’s publication path, not disk persistence.

Select Repair. Watch the tentative values accumulate separately from public data. The transaction passes through committing before publication. Try the abort scenario; the staged debit disappears without changing the public map.

## Read the algorithm

The actual `publish` function returns a new map only for the committed state. `transactionManager` owns staging, before-images, observations and valid terminal transitions. Expanding the code shows the functions that generated your trace, rather than pseudocode claiming a stronger engine.

<!-- mechanism-source -->

## Implement it

The starter publishes too early. Implement the state guard while preserving the original input objects. Test active, aborted, committed and empty write sets. Then explain why simply adding this guard would still be insufficient for a concurrent durable database.

<!-- implementation -->

<details><summary>Hint 1 · Find the publication boundary</summary><p>A reader must obtain either the old public map or the new public map. Writing the two keys in separate public steps leaves a boundary between them.</p></details>
<details><summary>Hint 2 · Separate the descriptor from the storage</summary><p>Use status to decide whether to merge. Do not mutate base while preparing the result. Aborting the private-write-set implementation can discard staged work.</p></details>
<details><summary>Worked explanation</summary><p>The baseline violates public atomic visibility at its first write. The repair stages both values and publishes one complete set. Abort discards its private changes. This is an implementation of one atomicity/visibility strategy under one-writer event ordering. It does not enforce the application invariant, detect conflicts or flush a commit record; the later mechanisms supply those responsibilities.</p></details>

## Transfer the idea

Insert a crash just before and just after publication. Explain why the in-memory engine cannot yet decide what to recover after process loss. Design the transaction descriptor fields needed by the WAL engine: transaction ID, status and last log position. Then explain how a multi-writer engine would prevent one whole-map replacement from overwriting another transaction's change.

**Primary sources:** [PostgreSQL transaction processing internals](https://www.postgresql.org/docs/current/transaction-id.html) and [SQLite atomic commit](https://sqlite.org/atomiccommit.html).
