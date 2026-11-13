# Find the commit point.

A transfer changes two pages. The machine can stop after either write. Give recovery enough durable information to choose one complete outcome.

**You will:** Trace write-ahead logging, identify a durable commit record, and recover every prefix of the write sequence. **Prerequisites:** atomicity and file persistence. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

Starting at Alice = 100 and Bob = 100, what survives a crash after Alice’s new page reaches disk but before Bob’s? Which information would let recovery finish safely?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

In the in-place baseline, step to Alice’s installation and crash. The disk contains 70 and 100: neither a complete old nor a complete new transfer. The recovered invariant check should fail. Running to the end without a crash hides this failure.

## Change one thing

Choose the WAL repair. Crash before log flush, after log flush, after the durable commit marker, and after each page install. Before the marker, uncommitted log records are ignored. After it, recovery installs both after-images, even if one or neither data page had reached its home.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>An after-image is the complete new page value. Write-ahead means the recovery information reaches durable storage before dependent page changes.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>The marker is useful only if recovery can trust that the records it commits are complete and durable first.</p></details>
<details><summary>Worked explanation</summary><p>The repair changes the crash outcome at the durable commit marker. Before that point disk remains at the old transfer; afterward replay yields 70 and 130. This is a redo-only teaching protocol, not ARIES. It assumes atomic page writes and marker recognition. Real systems need torn-write handling, log validation, transaction identifiers and ordering guarantees.</p></details>

## Transfer the idea

Design a batch containing two transfers. Decide whether the commit unit is each transfer or the whole batch. Draw the log records and commit markers and describe recovery after every marker. Identify how group commit could share flush cost without sharing application atomicity.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL write-ahead log](https://www.postgresql.org/docs/current/wal-intro.html).

[Run the native file and recovery exercises →](./native.html#local-files-and-recovery)
