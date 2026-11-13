# State the invariant.

A transfer can preserve the total money and still pay the wrong person. Write the promise precisely enough that a test can catch that mistake.

**You will:** distinguish a conservation rule from the intended business outcome and write an independent verification query. **Prerequisites:** basic SELECT and UPDATE. **Runtime:** real PostgreSQL through PGlite; one private connection on this page.

## Predict

Alice and Bob each start with 100. Alice asks to send Bob 30. What should each balance be? Is checking a total of 200 sufficient?

## Inspect the initial state

```sql
SELECT id, balance FROM accounts ORDER BY id;
SELECT sum(balance) AS total FROM accounts;
```

An **invariant** is a property that must remain true across the operations being considered. Here the total must stay 200 and balances must stay nonnegative. The request also has a postcondition: Alice has 70 and Bob has 130 after this particular transfer succeeds.

## Run the defective transfer

```sql
BEGIN;
UPDATE accounts SET balance = balance - 30 WHERE id = 'alice';
UPDATE accounts SET balance = balance + 30 WHERE id = 'alice';
COMMIT;
SELECT sum(balance) = 200 AS conserved,
       bool_and(balance >= 0) AS nonnegative
FROM accounts;
SELECT id, balance FROM accounts ORDER BY id;
```

Both invariant checks pass. Inspect the individual rows before deciding whether the request succeeded. A passing test can be too weak.

## Break, repair, verify

Reset the database. Change the second update to credit Bob and run it again. Then run this independent postcondition check:

```sql
SELECT (SELECT balance FROM accounts WHERE id = 'alice') = 70
   AND (SELECT balance FROM accounts WHERE id = 'bob') = 130
   AS intended_transfer_completed;
```

The original published sequence deliberately returns false. Your repair should make it true while preserving the total. Restore SQL restores the text; Reset database restores the data. All editors on this page share one database; navigation starts a fresh one.

<details><summary>Hint 1 · Follow the identity</summary><p>Compare the recipient in the request with the predicate in the second UPDATE. Arithmetic correctness does not establish that the intended row changed.</p></details>
<details><summary>Hint 2 · Keep two kinds of checks</summary><p>Use a general invariant for every transfer and a specific expected outcome for this request. Neither replaces the other.</p></details>
<details><summary>Worked explanation</summary><p>The first transaction debits and credits Alice, leaving both balances at 100. It conserves money and respects the row constraints, but fails the requested effect. Crediting Bob produces 70 and 130. An explicit transaction makes the chosen statements atomic; it does not choose the right statements for you.</p></details>

## Transfer the idea

Add a fee account. Define the conservation rule for a transfer of 30 with a fee of 2, stating who pays it. Write expected individual balances and a query that would catch a fee accidentally credited to Bob. Record which checks are enforced by the database and which your application or verifier must enforce.

**Primary reference:** [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).
