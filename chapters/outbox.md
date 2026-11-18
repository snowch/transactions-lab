# Close the dual-write gap.

An order is paid in the database, but its dispatch event never appears. Move the intent into the local commit boundary, then account for repeated publication.

**You will:** make a durable event intent atomic with a local state change and distinguish a repeated delivery from a repeated effect. **Prerequisites:** [local commit](./wal.html) and [whole-decision retries](./retries.html). **Runtime:** a teaching model and a separate private PostgreSQL database.

An **outbox** is a database table of publication intents committed with the business change. A **relay** later reads those committed rows and sends messages. A consumer **inbox** records received event identities so its local effect can be deduplicated atomically.

<!-- concept: outbox -->

## Predict before running

In the duplicate scenario, the relay sends once and crashes before recording progress. Predict the counts of paid orders, durable event intents and publications after restart. Which counts can differ without losing intent, and which additional consumer guarantee is still needed?

## Control the experiment

The page loads **Baseline** with an order write followed by a separate publication. Select **Run to end** and inspect `order`, `outbox` and `published` after the simulated restart.

<!-- experiment -->

The drawing separates the local order, durable publication intent and broker publication count. The absent-intent case exposes the recovery gap, while repeated publication remains visible even when there is just one order.

## Inspect the evidence

Watch for a paid `order` with `outbox` false and `published` zero. The model has a committed order but no saved message for the relay to find.

## Change one thing

Choose **Repair** and select **Run to end**. Compare `outbox` and `published` with **Baseline**. Choose **duplicate** and run again. This changes the crash point from after the database commit to after the first publication. How many publications does the model count for the one order, and which consumer protection would keep its effect from repeating?

## Make the local boundary real

The browser prepares a separate PostgreSQL database with empty `orders` and `outbox` tables. Choose **Run SQL** in **SQL 01**. Look for one order with its `event_id` after COMMIT.

```sql
BEGIN;
INSERT INTO orders VALUES ('order-1', 'paid');
INSERT INTO outbox VALUES ('order-1:paid:1', 'order-1',
  '{"type":"OrderPaid","order_id":"order-1","version":1}');
COMMIT;
SELECT o.id, o.status, b.event_id, b.payload
FROM orders o JOIN outbox b ON b.order_id = o.id;
```

Choose **Run SQL** in **SQL 02**. Inspect `order_survived` and `intent_survived` after ROLLBACK.

```sql
BEGIN;
INSERT INTO orders VALUES ('order-2', 'paid');
INSERT INTO outbox VALUES ('order-2:paid:1', 'order-2',
  '{"type":"OrderPaid","order_id":"order-2","version":1}');
ROLLBACK;
SELECT EXISTS(SELECT 1 FROM orders WHERE id = 'order-2') AS order_survived,
       EXISTS(SELECT 1 FROM outbox WHERE order_id = 'order-2') AS intent_survived;
```

Both columns are false for `order-2`. Select **Reset database** above **SQL 01** and wait for **Ready**. In **SQL 02**, replace `ROLLBACK;` with `COMMIT;` and select **Run SQL** in that cell only. Do both columns now report true? This comparison uses the real local transaction; publication remains a separate model activity.

<details><summary>Place the intent in the transaction</summary><p>Store the instruction to publish in the same database transaction as the business change.</p></details>
<details><summary>Count intent and delivery separately</summary><p>A unique outbox row prevents duplicate intent. It does not prove only one delivery or one external effect.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The outbox closes the gap between the local database state and durable publication intent. It trades an unsafe dual write for a recoverable relay workflow. Publication may be repeated, so the end-to-end contract still needs stable event identities, ordering policy, retention and sink behavior. A paid order with no event is a different failure from two deliveries with one deduplicated effect.</p></div>

## Under the hood: one local write set, two recovery loops

The order row and outbox row share the database's local transaction manager, visibility and WAL commit path. The relay scans committed outbox intent, sends an event and records progress. A crash after the send but before its progress commit leaves recoverable work that may be sent again.

An inbox repair requires the consumer to insert the event identity and apply its local effect in one consumer-side transaction. If the inbox marker commits first and the effect later, a crash can suppress needed work. If the effect happens first and the marker later, a retry can duplicate it. The marker/effect pair needs the same atomic publication and recovery reasoning as any other local transaction.

Trace this using the [private write-set manager](./transaction-manager.html) and [WAL engine](./recovery-engine.html). The broker and HTTP effects do not become part of those local write sets just because application code calls them inside a transaction function.

## Transfer the idea

Add cancellation. A payment event and cancellation event can be delivered out of order. Propose per-order versions and explain how the consumer avoids reopening a cancelled order. Decide when outbox and inbox records can safely expire.

**Success criteria:** show paid status and event intent committing or rolling back together; count publications after relay restart; locate the consumer marker/effect atomic boundary and state how event identity and ordering survive retries.

**Primary reference:** [Apache Kafka delivery semantics](https://kafka.apache.org/documentation/#semantics).
