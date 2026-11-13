# Crash during recovery.

Recovery writes the missing result, then fails before clearing its work list. The next recovery must not apply the effect twice.

**You will:** Choose a replay-safe representation and test repeated failure during recovery. **Prerequisites:** the WAL commit point. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

A committed increment of 20 has already been replayed into a balance of 100. The log survives. What happens if startup adds 20 again?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Run the increment baseline to its final step, then press Crash & recover here. Inspect replays and balance. Press it again to force another restart. The committed logical operation is one addition, regardless of how many times recovery executes.

## Change one thing

Select after-image. Run to the end and crash repeatedly. Change initial and amount, then repeat. Compare “add 20” with “set the committed page to 120.” Record the log identity and final result that would be needed to distinguish repeated replay from a genuinely new operation.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Idempotence means repeating this operation has the same effect as applying it once.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>An increment can also be replay-safe if an implementation tracks applied log positions atomically. Representation and deduplication are alternative tools, with different requirements.</p></details>
<details><summary>Worked explanation</summary><p>The baseline reaches 120 once, then 140 on repeated replay. An after-image of 120 remains 120. Actual databases often use page log sequence numbers and recovery rules rather than relying only on whole-page overwrites. The core requirement is repeatable recovery under the system’s failure model. Recovery itself is a failure-prone workload.</p></details>

## Transfer the idea

A ledger contains two legitimate deposits of the same amount. Explain why deduplicating by amount is incorrect. Choose a transaction or log-record identity and specify how the applied marker becomes atomic with the balance change.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL reliability and WAL](https://www.postgresql.org/docs/current/wal-reliability.html).

[Run the native file and recovery exercises →](./native.html#local-files-and-recovery)
