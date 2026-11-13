# Build MVCC visibility.

An UPDATE can create a new row version while an older transaction keeps reading the old value. Implement the predicate that decides which physical version becomes a logical row.

**You will:** evaluate xmin/xmax against snapshot membership and transaction status, trace an update's version chain, and identify versions vacuum must retain. **Prerequisites:** transaction descriptors and sets/maps. **Runtime:** a small executable version store; PostgreSQL has additional visibility rules.

## Predict

A reader starts before a writer commits an update from 100 to 70. After commit, are both stored versions still needed? Is “the creator has committed now” enough to make the new version visible to the old reader?

## A row is a history

This model stores each tuple as `{id, value, xmin, xmax}`. `xmin` identifies its creator. A non-null `xmax` identifies the transaction that superseded it. A separate transaction-status table says whether an ID is active, committed or aborted. These markers describe logical visibility; they do not physically remove a row when a transaction commits.

A snapshot contains the reader's own ID, an upper allocation boundary `xmax`, and IDs active when the snapshot was captured. The snapshot's xmax and a tuple's xmax are different fields with different meanings.

Define a transaction as visible to a snapshot when it is the reader itself, or when all three are true:

1. Its ID is below the snapshot's upper boundary.
2. It was absent from the snapshot's active set.
3. It committed successfully.

Then a tuple is visible if its creator is visible and its deleter/superseder is absent or not visible. A transaction that was active at snapshot time stays excluded even if it commits later. A transaction that aborted must not become a visible creator. An aborted delete must not erase the old version.

## Control the experiment

The reader receives ID 1 and pins a snapshot. The writer receives ID 2. UPDATE marks v0's xmax = 2 and appends v2 with xmin = 2. Commit changes the status table; it does not replace the old reader's snapshot.

<!-- experiment -->

The version chain outlines the tuple visible to the selected snapshot and labels every hidden version. In the Read Committed scenario, the drawing explicitly projects a fresh statement’s view from the current state. Follow xmin/xmax and compare the selected tuple with the retained version table.

The baseline vacuum keeps only what a new reader sees, removing v0 too early. The old reader then has no visible row. Repair retains versions visible to the pinned snapshot and versions belonging to active creators. Try new-snapshot: Read Committed obtains a fresh snapshot per statement and can read 70 after the writer commits.

## Inspect and implement visibility

The engine calls this predicate for reads and for retention. The implementation bench tests independent cases including active-at-snapshot creators, aborted deletes and the reader's own writes. Read the rule before opening the reference solution.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

Move begin-writer before begin-reader, leaving the writer active at snapshot capture. Now the writer's ID can be below the reader's upper boundary and still be invisible because it is in the active set. Replace commit-writer with abort-writer; check both the aborted new tuple and the old tuple's aborted xmax. Move vacuum before commit and verify that the repaired engine retains the active writer's potential future version.

<details><summary>Hint 1 · Test creation and deletion separately</summary><p>Apply the same snapshot membership question to xmin and xmax. A visible creator plus an invisible deleter means the old tuple remains visible.</p></details>
<details><summary>Hint 2 · Commit time is not snapshot membership</summary><p>An ID below the snapshot boundary may have been active at capture. Its later commit does not move it into that historical snapshot.</p></details>
<details><summary>Worked explanation</summary><p>The pinned reader keeps seeing 100 while a new snapshot sees 70. Removing v0 because a current reader prefers v2 destroys the old snapshot's history. The repair retains versions needed by its explicit pin set and active creators. PostgreSQL uses visibility horizons and more metadata, including command IDs, subtransactions, wraparound handling and tuple-header flags; this small predicate deliberately does not reproduce all of those details.</p></details>

## Transfer the idea

Add a second pinned reader that begins after the writer commits. Draw the minimum tuple set needed by both snapshots. Explain how a long-running transaction can retain dead versions and increase storage even while short transactions commit normally. Then predict whether this visibility mechanism alone prevents write skew; follow the next isolation investigations to test that prediction.

**Primary sources:** [PostgreSQL system columns](https://www.postgresql.org/docs/current/ddl-system-columns.html), [MVCC introduction](https://www.postgresql.org/docs/current/mvcc-intro.html) and [vacuum](https://www.postgresql.org/docs/current/routine-vacuuming.html).
