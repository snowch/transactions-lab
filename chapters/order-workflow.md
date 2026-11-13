# Break the order service.

One bicycle, competing reservations, an uncertain payment, and a relay that can replay. Combine the earlier repairs without assuming any one spans the entire workflow.

**You will:** Design a reservation/payment/dispatch boundary and verify each resource independently under failures. **Prerequisites:** parts I–V, especially [idempotency](./idempotency.html) and [compensation](./sagas.html). **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

<!-- concept: design -->

## Predict before running

List the database, payment service, broker and dispatch consumer. Which of them share a local transaction? Which identities have to survive retries and restarts?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Run the naive baseline. It conditionally reserves the bicycle, but loses the payment response and charges again on retry. It also commits paid status without durable dispatch intent. Count reservations, charges, deliveries and effects independently; a single order row hides multiple classes of failure.

## Change one thing

Run protected with failure after-charge. The retry uses the original payment identity and the paid update shares a local commit with the outbox. Try replay with failure after-publish: deliveries increase while the consumer inbox preserves one logical dispatch effect. Capture baseline, repaired and replay run records.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Each mechanism has a boundary: conditional reservation, stable payment key, local order/outbox commit, relay and consumer deduplication.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A successful payment followed by a failed local commit still needs reconciliation by order identity. Do not hold a database transaction open across a network payment merely to make the code look atomic.</p></details>
<details><summary>Worked explanation</summary><p>The protected model conserves inventory, produces one charge and one dispatch effect in both supplied failure schedules. Those are bounded experiments, not a proof for every implementation. The model assumes an idempotent payment API, durable local records and an inbox; the final design must state these contracts and the failure cases beyond them.</p></details>

## Under the hood: map each guarantee to executable machinery

For every success label in the capstone, identify its implementation dependency: row visibility and update protection for reservation; a private write set plus WAL commit for order/outbox atomicity; a durable key/result protocol for payment retries; and inbox/effect publication for dispatch deduplication. The orchestration model assumes these local engines exist; it does not implement all of them together.

Use your completed [visibility](./mvcc.html), [validation](./validation.html), [deadlock](./lock-manager.html) and [redo](./recovery-engine.html) implementations as supporting artifacts. Show a concrete internal counterexample if one mechanism is weakened. This connects application correctness to the state structures that enforce it, rather than treating database and broker guarantees as unexplained labels.

## Transfer the idea

Design the missing path: payment succeeds, the reservation expires, and confirmation cannot commit. Specify reconciliation or refund, a stable refund key, pending states and operator intervention. Then propose tests for concurrent duplicate requests and crashes during compensation.

**Success criteria:** submit baseline, protected and relay-replay evidence with separate inventory, charge, delivery and effect checks; map each guarantee to its local primitive; identify the unmodeled payment-success/reservation-expiry path.

**Primary reference:** [PostgreSQL isolation and transaction design](https://www.postgresql.org/docs/current/transaction-iso.html).
