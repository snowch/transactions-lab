# Build MVCC visibility.

An UPDATE can create a new row version while an older transaction keeps reading the old value. Implement the predicate that decides which physical version becomes a logical row.

**You will:** evaluate xmin/xmax against snapshot membership and transaction status, trace an update's version chain, and identify versions vacuum must retain. **Prerequisites:** [transaction descriptors](./transaction-manager.html) and JavaScript sets/maps. **Runtime:** a small executable version store; PostgreSQL has additional visibility rules.

**Multiversion concurrency control (MVCC)** retains multiple physical tuple versions. A **snapshot** describes which transactions a reader can see; a committed version can still be outside an older snapshot. The diagram introduces the creator marker xmin and superseder marker xmax; the predicate below makes their meanings precise.

<!-- concept: mvcc -->

## Predict

Unlike the first diagram example, let the writer begin before the reader but remain active when the snapshot is captured. It commits afterward. Does an ID below the snapshot boundary make its new tuple visible? Predict the old tuple’s visibility if that writer aborts instead. Test both variations in Change one thing.

## A row is a history

This model stores each tuple as `{id, value, xmin, xmax}`. `xmin` identifies its creator. A non-null `xmax` identifies the transaction that superseded it. A separate transaction-status table says whether an ID is active, committed or aborted. These markers describe logical visibility; they do not physically remove a row when a transaction commits.

A snapshot contains the reader's own ID, an upper allocation boundary `xmax`, and IDs active when the snapshot was captured. The snapshot's xmax and a tuple's xmax are different fields with different meanings.

Define a transaction as visible to a snapshot when it is the reader itself, or when all three are true:

1. Its ID is below the snapshot's upper boundary.
2. It was absent from the snapshot's active set.
3. It committed successfully.

Then a tuple is visible if its creator is visible and its deleter/superseder is absent or not visible. A transaction that was active at snapshot time stays excluded even if it commits later. A transaction that aborted must not become a visible creator. An aborted delete must not erase the old version.

## Control the experiment

The page loads **Baseline** with one version worth 100 and a schedule that starts the reader before the writer. Select **Step** through the update and commit. In **Physical tuple versions**, follow `Creator xmin` and `Superseder xmax`. Compare the writer’s status with the reader’s pinned snapshot.

<!-- experiment -->

The version chain outlines the tuple visible to the selected snapshot and labels every hidden version. In the Read Committed scenario, the drawing explicitly projects a fresh statement’s view from the current state. Follow xmin/xmax and compare the selected tuple with the retained version table.

At the last read, **Baseline** has removed `v0` too early. Run **Repair** and compare the version table and **Observed values**. Then run **new-snapshot**. It uses a fresh statement snapshot, so the reader may see 70 after the writer commits.

## Inspect and implement visibility

The same visibility rule supports reads and version retention. Select **Test implementation** to see which cases the starter misses. In **Your JavaScript implementation**, use the creator and superseder rules above. Test again, especially the active-at-capture creator, aborted superseder and reader’s own write.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

Choose **Repair** and open **Edit the experiment**. In `schedule`, move `"begin-writer"` to the first position, before `"begin-reader"`; keep the other operations in order. Select **Run to end**. Check the `active` list in **Pinned snapshot** and the last **Observed values**. Why can a lower transaction ID still be invisible?

Replace `"commit-writer"` with `"abort-writer"` and run again. Compare the writer’s status, `Superseder xmax` on the old version and the final observed value. Restore the **Repair** schedule. Move `"vacuum"` immediately before `"commit-writer"`, run, then select the vacuum step in the trace. Which versions did it retain while the writer was still active?

<details><summary>Hint 1 · Test creation and deletion separately</summary><p>Apply the same snapshot membership question to xmin and xmax. A visible creator plus an invisible deleter means the old tuple remains visible.</p></details>
<details><summary>Hint 2 · Commit time is not snapshot membership</summary><p>An ID below the snapshot boundary may have been active at capture. Its later commit does not move it into that historical snapshot.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The pinned reader keeps seeing 100 while a new snapshot sees 70. Removing v0 because a current reader prefers v2 destroys the old snapshot's history. The repair retains versions needed by its explicit pin set and active creators. PostgreSQL uses visibility horizons and more metadata, including command IDs, subtransactions, wraparound handling and tuple-header flags; this small predicate deliberately does not reproduce all of those details.</p></div>

## Transfer the idea

Design a second pinned reader that begins after the writer commits. Draw the minimum tuple set needed by both snapshots. The browser engine has one reader; testing two pins requires extending the downloaded engine. Explain how a long-running transaction can retain dead versions and increase storage even while short transactions commit normally. Then predict whether visibility alone prevents write skew; follow the next isolation investigations to test that prediction.

**Success criteria:** calculate visibility from creator, superseder, active-at-capture membership and status; explain an aborted writer; retain every version needed by the pinned snapshot; pass the visibility bench and distinguish the two meanings of xmax.

**Primary sources:** [PostgreSQL system columns](https://www.postgresql.org/docs/current/ddl-system-columns.html), [MVCC introduction](https://www.postgresql.org/docs/current/mvcc-intro.html) and [vacuum](https://www.postgresql.org/docs/current/routine-vacuuming.html).
