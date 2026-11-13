# Lose the coordinator.

Both participants vote yes. One learns commit. The other only sees a timeout. Make a safe decision without pretending the timeout is evidence of abort.

**You will:** Trace prepare and commit records, explain two-phase commit blocking, and recover a known decision. **Prerequisites:** durable logging and recovery. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

If A has committed while B is prepared, may B abort just because the coordinator is unreachable? What can B actually infer from the timeout?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

The diagram separates the coordinator’s durable global decision from the decision each participant has actually received. A prepared B remains labelled as holding resources while its decision-delivery edge is pending.

## Inspect the evidence

Step through durable prepare, the coordinator’s durable COMMIT, A’s notification and the lost connection to B. Prepared means B has promised it can commit later and must retain recoverable state; it is not a commit visible to the application.

## Change one thing

The baseline lets B guess abort and exposes conflicting terminal decisions. Run the waiting repair and inspect progress: safety passes, but completion is blocked. Select recovered to restore the coordinator’s durable decision and finish B. Compare safety and liveness explicitly in your record.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>An unreachable coordinator could have crashed before or after recording the decision. B’s timeout cannot distinguish those histories.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>After a durable YES vote, unilateral timeout abort is unsafe without another protocol rule that establishes the global outcome.</p></details>
<details><summary>Worked explanation</summary><p>Two-phase commit first obtains durable promises, then communicates one durable decision. The waiting repair preserves atomic agreement while blocking B. Recovery of the existing COMMIT lets B finish. Durable participant state, decision retention, coordinator recovery and operational handling of prepared work belong in the design. Atomic commit alone does not specify all isolation between transactions.</p></details>

## Under the hood: promises must reach stable storage first

PREPARE is a local recovery boundary. A participant flushes enough state to finish later before sending YES; its prepared record and held resources survive the uncertainty window. The coordinator flushes one decision before notifying participants. A participant can then install that decision, record completion and release resources according to its local protocol.

The trace exposes each participant's stable log, coordinator records, messages and resource retention. Coordinator restart reads its durable COMMIT; it does not invent a decision from elapsed time. The panel is a global observer's view: B cannot directly inspect an unreachable coordinator's log merely because you can see it in the model.

<!-- mechanism-source -->

A real system also needs transaction identities, participant lists, duplicate-message handling and a policy for forgetting resolved state. The [replicated-log engine](./replicated-log.html) shows how a recorded decision can survive a leader failure. It does not make an unprepared participant's YES vote appear.

## Transfer the idea

Change the history so B votes NO before the decision. Specify the coordinator’s outcome and what A must retain while waiting. Then describe what happens if the coordinator loses its durable storage rather than merely restarting.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL PREPARE TRANSACTION](https://www.postgresql.org/docs/current/sql-prepare-transaction.html).
