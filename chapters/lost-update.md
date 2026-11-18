# Lose an update.

Two reservations succeed, but the stock falls only once. Force the schedule that a quick happy-path test would miss.

**You will:** trace a stale read, identify a lost update, and move a decision into an atomic conditional operation. **Prerequisites:** [conditional reservations](./constraints.html) and [version visibility](./mvcc.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

<!-- concept: lostUpdate -->

## Predict before running

The diagram uses stock = 2. Predict the same overlapping read/write schedule with stock = 3: final stock, reservations and stock + reservations. Then predict a conditional repair at that same stock. Keep these predictions for the controlled comparison in Change one thing.

## Control the experiment

The page loads **Baseline** with two bicycles and both reads before either write. Select **Step** until both writes have run. Read `reads`, `stock` and `reservations` to see whether both promises are backed by stock.

<!-- experiment -->

## Inspect the evidence

Step through the baseline. A and B each read 2, then each writes 1. Inspect both the stock and the number of reservations. The total available plus reserved must equal the initial stock. The conservation check reports a violation at the second successful request.

## Change one thing

Open **Edit the experiment** in **Baseline**. Replace `schedule` with `["A.read", "A.write", "B.read", "B.write"]`. Select **Run to end** and compare the final `stock` and `reservations`. Does the conservation check still report a violation?

Select **Restore scenario** to return to the overlapping schedule. Select **Repair**. It changes `strategy` and `stock`. In **Edit the experiment**, set `stock` to `2` and select **Run to end**. Compare the conservation check with the original run. Then repeat with `stock` set to `3` under **Baseline** and under **Repair**, keeping the default schedule in both. Finally set `stock` to `1` in **Repair**, run again, and identify the client in `rejected`.

<details><summary>Read the earlier stock value</summary><p>Follow the value each client read. A later write does not automatically recompute that old value.</p></details>
<details><summary>Keep the reservation in the transaction</summary><p>Compare a separately computed SET stock = 1 with SET stock = stock - 1 WHERE stock > 0. The latter makes the predicate and change one operation.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The bad interleaving ends with stock 1 and two reservations from an initial stock of 2. A serial schedule hides the bug. The conditional repair evaluates the current stock at its modeled atomic write, so with one item the second request is rejected. In a real database the statement, isolation level, error handling and transaction boundary determine the exact behavior.</p></div>

## Under the hood: locking a write does not refresh an application value

A read-modify-write request has two values: the database's current tuple and the value retained in client memory. Serializing the eventual writes cannot correct a stale literal computed earlier. Two statements equivalent to SET stock = 1 can each obtain valid write protection and still overwrite the same logical decrement.

A conditional decrement combines reading the current protected row, deciding availability and installing its new version in the same database operation. An alternative is optimistic validation: store the version observed during the read, then refuse publication if it changed. That refusal is computed from a version comparison, not from a guess about how many requests overlapped.

[Revisit the visibility predicate](./mvcc.html), then [build the version validator](./validation.html). Compare their data structures: visibility chooses a readable historical version; validation decides whether a tentative transaction can safely publish.

## Transfer the idea

Replace stock with a user profile having two independently edited fields. Show when a whole-object overwrite loses unrelated changes. Propose a version-column compare-and-swap and specify what the client does after a conflict.

**Success criteria:** record stock, reservation count and their sum for the failing interleaving; repair at the same initial stock before testing sold out; show why changing only the schedule hides the stale-write defect.

**Primary reference:** [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

[Take this investigation to independent PostgreSQL sessions →](./native.html#shared-postgresql)
