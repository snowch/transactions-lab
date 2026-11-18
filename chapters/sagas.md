# Undo a workflow.

Payment fails after stock was reserved. Releasing the stock also fails once. Recovery must remember the unfinished business operation.

**You will:** define a durable compensation workflow and explain why compensation differs from rollback. **Prerequisites:** [outboxes](./outbox.html) and [idempotency](./idempotency.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

A **saga** coordinates separately committed steps and records compensating business actions if a later step fails. A compensation is another fallible operation, such as releasing a reservation; it does not rewind other systems' observations.

<!-- concept: saga -->

## Predict before running

If payment is declined and releasing inventory times out, may the order be marked fully recovered? What if the release succeeded but its acknowledgement was lost?

## Control the experiment

The page loads **Baseline** with one item, a payment decline and a failed release. Select **Step** to watch `reserved`, `workflow` and `history` during the failed compensation.

<!-- experiment -->

## Inspect the evidence

Follow the reservation, declined payment and failed release. The baseline forgets the release and marks the failure complete, leaving stock held. The invariant is evaluated at completed failure; a temporary reservation while compensation is pending is a separate operational condition.

## Change one thing

Choose **Repair** and select **Run to end**. Compare `workflow`, `reserved`, `stock` and `history` with **Baseline**. Revisit **Persist pending compensation and restart the worker**. When is it safe for the model to report a completed failure?

The supplied first release fails before changing stock. On paper, design a release keyed by reservation ID so a successful release followed by a lost response cannot add stock twice.

<details><summary>Find the pending release record</summary><p>Persist “release pending” before considering the failed workflow finished.</p></details>
<details><summary>Ask what compensation can restore</summary><p>Compensation can fail, require manual action, or be unable to reverse a real-world effect. Model those states rather than naming everything rollback.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>A saga coordinates local commits and subsequent compensations. It does not generally isolate intermediate state or erase history. The repaired workflow remembers unfinished work until an idempotent compensation completes. Its design needs retry limits, alerting, ownership and reconciliation for prolonged failures.</p></div>

## Under the hood: a persisted workflow state machine

A workflow engine stores an operation ID, current step, completed local results, pending compensations and retry state. A worker must atomically claim or validate a workflow version before advancing it, otherwise two workers can both perform a step. The [OCC validator](./validation.html) illustrates this version check; an outbox or equivalent protocol ties durable next-step intent to local state.

After a failure, restart reads the persisted state and retries the pending action using its original identity. Compensation is another forward operation with its own idempotence and recovery boundary. It does not rewind every system's history or provide serial isolation for intermediate states. Marking the workflow complete must reflect which required compensations really finished.

## Transfer the idea

An email has already told the customer their order is confirmed. Payment later fails. Define the compensating communication and explain which original effects cannot be undone. Specify the customer-visible status during recovery.

**Success criteria:** distinguish pending compensation from completed failure; show that stock is released before failed-complete; retain observable history and specify a stable release identity plus an escalation path for prolonged failure.

**Primary reference:** [Garcia-Molina and Salem: Sagas](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf).
