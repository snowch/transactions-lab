# Reserve the last item.

Two customers see one bicycle. Move the availability decision into the same atomic operation as the stock change.

**You will:** combine a conditional update, a reservation row and database constraints. **Prerequisites:** transaction boundaries. **Runtime:** real PostgreSQL, one connection. The next lab controls the competing-client schedule.

<!-- concept: reservation -->

## Predict

If both requests read stock = 1 before either writes, why might both applications decide they can reserve it? Can a CHECK on nonnegative stock enforce the identity and existence of every reservation?

## Inspect the fixture

```sql
SELECT * FROM inventory ORDER BY sku;
SELECT * FROM reservations;
```

The CHECK enforces nonnegative stock. The reservation primary key identifies a request, and its foreign key requires an existing product. These are complementary rules.

## Commit the reservation and stock together

```sql
BEGIN;
WITH taken AS (
  UPDATE inventory SET stock = stock - 1
  WHERE sku = 'bike' AND stock > 0
  RETURNING sku
)
INSERT INTO reservations(request_id, sku)
SELECT 'request-a', sku FROM taken
RETURNING *;
COMMIT;
SELECT * FROM inventory WHERE sku = 'bike';
```

The returned row is the evidence that this request obtained stock. An empty RETURNING result means no reservation was made; it is not a successful checkout.

## Try the second customer

```sql
BEGIN;
WITH taken AS (
  UPDATE inventory SET stock = stock - 1
  WHERE sku = 'bike' AND stock > 0
  RETURNING sku
)
INSERT INTO reservations(request_id, sku)
SELECT 'request-b', sku FROM taken
RETURNING *;
COMMIT;
SELECT stock + (SELECT count(*) FROM reservations WHERE sku = 'bike') = 1
       AS inventory_conserved
FROM inventory WHERE sku = 'bike';
```

The second request changes no row. This sequential run establishes the conditional statement's behavior, not contention. Use the shared-server exercise to observe two clients updating the same row.

## Change one thing

Reset. Remove `AND stock > 0` in both cells and repeat. The second debit should fail the CHECK and the lab will roll back that transaction. Compare rejecting an invalid state with expressing a normal “sold out” outcome through a zero-row update.

<details><summary>Hint 1 · Check the returned row</summary><p>Do not infer success just because SQL execution completed. Count the reservation rows and inspect the UPDATE's RETURNING result.</p></details>
<details><summary>Hint 2 · Think about retries</summary><p>A stable request ID prevents a duplicate reservation row, but an application must return the original result on retry. It must not decrement stock and then silently ignore a duplicate INSERT.</p></details>
<details><summary>Worked explanation</summary><p>The data-modifying CTE passes a product to INSERT only when a decrement succeeds. Both effects share the transaction. Exactly one of the sequential requests obtains the bicycle. Under PostgreSQL Read Committed, a competing updater waits and reevaluates the predicate against the updated row; other isolation levels can require a transaction retry. A cross-row invariant needs more than this row-local predicate.</p></details>

## Under the hood: one predicate, one protected update

The UPDATE does not grant a reservation just because an application previously read stock = 1. It locates a candidate tuple, obtains the needed row protection and applies the availability predicate as part of the write operation. At PostgreSQL Read Committed, an updater that waited for another updater can recheck its predicate against that transaction's updated row version. A snapshot/serializable execution can instead need a retry.

The RETURNING row connects the successful decrement to the reservation INSERT inside the same transaction. The reservation's unique index enforces request identity; the foreign-key path enforces a referenced product. A retry that decrements stock and then ignores a duplicate reservation INSERT would violate the intended accounting even though uniqueness itself held.

[Inspect version visibility](./mvcc.html), [implement lock compatibility](./lock-manager.html), then explain how these mechanisms support the statement-level behavior observed here.

## Transfer the idea

Reserve a bicycle and helmet as one bundle. Describe how you will undo a partial reservation if the helmet is unavailable. Then specify a consistent lock order and a stable request identity. [Run the real-server extension](./native.html).

**Primary references:** [Read Committed](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-READ-COMMITTED) and [data-modifying WITH](https://www.postgresql.org/docs/current/queries-with.html#QUERIES-WITH-MODIFYING).
