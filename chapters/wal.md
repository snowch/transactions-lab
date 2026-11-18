# Find the commit point.

A transfer changes two pages. The machine can stop after either write. Give recovery enough durable information to choose one complete outcome.

**You will:** trace write-ahead logging, identify a durable commit record, and recover every prefix of the write sequence. **Prerequisites:** [file persistence ordering](./files.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

A **log sequence number (LSN)** identifies a record's position in the recovery log. A page's **pageLSN** identifies the newest logged change installed in that page. A durable log flush preserves a prefix of records; it is different from writing a changed data page. This lab starts with simpler durable/not-durable flags, then the next engine exposes numeric LSNs.

**Write-ahead logging (WAL)** puts a recoverable description of each change on durable storage before its data page. An **after-image** gives the value that recovery should restore after commit.

<!-- concept: wal -->

## Predict before running

Compare a crash after Alice’s page install in the in-place baseline with that same event in the WAL repair. Does the repair already have a durable COMMIT at that point? Also predict recovery after its log flush but before its commit marker. Use durable facts rather than event position alone.

## Control the experiment

The page loads **Baseline** with Alice and Bob at 100 and no recovery log. Select **Run to end**, then select **Install Alice’s page on disk** in the trace. Select **Crash & recover here** and inspect `disk` and the model check.

<!-- experiment -->

The drawing separates after-images, the commit marker and current disk values. A durable log record and an installed data page are different facts; step through the point where recovery gains enough information to finish the pair.

## Inspect the evidence

Look for Alice at 70 and Bob at 100 in `disk`. The independent model check detects the incomplete pair. Selecting a different trace entry shows that entry’s original state, so you can test several crash points in one run.

## Change one thing

Choose **Repair** and select **Run to end** to reveal all the WAL steps. Select **Append both after-images to the log buffer**, **Flush the log records**, **Flush the commit marker after the log records**, and each **Install … page on disk** entry in turn. Select **Crash & recover here** after choosing each entry. Compare `logDurable`, `commitDurable` and the recovered `disk` values. Which event first makes recovery choose the new pair?

<details><summary>Find the after-images</summary><p>An after-image is the complete new page value. Write-ahead means the recovery information reaches durable storage before dependent page changes.</p></details>
<details><summary>Check what the marker covers</summary><p>The marker is useful only if recovery can trust that the records it commits are complete and durable first.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The repair changes the crash outcome at the durable commit marker. Before that point disk remains at the old transfer; afterward replay yields 70 and 130. This is a redo-only teaching protocol, not ARIES. It assumes atomic page writes and marker recognition. Real systems need torn-write handling, log validation, transaction identifiers and ordering guarantees.</p></div>

## Under the hood: buffers, ordering and group commit

A log append first changes a memory buffer. A durable flush advances a monotonic log position. The write-ahead rule requires the log to cover a dirty page's changes before that page can reach durable storage. A commit record identifies which complete operation recovery must preserve; it is not a requirement to write every modified data page immediately.

With group commit, several transactions can append separate commit records and wait for one flush through the highest needed LSN. Each transaction retains its own commit decision and may be acknowledged only once its required record is durable. Sharing a flush batches the persistence cost; it does not merge application transactions into one atomic unit. Asynchronous acknowledgement changes the durability contract and must be stated explicitly.

The next [recovery-engine lab](./recovery-engine.html) replaces abstract log booleans with actual BEGIN/UPDATE/COMMIT records, before/after images, pageLSNs and a checkpoint. Inspect its arrays and redo decisions to explain exactly how the smaller protocol here is generalized.

## Transfer the idea

Design a batch containing two transfers. Decide whether the commit unit is each transfer or the whole batch. Draw the log records and commit markers and describe recovery after every marker. Identify how group commit could share flush cost without sharing application atomicity.

**Success criteria:** locate the durable commit marker and record old/new recovery outcomes on both sides; distinguish log flush, page flush and acknowledgement; state the page/marker atomicity assumptions and keep group commit separate from transaction atomicity.

**Primary reference:** [PostgreSQL write-ahead log](https://www.postgresql.org/docs/current/wal-intro.html).

[Run the native file and recovery exercises →](./native.html#local-files-and-recovery)
