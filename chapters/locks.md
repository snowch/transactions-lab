# Build a deadlock.

A holds the bicycle. B holds the helmet. Each needs the other item before it can finish.

**You will:** Construct a wait-for cycle, distinguish blocking from deadlock, and remove the cycle through consistent acquisition order. **Prerequisites:** concurrent transactions. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

If A acquires bike then helmet and B acquires helmet then bike, can either complete? Would a longer timeout solve the cycle?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Step through the ownership and waiting maps. An edge A → B means A needs a resource held by B. A single wait is ordinary contention; the two-edge cycle is a deadlock. The red check concerns progress, not evidence of a corrupt committed row.

## Change one thing

Run the consistent-order repair. B waits for bike before obtaining any second lock; A can acquire helmet and finish. Trace when each lock is released. Then explain why an application still needs transaction-level retries if another code path acquires resources differently.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Write down every held lock before writing down the next requested lock.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A timeout limits waiting. It does not establish why the wait occurred or prove that a whole workflow has been rolled back.</p></details>
<details><summary>Worked explanation</summary><p>Opposite acquisition order produces A waiting for B and B waiting for A. Consistent order prevents this cycle in the two-resource model. A real PostgreSQL server detects deadlocks and aborts a transaction; applications must handle that error. The model does not pick a victim or measure detector delay.</p></details>

## Transfer the idea

Add a third resource, a coupon. Give checkout and cancellation one common resource order. Explain whether row IDs, table order, advisory locks or a single owner record make that order enforceable in your design. Reproduce the two-resource cycle on the real server.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS).

[Take this investigation to independent PostgreSQL sessions →](./native.html#shared-postgresql)
