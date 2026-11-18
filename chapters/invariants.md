# State the invariant.

A transfer can preserve the total money and still pay the wrong person. An **invariant** is a rule the operation must preserve. A **postcondition** describes the outcome a specific request must produce. Test both rules for the same transfer.

**You will:** distinguish a conservation rule from the intended business outcome and write an independent verification query. **Prerequisites:** basic SELECT and UPDATE. **Runtime:** real PostgreSQL through PGlite; one private connection on this page.

<!-- concept: boundary -->

## Predict

Alice and Bob each start with 100. Alice asks to send Bob 30. Compare Alice/Bob balances of 70/130 and 50/150. Both pairs have total 200 and nonnegative balances. What check can distinguish the requested transfer from the other outcome?

## Inspect the initial state

The page prepares one private PostgreSQL database with Alice and Bob at 100 each. Select **Run SQL** in **SQL 01**. Inspect `balance` for each `id` and the `total`.

```sql
SELECT id, balance FROM accounts ORDER BY id;
SELECT sum(balance) AS total FROM accounts;
```

For this request, the total must stay 200 and balances must stay nonnegative. The requested result is Alice at 70 and Bob at 130.

## Run the defective transfer

Select **Run SQL** in **SQL 02** with the code unchanged. Compare `conserved` and `nonnegative` with the individual balances. Which row received the credit?

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

Both invariant checks return true while Alice and Bob still have 100 each. The requested result is missing.

## Break, repair, verify

First select **Run SQL** in **SQL 03**, leaving the defective result in the database. `intended_transfer_completed` is false. Select **Reset database** above **SQL 01** and wait for **Ready**. In **SQL 02**, change only the second `WHERE id = 'alice'` to `WHERE id = 'bob'`. Run **SQL 02** and then this **SQL 03** check again.

```sql
SELECT (SELECT balance FROM accounts WHERE id = 'alice') = 70
   AND (SELECT balance FROM accounts WHERE id = 'bob') = 130
   AS intended_transfer_completed;
```

Look for `intended_transfer_completed` changing to true while `conserved` stays true. **Reset database** reloads the fixture and keeps your SQL text. **Restore SQL** changes only the selected editor. Use **Recover edit** to retrieve its previous text.

<details><summary>Hint 1 · Follow the identity</summary><p>Compare the recipient in the request with the predicate in the second UPDATE. Arithmetic correctness does not establish that the intended row changed.</p></details>
<details><summary>Hint 2 · Keep two kinds of checks</summary><p>Use a general invariant for every transfer and a specific expected outcome for this request. Neither replaces the other.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The first transaction debits and credits Alice, leaving both balances at 100. It conserves money and respects the row constraints, but fails the requested effect. Crediting Bob produces 70 and 130. An explicit transaction makes the chosen statements atomic; it does not choose the right statements for you.</p></div>

## Under the hood: who enforces which rule?

A CHECK constraint is evaluated against the proposed row during statement execution. A primary/unique key normally has an index-backed enforcement path that coordinates conflicting inserts. These mechanisms can reject a local invalid write; they do not infer that the programmer meant to credit Bob rather than Alice.

The engine also tracks a transaction descriptor and its tentative effects. Atomic commit publishes or abandons those effects together. That publication mechanism and the business postcondition are separate pieces: an atomic execution of the wrong statements is still the wrong transfer.

[Build the descriptor and publication mechanism next →](./transaction-manager.html)

## Transfer the idea

Design a three-account variant in **Write your design notes**. State who pays a fee of 2 on a transfer of 30, and give the expected balances for Alice, Bob and the fee account. Write a query that would catch a fee accidentally credited to Bob. The prepared fixture has two accounts; this is a design task.

**Success criteria:** show a state that passes conservation but fails the requested transfer; submit a query checking both individual balances; distinguish an enforced constraint from an application postcondition.

**Primary reference:** [PostgreSQL constraints](https://www.postgresql.org/docs/current/ddl-constraints.html).
