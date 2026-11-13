# Correct, but waiting.

A single lock makes the service easy to reason about. It also makes independent customers wait behind one another.

**You will:** Compare lock granularity under explicit assumptions and preserve the scope of the invariant while improving concurrency. **Prerequisites:** locks and invariants. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

Eight requests each need three logical service ticks. With one global slot, how many ticks are required? What changes if four independent keys can proceed together?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

The baseline processes one request per batch. Inspect completed, waiting, slots and clock. These are synthetic logical ticks, not elapsed measurements. The repaired scenario permits one simultaneous request for each independent key, up to the configured number of keys.

## Change one thing

Change requests, keys and service separately. Derive the batch count and predict clock before running. Set keys = 1: the fine-grained repair should have no concurrency advantage. Explain what the simplified uniform-key workload hides about hot products.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>The modeled completion time is ceil(requests / slots) × service. The arithmetic is meaningful only under the stated independence and scheduling assumptions.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A lock per account does not protect a bank-wide limit unless all relevant changes also coordinate over that limit.</p></details>
<details><summary>Worked explanation</summary><p>The global design preserves counting but finishes the default workload in 24 ticks. Four independent slots finish it in 6 ticks. This is a model of available parallelism, not evidence of a fourfold production speedup. Real waiting also depends on skew, lock duration, I/O, retries, fairness and scheduling.</p></details>

## Transfer the idea

Design a workload where every request targets the same product. Explain how you would measure lock wait, useful completions, abort rate and p95 latency. Decide whether shorter transactions, admission control or a different invariant representation can help.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL lock monitoring](https://www.postgresql.org/docs/current/monitoring-locks.html).
