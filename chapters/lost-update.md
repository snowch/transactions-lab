# Lose an update.

Two reservations succeed, but the stock falls only once. Force the schedule that a quick happy-path test would miss.

**You will:** Trace a stale read, identify a lost update, and move a decision into an atomic conditional operation. **Prerequisites:** [conditional reservations](./constraints.html) and [version visibility](./mvcc.html). **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

<!-- concept: lostUpdate -->

## Predict before running

The diagram uses stock = 2. Predict the same overlapping read/write schedule with stock = 3: final stock, reservations and stock + reservations. Then predict a conditional repair at that same stock. Keep these predictions for the controlled comparison in Change one thing.

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Step through the baseline. A and B each read 2, then each writes 1. Inspect both the stock and the number of reservations. The total available plus reserved must equal the initial stock. The FAIL is the point where the second successful request becomes unaccounted for.

## Change one thing

Edit only the baseline schedule to ["A.read", "A.write", "B.read", "B.write"]. Does the failure disappear? Restore the baseline before the next comparison.

Select Repair and inspect the changed-setting notice: this preset changes both strategy and stock. First set stock back to 2, keeping the overlapping schedule, so only strategy differs from the baseline. Compare conservation. Then test your prediction with stock = 3 under each strategy, holding stock and schedule equal within that pair. Finally change repaired stock to 1 and verify that one client is rejected. A different starting stock is a different experiment.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Follow the value each client read. A later write does not automatically recompute that old value.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>Compare a separately computed SET stock = 1 with SET stock = stock - 1 WHERE stock > 0. The latter makes the predicate and change one operation.</p></details>
<details><summary>Worked explanation</summary><p>The bad interleaving ends with stock 1 and two reservations from an initial stock of 2. A serial schedule hides the bug. The conditional repair evaluates the current stock at its modeled atomic write, so with one item the second request is rejected. In a real database the statement, isolation level, error handling and transaction boundary determine the exact behavior.</p></details>

## Under the hood: locking a write does not refresh an application value

A read-modify-write request has two values: the database's current tuple and the value retained in client memory. Serializing the eventual writes cannot correct a stale literal computed earlier. Two statements equivalent to SET stock = 1 can each obtain valid write protection and still overwrite the same logical decrement.

A conditional decrement combines reading the current protected row, deciding availability and installing its new version in the same database operation. An alternative is optimistic validation: store the version observed during the read, then refuse publication if it changed. That refusal is computed from a version comparison, not from a guess about how many requests overlapped.

[Revisit the visibility predicate](./mvcc.html), then [build the version validator](./validation.html). Compare their data structures: visibility chooses a readable historical version; validation decides whether a tentative transaction can safely publish.

## Transfer the idea

Replace stock with a user profile having two independently edited fields. Show when a whole-object overwrite loses unrelated changes. Propose a version-column compare-and-swap and specify what the client does after a conflict.

**Success criteria:** record stock, reservation count and their sum for the failing interleaving; repair at the same initial stock before testing sold out; show why changing only the schedule hides the stale-write defect.

**Primary reference:** [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

[Take this investigation to independent PostgreSQL sessions →](./native.html#shared-postgresql)
