# Lose the coordinator.

Both participants vote yes. One learns commit. The other only sees a timeout. Make a safe decision without pretending the timeout is evidence of abort.

**You will:** trace prepare and commit records, explain two-phase commit blocking, and recover a known decision. **Prerequisites:** [durable decisions](./wal.html) and [recovery](./recovery-engine.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

**Two-phase commit (2PC)** first collects durable participant promises, then records and distributes one final decision. **Prepared** means the participant can honor that later decision after restart; it has not yet learned a final outcome.

<!-- concept: twoPhase -->

## Predict before running

If A has committed while B is prepared, may B abort just because the coordinator is unreachable? What can B actually infer from the timeout?

## Control the experiment

The page loads **Baseline** with two participants and a coordinator that becomes unreachable. Select **Step** through both PREPARED records, the durable COMMIT and A’s receipt of the decision. Compare `durableDecision` with what B has learned.

<!-- experiment -->

The diagram separates the coordinator’s durable global decision from the decision each participant has actually received. A prepared B remains labelled as holding resources while its decision-delivery edge is pending.

## Inspect the evidence

Step through durable prepare, the coordinator’s durable COMMIT, A’s notification and the lost connection to B. Prepared means B has promised it can commit later and must retain recoverable state; it is not a commit visible to the application.

## Change one thing

Select **Run to end** in **Baseline**. Compare `A`, `B` and the agreement check. Choose **Repair** and run again. Do the participants disagree, or is B still `prepared` with resources held? Compare `progress`. Choose **recovered** and run again. Which saved decision allows B to finish? Explain the difference between preserving agreement and finishing the work.

<details><summary>Compare two histories behind a timeout</summary><p>An unreachable coordinator could have crashed before or after recording the decision. B’s timeout cannot distinguish those histories.</p></details>
<details><summary>Check the prepared promise</summary><p>After a durable YES vote, unilateral timeout abort is unsafe without another protocol rule that establishes the global outcome.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>Two-phase commit first obtains durable promises, then communicates one durable decision. The waiting repair preserves atomic agreement while blocking B. Recovery of the existing COMMIT lets B finish. Durable participant state, decision retention, coordinator recovery and operational handling of prepared work belong in the design. Atomic commit alone does not specify all isolation between transactions.</p></div>

## Under the hood: promises must reach stable storage first

PREPARE is a local recovery boundary. A participant flushes enough state to finish later before sending YES; its prepared record and held resources survive the uncertainty window. The coordinator flushes one decision before notifying participants. A participant can then install that decision, record completion and release resources according to its local protocol.

The trace exposes each participant's stable log, coordinator records, messages and resource retention. Coordinator restart reads its durable COMMIT; it does not invent a decision from elapsed time. The panel is a global observer's view: B cannot directly inspect an unreachable coordinator's log merely because you can see it in the model.

<!-- mechanism-source -->

A real system also needs transaction identities, participant lists, duplicate-message handling and a policy for forgetting resolved state. The [replicated-log engine](./replicated-log.html) shows how a recorded decision can survive a leader failure. It does not make an unprepared participant's YES vote appear.

## Transfer the idea

Change the history so B votes NO before the decision. Specify the coordinator’s outcome and what A must retain while waiting. Then describe what happens if the coordinator loses its durable storage rather than merely restarting.

**Success criteria:** cite PREPARED and the durable coordinator decision; show that waiting preserves agreement while B retains resources; distinguish blocked completion from an unsafe timeout abort and explain authoritative resolution.

**Primary reference:** [PostgreSQL PREPARE TRANSACTION](https://www.postgresql.org/docs/current/sql-prepare-transaction.html).
