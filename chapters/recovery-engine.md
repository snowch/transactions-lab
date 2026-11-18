# Build log recovery.

A buffer pool can write an uncommitted page before commit and leave a committed page unwritten after commit. Recovery needs enough durable history to handle both.

**You will:** trace before/after log records, dirty-page recLSNs, pageLSNs, a checkpoint and analysis/redo/undo. **Prerequisites:** [WAL ordering and commit](./wal.html). **Runtime:** an executable single-writer log and page engine, not a production storage manager.

A **winner** has a durable COMMIT. A **loser** has unfinished work that recovery must undo. A **checkpoint** records metadata about active transactions and modified pages so restart can recover its work list.

<!-- concept: recovery -->

## Predict

Choose the loser scenario on paper: Alice’s logged debit reaches disk, then a checkpoint records T1 as active, with no COMMIT. Is T1 a winner after restart? Predict whether its pre-checkpoint UPDATE remains necessary and which value undo restores. Contrast a durable COMMIT whose Bob page is still old.

## Why both redo and undo exist

The **buffer pool** caches data pages. A dirty page contains changes not fully installed in its disk image. **Steal** permits flushing a page containing an uncommitted change, making undo necessary. **No-force** permits acknowledging a committed transaction without forcing all its data pages, making redo necessary. A no-steal design can avoid this kind of loser-page undo; a force design pays more data-page writes at commit.

The model exposes these structures:

| Structure | What it records |
| --- | --- |
| UPDATE log record | LSN, transaction ID, previous transaction LSN, page, before-image, after-image |
| Buffered page | value, latest pageLSN, first still-dirty recLSN |
| Disk page | persisted value and pageLSN |
| flushedLSN | end of the durable log prefix |
| Transaction descriptor | active/committed status and lastLSN |
| Checkpoint snapshot | transaction metadata and dirty-page table; data pages need not all be forced |

A **log sequence number (LSN)** orders log records. WAL requires `flushedLSN >= page.pageLSN` before that dirty page reaches disk. Durable COMMIT requires flushing its record and the preceding records. It does not require forcing all data pages. Here checkpoint metadata is captured atomically between operations; it does not implement a production fuzzy-checkpoint merge while transactions continue.

## Control the experiment

The page loads **Baseline** with two balances of 100 and write-ahead ordering disabled. Select **Run to end** to reveal the schedule, then select **Flush alice without enforcing write-ahead ordering** and **Crash & recover here**. Compare Alice’s disk value with the durable log. Which evidence is missing for undo?

<!-- experiment -->

The log strip distinguishes durable records from buffered records. Below it, buffer and disk pages display their actual pageLSNs. An unsafe disk page is marked when it gets ahead of the durable log. These are logical record positions, not measured I/O time or byte widths.

Choose **Repair** and select **Run to end**. Revisit **Flush alice only after flushing its WAL dependency**, then select **Crash & recover here**. Find T1 under **Losers** and Alice’s restored value under **Undo decisions**. Select the final **Flush COMMIT** step and crash again. Which transaction is now a winner, and which page needed redo?

## Restart in three phases

1. **Analysis:** inspect the durable checkpoint and subsequent log to reconstruct committed winners, unfinished losers and a conservative dirty-page table.
2. **Redo:** start at the earliest required dirty-page recLSN. For each UPDATE, apply it only if the disk pageLSN is below the record's LSN. Equal means already applied.
3. **Undo:** for this one-writer engine, traverse a loser's UPDATE records backward and restore before-images. Commit winners must not be undone.

This implementation retains the whole log and uses a simple undo pass. It is **not ARIES**: there are no compensation log records (CLRs), undoNextLSNs, concurrent writers or interrupted-undo protocol. ARIES logs undo progress so recovery itself can be interrupted safely without simply redoing arbitrary work. Do not infer full ARIES correctness from this smaller engine.

<!-- mechanism-source -->

## Implement the redo guard

Select **Test implementation** and inspect the equality case. In **Your JavaScript implementation**, return true only when `pageLSN < recordLSN`. Test again. Compare that rule with the **Redo decisions** from a repair where a page has already been installed.

<!-- implementation -->

## Change one thing

Choose **loser**, select **Run to end**, then **Crash & recover here**. In **Recovery analysis** and **Undo decisions**, check whether the checkpoint committed T1 or retained an earlier UPDATE needed for undo.

Choose **Repair** and open **Edit the experiment**. Delete `"checkpoint"` from `schedule`, select **Run to end**, then **Crash & recover here**. Compare **Redo start** with a repaired run that keeps the checkpoint. Restore the scenario, append `"flush:bob"` after `"commit"`, run and crash again. Is Bob’s UPDATE applied or skipped under **Redo decisions**?

Restore the scenario again. Replace `"update:alice:-30"` with `"update:alice:-15", "update:alice:-15"`. Run to end to reveal the steps and inspect the `prevLSN` chain in **Log records**. Crash at the Alice flush before COMMIT, then at the final COMMIT. Compare the order of restored values and the final **Disk value** for each page.

<details><summary>Hint 1 · Separate durable facts from buffered intentions</summary><p>Crash discards the log suffix after flushedLSN and every volatile frame. Recovery can use only the retained log and disk images, plus acknowledged outcomes held by the outside observer.</p></details>
<details><summary>Hint 2 · A checkpoint is not a commit or automatic log truncation</summary><p>An active transaction can have records before the checkpoint that undo still needs. A dirty page can have an older recLSN that redo still needs. The checkpoint records those dependencies rather than erasing them.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>Enforcing WAL makes an uncommitted page flush recoverable because its before-image survives first. No-force commit is recoverable because after-images and COMMIT survive even when a data page does not. The pageLSN guard skips durable work already installed. A checkpoint can shorten reconstruction without making all earlier log records disposable. The transfer verifier is independent of the engine's completion status.</p></div>

## Optional advanced continuation

[A1 · ARIES recovery](./aries.html) implements redo-only compensation log records and undoNextLSN chains across repeated crashes, with multiple interleaved transactions. Take it after this foundation when you want to extend the recovery machinery.

## Transfer the idea

Design a log-retention decision with a dirty Bob page and an active T1 whose earlier Alice update may need undo. Identify the oldest records each dependency still needs, then explain why neither a checkpoint nor flushing one page alone makes the whole earlier prefix disposable. State when both dependencies would be discharged. This is a design task; the browser engine retains its whole log.

**Optional advanced extension:** continue to A1 to add compensation log records and restartable undo. CLR design is outside the core completion criteria.

**Success criteria:** classify a checkpointed active transaction as a loser; cite an actual applied/skipped LSN and an undo before-image; pass the redo guard bench; justify retaining pre-checkpoint log records without requiring the optional ARIES protocol.

**Primary sources:** [PostgreSQL WAL](https://www.postgresql.org/docs/current/wal-intro.html), [checkpoints](https://www.postgresql.org/docs/current/wal-configuration.html) and [Mohan et al., ARIES](https://dl.acm.org/doi/10.1145/128765.128770).
