# Make a transfer atomic.

The debit succeeds. The credit fails. Decide which changes may be left behind and put the transaction boundary around that decision.

**You will:** observe rollback, use a savepoint and separate atomicity from isolation and durability. **Prerequisites:** chapter 1. **Runtime:** real PostgreSQL, one connection; no competing client.

## Predict

If you debit Alice and lose the request before crediting Bob, can a later credit safely be treated as a separate request? What if the client does not know whether the debit committed?

## Expose the intermediate state

```sql
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 'alice';
SELECT id, balance FROM accounts ORDER BY id;
```

This connection sees its own uncommitted debit: 70 and 100. It has not demonstrated another client's visibility. Leave the transaction open until the next experiment.

## Abandon the request

```sql
ROLLBACK;
SELECT id, balance FROM accounts ORDER BY id;
SELECT sum(balance) = 200 AS conserved FROM accounts;
```

Rollback abandons all changes inside this transaction. It cannot recall an email or a payment made through another service.

## Recover a smaller mistake

A **savepoint** marks a position inside a transaction. Predict whether the debit survives rolling back to `before_credit`.

```sql
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 'alice';
SAVEPOINT before_credit;
UPDATE accounts SET balance = balance + 300 WHERE id = 'bob';
ROLLBACK TO SAVEPOINT before_credit;
UPDATE accounts SET balance = balance + 30 WHERE id = 'bob';
COMMIT;
SELECT id, balance FROM accounts ORDER BY id;
SELECT sum(balance) = 200 AS conserved FROM accounts;
```

## Change one thing

Reset. Change the debit to 130 and run the sequence. The nonnegative constraint rejects it. This lab rolls back an open transaction after an SQL error. Inspect the balances before retrying; do not assume the later statements ran. A real application must explicitly handle its driver's transaction error state.

<details><summary>Hint 1 · Draw the boundaries</summary><p>Mark BEGIN, SAVEPOINT, ROLLBACK TO and COMMIT. The savepoint occurs after the debit.</p></details>
<details><summary>Hint 2 · Separate the guarantees</summary><p>Atomicity groups effects. Isolation controls interactions with concurrent transactions. Durability concerns what survives an acknowledged commit under a stated failure model.</p></details>
<details><summary>Worked explanation</summary><p>Full rollback restores 100 and 100. Rolling back to the savepoint only removes the incorrect credit; the earlier debit remains pending until the corrected credit and the transaction commit. The final balances are 70 and 130. This in-memory browser experiment demonstrates SQL boundaries; it does not demonstrate power-loss durability or concurrent isolation.</p></details>

## Under the hood: from SQL to a transaction outcome

The executor runs statements inside a transaction context. An update finds a tuple version, obtains the required concurrency protection, creates a new version or records a staged change, and generates recovery information. A rollback makes the attempt's effects logically invisible; it need not physically erase every byte it wrote. A savepoint adds a nested rollback boundary, often implemented through subtransaction state and resource tracking.

A durable engine's commit path orders recovery information, the commit decision, visibility and acknowledgement. The precise protocol varies: it must prevent another observer from treating an unrecoverable change as a durable success. The browser SQL demonstrates transaction semantics; it does not measure a production disk flush.

Inspect the currently visible tuples' actual system columns:

```sql
SELECT id, balance, xmin::text AS creator_xid, xmax::text AS xmax_marker
FROM accounts ORDER BY id;
BEGIN;
SELECT pg_current_xact_id()::text AS writer_xid;
UPDATE accounts SET balance = balance WHERE id = 'alice';
SELECT id, balance, xmin::text AS creator_xid, xmax::text AS xmax_marker
FROM accounts ORDER BY id;
ROLLBACK;
SELECT id, balance, xmin::text AS creator_xid, xmax::text AS xmax_marker
FROM accounts ORDER BY id;
```

Even a value-preserving UPDATE can create a new tuple version. Compare Alice's creator marker inside the transaction and after rollback; do not grade exact transaction ID numbers. SELECT shows visible tuples, not every physical historical version. PostgreSQL xmax can also encode locking information or a MultiXact; the next toy MVCC engine deliberately simplifies that field to a superseding transaction ID.

[Implement snapshot visibility →](./mvcc.html) · [Inspect buffer and log recovery →](./recovery-engine.html)

## Transfer the idea

A checkout reserves stock, inserts an order and sends an email. Draw the smallest useful local transaction. Place the email outside it and identify the failure gap this introduces. Save that unresolved question for the outbox lab.

**Primary reference:** [PostgreSQL transactions](https://www.postgresql.org/docs/current/tutorial-transactions.html).
