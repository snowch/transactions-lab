# ARIES: recover from a crash during undo.

**Optional advanced lab A1.** Recovery can fail after reversing a loser transaction's change but before finishing its rollback. Record the rollback itself so another restart can continue without reversing the same original update again.

**You will:** reconstruct transaction and dirty-page tables, repeat history, generate redo-only compensation log records, and follow undoNextLSN across repeated failures. **Prerequisites:** [Build log recovery](./recovery-engine.html), [Crash during recovery](./recovery.html), pageLSN/recLSN and per-transaction prevLSN chains. **Runtime:** an executable ARIES recovery core with controlled failures and an implementation bench.

<!-- concept: aries -->

## Predict

A loser increases B by 5. Recovery subtracts 5 and flushes that page, then crashes. Which durable record tells the next restart that this original increase has already been compensated? Why is the next record to undo sometimes different from the newest record's prevLSN?

## From the foundation to ARIES

The core recovery lab uses one writer and before-image undo. This optional lab adds interleaved transaction chains, multiple losers, compensation records and failures during rollback. **ARIES** stands for *Algorithm for Recovery and Isolation Exploiting Semantics*. Its central recovery sequence is analysis, repeat-history redo, then undo of unfinished work.

The model's pages A, B and C are independent counters starting at 100. T1 changes A by +10 and commits. T2 changes B by +20 and +5 but never commits. T3 changes C by +7 and never commits. Successful recovery must retain A = 110 and restore B = C = 100. Changes are interleaved in the log even though the transactions own different pages.

| LSN | Record | Transaction chain / meaning |
| --- | --- | --- |
| 1–3 | BEGIN T1, T2, T3 | Open independent transaction chains |
| 4 | UPDATE T1, A += 10 | prevLSN = 1 |
| 5 | UPDATE T2, B += 20 | prevLSN = 2 |
| 6 | UPDATE T3, C += 7 | prevLSN = 3 |
| 7 | CHECKPOINT | Transaction and dirty-page metadata; data pages remain dirty |
| 8 | UPDATE T2, B += 5 | prevLSN = 5 |
| 9 | COMMIT T1 | Durable winner; no END record yet |

The base scenario steals B's uncommitted page to disk after its log is durable. A's committed page can remain unwritten. Restart therefore has both redo and undo work.

## Three passes, with explicit state

**Analysis** starts at the durable checkpoint metadata and scans later records. It reconstructs the transaction table (status and lastLSN) and dirty-page table (recLSN). A durable COMMIT without END is finished with END. Running losers enter aborting state; their last log positions seed ToUndo.

**Redo repeats history**, including loser UPDATEs and existing CLRs. It is not “redo only the winners.” For a page record, use the dirty-page table, its recLSN and pageLSN to decide whether the action is missing. Reconstructing the logged history makes later undo operate on the state its records describe.

**Undo** selects the highest outstanding LSN across all losers. An original UPDATE is compensated by a new CLR. A CLR is redo-only: undo follows its undoNextLSN without compensating that CLR. Other chain records follow prevLSN. Completing a loser writes END and removes its undo frontier. Undo does not skip an original UPDATE merely because its pageLSN is already high: that can mean the update was installed and still needs rollback. The CLR skip pointer records completed compensation.

## Control the experiment

Run the baseline and inspect the two restart passes. The first pass compensates UPDATE 8 and flushes B = 120, then crashes. On restart the faulty pointer rule follows the CLR's prevLSN through ABORT back to UPDATE 8, subtracting 5 again. The final B = 95 is a concrete double-undo failure.

<!-- experiment -->

The drawing follows the recovery phase and the newest CLR. Its two arrows point to the actual prevLSN and undoNextLSN records; the faulty policy highlights the transaction-order path, while the repaired policy highlights the rollback skip path. The caption says whether that CLR is durable or still buffered.

Select Repair. The first CLR skips directly to the predecessor of the update it compensated. Inspect the log table's separate prevLSN, undoNextLSN and Compensates columns; The log view follows the latest records; scroll up for earlier history and horizontally for additional columns on a narrow screen. The check counts **durable** CLRs, since a buffered record can be lost without having published its recovery action.

## A CLR is a new forward log action

For the first compensation in this history:

