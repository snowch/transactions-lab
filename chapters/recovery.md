# Crash during recovery.

Recovery writes the missing result, then fails before clearing its work list. The next recovery must not apply the effect twice.

**You will:** choose a replay-safe representation and test repeated failure during recovery. **Prerequisites:** [pageLSNs, redo and undo](./recovery-engine.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

<!-- concept: recovery -->

## Predict before running

Use initial = 80 and amount = 5, instead of the worked example’s 100 and 20. Predict balances after the first replay and two further restarts for increment and after-image. Would testing amount = 0 expose the defect? Test your changed fixture after reproducing the baseline.

## Control the experiment

The page loads **Baseline** with `initial` set to `100`, `amount` set to `20`, and an increment record. Select **Run to end**. Record `balance`, `target` and `replays` before you restart.

<!-- experiment -->

## Inspect the evidence

Run the increment baseline to its final step, then press Crash & recover here. Inspect replays and balance. Press it again to force another restart. The committed logical operation is one addition, regardless of how many times recovery executes.

## Change one thing

Choose **Repair** and select **Run to end**. Select **Crash & recover here** twice. Compare `balance` and `replays` with **Baseline**.

To test your prediction, return to **Baseline**, open **Edit the experiment**, and set `initial` to `80` and `amount` to `5`. Select **Run to end**, record `balance`, then select **Crash & recover here** twice and record it after each restart. Repeat those same edits and actions with **Repair**. In **Baseline**, change only `amount` to `0`, run and restart again. Why is the result uninformative about repeated nonzero increments?

<details><summary>Define idempotent replay</summary><p>Idempotence means repeating this operation has the same effect as applying it once.</p></details>
<details><summary>Track applied records by identity</summary><p>An increment can also be replay-safe if an implementation tracks applied log positions atomically. Representation and deduplication are alternative tools, with different requirements.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The baseline reaches 120 once, then 140 on repeated replay. An after-image of 120 remains 120. Actual databases often use page log sequence numbers and recovery rules rather than relying only on whole-page overwrites. The core requirement is repeatable recovery under the system’s failure model. Recovery itself is a failure-prone workload.</p></div>

## Under the hood: replay progress is data too

A redo record has an ordered identity such as an LSN. A pageLSN records the newest change already installed on that page, letting recovery skip a record at or below that position. That prevents applying the same physical effect repeatedly even when startup scans its record again.

Undo is a different problem: it reverses unfinished work. ARIES uses compensation log records (CLRs) to record completed undo steps and an undoNextLSN to resume progress after another crash. CLRs are redoable descriptions of undo progress, not ordinary updates to undo recursively. This chapter's repeated-after-image example and the [one-writer log engine](./recovery-engine.html) introduce the requirement without claiming to implement full ARIES.

Do not discard a log prefix simply because a checkpoint exists: dirty-page redo and unfinished-transaction undo can depend on earlier records. Describe both retention dependencies in the design record.

## Optional advanced continuation

[A1 · ARIES recovery](./aries.html) implements redo-only compensation log records and undoNextLSN chains across repeated crashes, with multiple interleaved transactions. Take it after this foundation when you want to extend the recovery machinery.

## Transfer the idea

A ledger contains two legitimate deposits of the same amount. Explain why deduplicating by amount is incorrect. Choose a transaction or log-record identity and specify how the applied marker becomes atomic with the balance change.

**Success criteria:** compare at least two successive restarts under both representations; verify the independent target value rather than replay count; identify legitimate duplicate amounts and make the applied marker atomic with its effect.

**Primary reference:** [PostgreSQL reliability and WAL](https://www.postgresql.org/docs/current/wal-reliability.html).

[Run the native file and recovery exercises →](./native.html#local-files-and-recovery)
