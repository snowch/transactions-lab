# Correct, but waiting.

A single lock makes the service easy to reason about. It also makes independent customers wait behind one another.

**You will:** compare lock granularity under explicit assumptions and preserve the scope of the invariant while improving concurrency. **Prerequisites:** [deadlocks and lock ownership](./locks.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

<!-- concept: contention -->

## Predict before running

Eight requests each need three logical service ticks. With one global slot, how many ticks are required? What changes if four independent keys can proceed together?

## Control the experiment

The page loads **Baseline** with eight requests, four keys, three logical ticks per batch, and a global lock. Select **Run to end** and find `slots` and `clock` in **Values at this step**.

<!-- experiment -->

## Inspect the evidence

The baseline processes one request per batch. Inspect completed, waiting, slots and clock. These are synthetic logical ticks, not elapsed measurements. The repaired scenario permits one simultaneous request for each independent key, up to the configured number of keys.

## Change one thing

Choose **Repair** and select **Run to end**. Compare `slots` and `clock` with **Baseline**. Open **Edit the experiment**, change `keys` from `4` to `1`, then select **Run to end** again. Does per-key locking still save any logical ticks? Keep the request count and service ticks fixed so the key count explains the change.

<details><summary>Calculate batches and logical ticks</summary><p>The modeled completion time is ceil(requests / slots) × service. The arithmetic is meaningful only under the stated independence and scheduling assumptions.</p></details>
<details><summary>Check the scope of the lock</summary><p>A lock per account does not protect a bank-wide limit unless all relevant changes also coordinate over that limit.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The global design preserves counting but finishes the default workload in 24 ticks. Four independent slots finish it in 6 ticks. This is a model of available parallelism, not evidence of a fourfold production speedup. Real waiting also depends on skew, lock duration, I/O, retries, fairness and scheduling.</p></div>

## Under the hood: lock hold time becomes a queue

The lock table turns incompatible requests into waiting work. A transaction that retains ownership across a network wait occupies a scarce resource even if its CPU usage is zero. Queue length and waiting latency can grow while every committed result remains correct. A finer lock key reduces interference only when it still covers the complete invariant.

In the [lock-manager engine](./lock-manager.html), follow the queue head and the release/wakeup path. A real throughput experiment must separately account for lock hold time, scheduler and I/O delay, validation aborts and retry work. MVCC can let readers proceed on old versions, but it does not eliminate every writer conflict or long-snapshot retention cost.

## Transfer the idea

Design a workload where every request targets the same product. Explain how you would measure lock wait, useful completions, abort rate and p95 latency. Decide whether shorter transactions, admission control or a different invariant representation can help.

**Success criteria:** derive batch count and logical ticks from the displayed configuration; explain keys = 1 and a hot-key counterexample; preserve the invariant’s scope and identify production measurements the arithmetic omits.

**Primary reference:** [PostgreSQL lock monitoring](https://www.postgresql.org/docs/current/monitoring-locks.html).