```text
CLR 13:
  tx = T2
  prevLSN = 11          # T2's ABORT record: previous T2 record in log order
  compensates = 8      # the original UPDATE being reversed
  page = B, delta = -5 # redo description of the compensation
  undoNextLSN = 5      # UPDATE 8's predecessor: remaining original work
```

prevLSN preserves transaction log order. undoNextLSN preserves rollback progress. They answer different questions. Redo may apply CLR 13 to a page whose LSN is still 8; a page already at LSN 13 skips that application. Undo then follows 5, so it does not generate another durable compensation for UPDATE 8.

WAL applies to compensation too: the CLR must be durable before its changed page reaches disk. This lab conservatively forces each CLR before applying its buffered action so the failure points are easy to inspect. A production engine may batch log flushes while still enforcing WAL before the data-page flush.

<!-- mechanism-source -->

## Implement the undo-chain rule

Implement the pointer selection used during undo. The zero-pointer case matters: `undoNextLSN || prevLSN` would incorrectly revisit work when undoNextLSN is zero.

<!-- implementation -->

## Change the failure boundary

- **CLR durable, page missing:** select clr-durable-page-missing. Redo must apply the durable CLR before undo follows its skip pointer.
- **CLR not durable:** select clr-not-durable. Restart drops the volatile suffix and can generate the compensation again because that prior attempt was not made durable.
- **Undo page already durable:** the repaired default skips the CLR's page action during redo and skips the compensated UPDATE during undo.
- **Repeated failures:** select repeated-crashes. Track ToUndo across multiple restarts. Successful completion still has exactly one durable CLR for each original loser UPDATE.

You can also revisit any revealed trace entry and press Crash & recover here. That discards its volatile suffix and completes a restart from its actual durable log and disk pages. Download each run before changing the scenario.

<details><summary>Hint 1 · Draw both chains</summary><p>From CLR 13, prevLSN leads to ABORT 11 and then UPDATE 8. undoNextLSN leads to UPDATE 5. Only the second path represents work still needing rollback after UPDATE 8's compensation.</p></details>
<details><summary>Hint 2 · Redo the compensation, never undo the CLR</summary><p>If the CLR reached storage but its page did not, repeat its delta during redo using the pageLSN guard. The undo phase uses its pointer; it does not create a CLR to reverse that CLR.</p></details>
<details><summary>Worked explanation</summary><p>Analysis finishes T1 and identifies T2/T3 as losers. Redo restores missing committed and uncommitted history. Undo compensates original updates in highest-LSN order, recording each action and its next remaining predecessor. Across a failure, durable CLRs let redo reconstruct compensation already decided and let undo bypass the corresponding original update. The correct final values are A 110, B 100, C 100; the faulty prevLSN rule can instead double-undo B's final +5.</p></details>

## What this core simplifies

The checkpoint is one atomic metadata snapshot between model operations. Full ARIES fuzzy checkpoints use checkpoint records and merge transaction/dirty-page information while work continues. Pages here are fixed and owned by different transactions; there is no index structure, logical undo, nested top action, lock reacquisition, media recovery or log truncation. LSNs are logical record numbers. Whole record/page writes and stable log-prefix storage are assumed. The lab does implement CLRs and repeated restart; it is not a complete production ARIES engine or a claim that PostgreSQL implements this same recovery design.

## Transfer the idea

1. Propose how to merge a transaction-table snapshot from an END_CHECKPOINT without resurrecting a transaction whose END was seen during analysis. State how an older recLSN must be preserved.
2. Add a savepoint. Show which original updates partial rollback compensates, how later work links past that rollback, and what another crash must redo and skip.
3. Explain when earlier log records remain necessary for dirty-page redo or loser undo. A checkpoint by itself is not permission to truncate them.

**Success criteria:** explain one actual redo/skip decision, identify both CLR links, recover from each supplied interruption boundary, and support the bounded-compensation claim with the log records and independent final counter values.

**Primary sources:** [Mohan et al., ARIES (1992), especially rollback and restart processing](https://cs.uwaterloo.ca/~david/cs448/aries-mohan.pdf) and [Apache Derby's logging/recovery explanation and implementation differences](https://svn.apache.org/repos/infra/sites/db/content/derby/papers/recovery.html).
