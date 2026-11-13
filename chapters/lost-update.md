# Lose an update.

Two reservations succeed, but the stock falls only once. Force the schedule that a quick happy-path test would miss.

**You will:** Trace a stale read, identify a lost update, and move a decision into an atomic conditional operation. **Prerequisites:** chapters 1–3. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

Both clients read stock = 2. Each computes “the stock I read minus one.” Predict stock and reservation count after both write. What equation must still hold?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Step through the baseline. A and B each read 2, then each writes 1. Inspect both the stock and the number of reservations. The total available plus reserved must equal the initial stock. The FAIL is the point where the second successful request becomes unaccounted for.

## Change one thing

Edit the schedule to ["A.read", "A.write", "B.read", "B.write"], leaving the strategy as read-write. Does the failure disappear? Then select Repair, which starts with one item and checks current stock atomically. Verify that one client is rejected. Set repaired stock to 2 and compare both successful reservations with the broken baseline.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Follow the value each client read. A later write does not automatically recompute that old value.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>Compare a separately computed SET stock = 1 with SET stock = stock - 1 WHERE stock > 0. The latter makes the predicate and change one operation.</p></details>
<details><summary>Worked explanation</summary><p>The bad interleaving ends with stock 1 and two reservations from an initial stock of 2. A serial schedule hides the bug. The conditional repair evaluates the current stock at its modeled atomic write, so with one item the second request is rejected. In a real database the statement, isolation level, error handling and transaction boundary determine the exact behavior.</p></details>

## Transfer the idea

Replace stock with a user profile having two independently edited fields. Show when a whole-object overwrite loses unrelated changes. Propose a version-column compare-and-swap and specify what the client does after a conflict.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html).

[Take this investigation to independent PostgreSQL sessions →](./native.html#shared-postgresql)
