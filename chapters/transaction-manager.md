# Build the transaction manager.

A transaction manager tracks work between BEGIN and commit or rollback. Follow when tentative writes become visible to other readers, then implement the rule that publishes them.

**You will:** implement publication of a write set, trace commit and abort state transitions, and explain which guarantees this mechanism does and does not provide. **Prerequisites:** [invariants](./invariants.html) and JavaScript objects/maps. **Runtime:** an executable single-writer engine, followed by a JavaScript implementation bench.

<!-- concept: publication -->

## Predict

The writer stages only Alice = 70, another reader observes, and the writer aborts. Predict both the final public map and what the reader remembers under each-write versus commit publication. Can a final total of 200 establish that no partial state was ever exposed?

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

The page loads **Baseline** with one writer and two balances of 100. Select **Step** until **Another reader samples the public state**. In **Reader observations retained across commit or abort**, inspect the recorded `Total` and compare it with the `Public map` at the end.

<!-- experiment -->

The diagram separates the private write set from public values. Step across publication and watch which store changes; the arrows show the model’s publication path, not disk persistence.

Choose **Repair**, then select **Step** through **Enter committing** and **Publish the complete write set**. Compare **Private writes** with the **Public map** at both steps. Choose **abort** and select **Run to end**. Open **Edit the experiment**, replace `"publication": "commit"` with `"publication": "each-write"`, and run again. Compare the `Total` column of the observations and the final map. Do matching final maps guarantee that both histories kept the debit private?

The observation table retains earlier reads. The history check reports a violation if any reader saw a partial transfer, even after a later step restores the public map. The current-map check answers a different, narrower question.

## Read the algorithm

The engine’s `publish` function copies the public map and merges tentative writes once the descriptor is committed. Open **Read the engine code executed by this lab** to inspect how the engine stages writes and restores earlier values on abort.

<!-- mechanism-source -->

## Implement it

Select **Test implementation** in the bench below. Open a failing case and compare its `expected` and `actual` maps. In **Your JavaScript implementation**, change `solve` so writes are merged only when `status` is `"committed"`. Return a fresh map in all cases. Test again and explain which case would detect premature publication.

<!-- implementation -->

<details><summary>Hint 1 · Find the publication boundary</summary><p>A reader must obtain either the old public map or the new public map. Writing the two keys in separate public steps leaves a boundary between them.</p></details>
<details><summary>Hint 2 · Separate the descriptor from the storage</summary><p>Use status to decide whether to merge. Do not mutate base while preparing the result. Aborting the private-write-set implementation can discard staged work.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The baseline violates public atomic visibility at its first write. The repair stages both values and publishes one complete set. Abort discards its private changes. This is an implementation of one atomicity/visibility strategy under one-writer event ordering. It does not enforce the application invariant, detect conflicts or flush a commit record; the later mechanisms supply those responsibilities.</p></div>

## Transfer the idea

On paper, mark process loss just before and just after publication; this volatile engine has no crash-recovery control. Explain what durable evidence a restarted process would need. Design the descriptor fields needed by the WAL engine: transaction ID, status and last log position. Then explain how a multi-writer engine would prevent one whole-map replacement from overwriting another transaction's change.

**Success criteria:** cite the first exposed partial state and an observation that undo cannot retract; show commit and abort with private writes; pass the publication bench without mutating either input; identify the missing durability mechanism.

**Primary sources:** [PostgreSQL transaction processing internals](https://www.postgresql.org/docs/current/transaction-id.html) and [SQLite atomic commit](https://sqlite.org/atomiccommit.html).
