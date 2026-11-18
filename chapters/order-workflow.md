# Break the order service.

One bicycle, competing reservations, an uncertain payment, and a relay that can replay. Combine the earlier repairs without assuming any one spans the entire workflow.

**You will:** design a reservation/payment/dispatch boundary and verify each resource independently under failures. **Prerequisites:** parts I–V, especially [idempotency](./idempotency.html) and [compensation](./sagas.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

<!-- concept: design -->

## Predict before running

List the database, payment service, broker and dispatch consumer. Which of them share a local transaction? Which identities have to survive retries and restarts?

## Control the experiment

The page loads **Baseline** with the naive payment and event design. Select **Run to end** and inspect `reservations`, `charges`, `outbox`, `deliveries` and `effects` separately.

<!-- experiment -->

## Inspect the evidence

The baseline can reserve the last item correctly while charging twice and leaving no dispatch intent. Check each field independently before calling the workflow successful.

## Change one thing

Choose **Repair** and select **Run to end**. With the same lost-payment-response failure, compare `charges`, `outbox`, `deliveries` and `effects` with **Baseline**. Then choose **replay** and run again. What changes in `deliveries` when the crash moves after publication? Check whether `effects` still reports one dispatch.

After each run, open **Inspect JSON or download run evidence** and select **Download run evidence**. Keep the baseline, repair and replay records for the design review.

<details><summary>Locate the four protection boundaries</summary><p>Each mechanism has a boundary: conditional reservation, stable payment key, local order/outbox commit, relay and consumer deduplication.</p></details>
<details><summary>Trace payment after a failed local commit</summary><p>A successful payment followed by a failed local commit still needs reconciliation by order identity. Do not hold a database transaction open across a network payment merely to make the code look atomic.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The protected model conserves inventory, produces one charge and one dispatch effect in both supplied failure schedules. Those are bounded experiments, not a proof for every implementation. The model assumes an idempotent payment API, durable local records and an inbox; the final design must state these contracts and the failure cases beyond them.</p></div>

## Under the hood: map each guarantee to executable machinery

For every success label in the capstone, identify its implementation dependency: row visibility and update protection for reservation; a private write set plus WAL commit for order/outbox atomicity; a durable key/result protocol for payment retries; and inbox/effect publication for dispatch deduplication. The orchestration model assumes these local engines exist; it does not implement all of them together.

Use your completed [visibility](./mvcc.html), [validation](./validation.html), [deadlock](./lock-manager.html) and [redo](./recovery-engine.html) implementations as supporting artifacts. Show a concrete internal counterexample if one mechanism is weakened. This connects application correctness to the state structures that enforce it, rather than treating database and broker guarantees as unexplained labels.

## Transfer the idea

Design the missing path: payment succeeds, the reservation expires, and confirmation cannot commit. Specify reconciliation or refund, a stable refund key, pending states and operator intervention. Then propose tests for concurrent duplicate requests and crashes during compensation.

**Success criteria:** submit baseline, protected and relay-replay evidence with separate inventory, charge, delivery and effect checks; map each guarantee to its local primitive; identify the unmodeled payment-success/reservation-expiry path.

**Primary reference:** [PostgreSQL isolation and transaction design](https://www.postgresql.org/docs/current/transaction-iso.html).
