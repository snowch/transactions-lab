# Retry the whole decision.

The database rejects an unsafe attempt. Your retry can still break the business rule if it reuses the observation that caused the attempt.

**You will:** Specify a full retry boundary, refresh decision inputs, and keep external effects safe across attempts. **Prerequisites:** [write skew](./write-skew.html) and [validation](./validation.html). **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

<!-- concept: retry -->

## Predict before running

A first observes two doctors at version 0; B leaves and advances the version. For each retry policy, predict A’s observed value, expectedVersion and final roster. Is incrementing attempts and opening a new transaction sufficient if those decision inputs remain unchanged?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Trace the observation, competing commit and validation failure. In the baseline, A abandons the failed transaction but keeps the stale application decision. Watch the final onCall value. The repaired run rereads after the conflict and decides to stay.

## Change one thing

Compare the observation and attempt count in both scenarios. Sketch a retry loop that catches retryable failures, rolls back, waits with bounded jitter, starts a fresh transaction and reruns all decision reads. Include a maximum retry budget; indefinite retries are not a liveness guarantee.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>List the values computed before the failed UPDATE. Which of them depended on a snapshot that is no longer valid?</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A retry callback must not send an email or initiate a new payment on each attempt unless that effect has its own stable identity and recovery strategy.</p></details>
<details><summary>Worked explanation</summary><p>A serialization failure protects the aborted attempt. It cannot repair a stale decision retained in application memory. The repaired transaction reevaluates the business predicate with fresh state. Retry the complete decision and all its local writes, while classifying errors: sold out, a unique-key conflict and a transient serialization failure do not necessarily mean the same thing.</p></details>

## Under the hood: validation fails before publication

An optimistic engine records dependencies while executing. At commit it compares them with current versions, discards an invalid attempt's private writes and reports a conflict. A serializable database may instead detect a dangerous dependency structure during execution or commit. In either case, the application decision made from invalidated observations must be recomputed.

The [validation engine](./validation.html) shows the read set, private writes, current versions and the exact failed comparison. Its check-and-publish boundary is one ordered event. The retry loop belongs above that engine: it creates a new descriptor, takes fresh observations and rebuilds the decision. An external effect requires its own durable identity because discarding a local write set cannot discard a separate service's committed operation.

## Transfer the idea

A transfer service calculates a currency quote before opening the transaction. Decide whether a retry can reuse it, whether it has an expiry, and which account/limit checks must be repeated. Specify what the client sees when retries are exhausted.

**Success criteria:** show which observed value and version change on a whole-decision retry; retain at least one doctor; place external effects outside an unsafe repeat loop and specify retry exhaustion behavior.

**Primary reference:** [PostgreSQL serialization failure handling](https://www.postgresql.org/docs/current/mvcc-serialization-failure-handling.html).
