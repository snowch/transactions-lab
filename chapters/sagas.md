# Undo a workflow.

Payment fails after stock was reserved. Releasing the stock also fails once. Recovery must remember the unfinished business operation.

**You will:** Define a durable compensation workflow and explain why compensation differs from rollback. **Prerequisites:** local transactions, outboxes and idempotency. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

<!-- concept: saga -->

## Predict before running

If payment is declined and releasing inventory times out, may the order be marked fully recovered? What if the release succeeded but its acknowledgement was lost?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Follow the reservation, declined payment and failed release. The baseline forgets the release and marks the failure complete, leaving stock held. The invariant is evaluated at completed failure; a temporary reservation while compensation is pending is a separate operational condition.

## Change one thing

Run durable-retry. Pending compensation survives a modeled restart, the worker retries and records the release. Inspect history: reservation and release remain observable. Sketch an idempotent release keyed by reservation ID, so a retry after a lost acknowledgement cannot add stock twice.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Persist “release pending” before considering the failed workflow finished.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>Compensation can fail, require manual action, or be unable to reverse a real-world effect. Model those states rather than naming everything rollback.</p></details>
<details><summary>Worked explanation</summary><p>A saga coordinates local commits and subsequent compensations. It does not generally isolate intermediate state or erase history. The repaired workflow remembers unfinished work until an idempotent compensation completes. Its design needs retry limits, alerting, ownership and reconciliation for prolonged failures.</p></details>

## Under the hood: a persisted workflow state machine

A workflow engine stores an operation ID, current step, completed local results, pending compensations and retry state. A worker must atomically claim or validate a workflow version before advancing it, otherwise two workers can both perform a step. The [OCC validator](./validation.html) illustrates this version check; an outbox or equivalent protocol ties durable next-step intent to local state.

After a failure, restart reads the persisted state and retries the pending action using its original identity. Compensation is another forward operation with its own idempotence and recovery boundary. It does not rewind every system's history or provide serial isolation for intermediate states. Marking the workflow complete must reflect which required compensations really finished.

## Transfer the idea

An email has already told the customer their order is confirmed. Payment later fails. Define the compensating communication and explain which original effects cannot be undone. Specify the customer-visible status during recovery.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [Garcia-Molina and Salem: Sagas](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf).
