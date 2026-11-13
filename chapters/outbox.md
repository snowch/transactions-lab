# Close the dual-write gap.

An order is paid in the database, but its dispatch event never appears. Move the intent into the local commit boundary, then account for repeated publication.

**You will:** Make a durable event intent atomic with a local state change and distinguish eventual delivery from exactly-once effects. **Prerequisites:** local transactions, recovery and retries. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

If the application commits paid status before publishing, what does a crash between those steps leave? Does publishing first remove the problem or move it?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Run the dual-write baseline. The paid order survives without any durable event intent. Run the outbox repair: paid status and an event record survive together. A restarted relay can find the remaining work. Its progress marker is a separate failure boundary.

## Change one thing

Try duplicate. The relay publishes, crashes before recording progress and publishes again. Inspect published rather than looking only at final order status. An outbox needs a consumer deduplication/idempotency contract or a broker protocol covering the required effect.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Store the instruction to publish in the same database transaction as the business change.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A unique outbox row prevents duplicate intent. It does not prove only one delivery or one external effect.</p></details>
<details><summary>Worked explanation</summary><p>The outbox closes the gap between the local database state and durable publication intent. It trades an unsafe dual write for a recoverable relay workflow. Publication may be repeated, so the end-to-end contract still needs stable event identities, ordering policy, retention and sink behavior. A paid order with no event is a different failure from two deliveries with one deduplicated effect.</p></details>

## Transfer the idea

Add cancellation. A payment event and cancellation event can be delivered out of order. Propose per-order versions and explain how the consumer avoids reopening a cancelled order. Decide when outbox and inbox records can safely expire.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [Apache Kafka delivery semantics](https://kafka.apache.org/documentation/#semantics).

## Make the local boundary real

The model above uses an abstract durable database. This separate, genuine SQL experiment commits the order and outbox record together in the browser. It does not publish to a broker.

```sql
BEGIN;
INSERT INTO orders VALUES ('order-1', 'paid');
INSERT INTO outbox VALUES ('order-1:paid:1', 'order-1',
  '{"type":"OrderPaid","order_id":"order-1","version":1}');
COMMIT;
SELECT o.id, o.status, b.event_id, b.payload
FROM orders o JOIN outbox b ON b.order_id = o.id;
```

```sql
BEGIN;
INSERT INTO orders VALUES ('order-2', 'paid');
INSERT INTO outbox VALUES ('order-2:paid:1', 'order-2',
  '{"type":"OrderPaid","order_id":"order-2","version":1}');
ROLLBACK;
SELECT EXISTS(SELECT 1 FROM orders WHERE id = 'order-2') AS order_survived,
       EXISTS(SELECT 1 FROM outbox WHERE order_id = 'order-2') AS intent_survived;
```

Both booleans for order-2 must be false. Change ROLLBACK to COMMIT after resetting and verify both become true. Database state is separate from the model and starts fresh on navigation.
