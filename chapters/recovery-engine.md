# Build log recovery.

A buffer pool can write an uncommitted page before commit and leave a committed page unwritten after commit. Recovery needs enough durable history to handle both.

**You will:** trace before/after log records, dirty-page recLSNs, pageLSNs, a checkpoint and analysis/redo/undo. **Prerequisites:** WAL ordering and the transfer invariant. **Runtime:** an executable single-writer log and page engine, not a production storage manager.

## Predict

Alice's uncommitted debit reaches its data page. Bob's credit exists only in memory. What must recovery do if the transaction never committed? What if its COMMIT record is durable but Bob's data page is still old?

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
| Fuzzy checkpoint | transaction metadata and dirty-page table; data pages need not all be forced |

A **log sequence number (LSN)** orders log records. WAL requires `flushedLSN >= page.pageLSN` before that dirty page reaches disk. Durable COMMIT requires flushing its record and the preceding records. It does not require forcing all data pages.

## Control the experiment

In the baseline, step to Flush alice and crash before the checkpoint. The disk contains an uncommitted debit with no durable undo record. Recovery has no information to repair it. Running the whole transfer first hides this failure.

<!-- experiment -->

Repair flushes Alice's log dependency before its page. Crash after that flush: recovery finds no COMMIT, classifies T1 as a loser and restores its before-image. Run to COMMIT and crash: recovery finds a winner, redoes the missing Bob page and preserves the transfer. The loser scenario checkpoints an active transaction; the checkpoint does not commit it.

## Restart in three phases

1. **Analysis:** inspect the durable checkpoint and subsequent log to reconstruct committed winners, unfinished losers and a conservative dirty-page table.
2. **Redo:** start at the earliest required dirty-page recLSN. For each UPDATE, apply it only if the disk pageLSN is below the record's LSN. Equal means already applied.
3. **Undo:** for this one-writer engine, traverse a loser's UPDATE records backward and restore before-images. Commit winners must not be undone.

This implementation retains the whole log and uses a simple undo pass. It is **not ARIES**: there are no compensation log records (CLRs), undoNextLSNs, concurrent writers or interrupted-undo protocol. ARIES logs undo progress so recovery itself can be interrupted safely without simply redoing arbitrary work. Do not infer full ARIES correctness from this smaller engine.

<!-- mechanism-source -->

## Implement the redo guard

The starter reapplies a record when pageLSN equals recordLSN. Correct that boundary and explain the idempotence it provides. Then read the engine's recovery trace and identify every skipped versus applied record.

<!-- implementation -->

## Change one thing

Remove checkpoint from the repaired schedule. Compare the dirty-page table and redo scan start. Add flush:bob after COMMIT and verify recovery skips the already installed page. Try multiple update:alice steps before the credit; inspect the transaction's prevLSN links and explain reverse-order undo. Keep the intended final transfer amounts consistent when editing deltas.

<details><summary>Hint 1 · Separate durable facts from buffered intentions</summary><p>Crash discards the log suffix after flushedLSN and every volatile frame. Recovery can use only the retained log and disk images, plus acknowledged outcomes held by the outside observer.</p></details>
<details><summary>Hint 2 · A checkpoint is not a commit or automatic log truncation</summary><p>An active transaction can have records before the checkpoint that undo still needs. A dirty page can have an older recLSN that redo still needs. The checkpoint records those dependencies rather than erasing them.</p></details>
<details><summary>Worked explanation</summary><p>Enforcing WAL makes an uncommitted page flush recoverable because its before-image survives first. No-force commit is recoverable because after-images and COMMIT survive even when a data page does not. The pageLSN guard skips durable work already installed. A checkpoint can shorten reconstruction without making all earlier log records disposable. The transfer verifier is independent of the engine's completion status.</p></details>

## Optional advanced continuation

[A1 · ARIES recovery](./aries.html) implements redo-only compensation log records and undoNextLSN chains across repeated crashes, with multiple interleaved transactions. Take it after this foundation when you want to extend the recovery machinery.

## Transfer the idea

Extend the log format with a CLR containing undoNextLSN. Draw a crash after undoing Alice but before finishing recovery. Identify which record prevents the next restart from undoing the same action incorrectly. Also specify the conditions under which a log prefix can be truncated safely.

**Primary sources:** [PostgreSQL WAL](https://www.postgresql.org/docs/current/wal-intro.html), [checkpoints](https://www.postgresql.org/docs/current/wal-configuration.html) and [Mohan et al., ARIES](https://dl.acm.org/doi/10.1145/128765.128770).
