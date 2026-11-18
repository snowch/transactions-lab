# Replicate the decision log.

A coordinator's decision can survive its current leader only if the protocol preserves the record through replication and future elections. Trace the entries and votes that make that possible.

**You will:** inspect term/index pairs, implement election log comparison, trace AppendEntries prefix matching, and locate quorum commit before acknowledgement. **Prerequisites:** [consensus versus atomic commit](./consensus.html). **Runtime:** a three-node Raft-style log core with explicit send events.

A **term** is a numbered leadership period. An **index** is a log position. Together they identify an entry when a leader asks a follower to match a prefix.

<!-- concept: replication -->

## Predict

A writes COMMIT locally and replies before either follower has it. A becomes unreachable. Can B and C elect a leader whose log does not contain that decision? What must change before the original reply is justified?

## The state behind the replicas

Each node has a durable log and term/vote state. A log entry has an index, term and command. The leader tracks each follower's nextIndex and confirmed matchIndex. Its commitIndex identifies the prefix it may expose as committed.

Before appending a suffix, a follower checks that the preceding entry matches the leader's expected position and term. A mismatch rejects the request; the leader backs nextIndex up and sends a longer suffix. This is why the repaired scenario sends to C twice after the election: its first request assumes a prefix that C does not yet have.

Election voters grant at most one vote per term and require an up-to-date candidate log: compare the last entry's term first, then its index. A candidate with a longer log from an older term may still be less up to date. A majority election and these log rules help preserve committed history.

For this core, the leader advances commitIndex to N only when a majority has confirmed through N **and the entry at N is from the leader's current term**. Committing that current-term prefix also commits preceding entries. This restriction matters after an election; counting old-term copies alone is not the full rule.

## Control the experiment

The page loads **Baseline** with three empty replica logs and local acknowledgement. Select **Run to end**. In **Replica logs and protocol state**, compare A’s COMMIT with the new leader’s committed prefix. Did the decision survive the election?

<!-- experiment -->

Each replica has its own log lane. Entry labels distinguish locally stored entries from that node’s committed prefix; a down node keeps its stable log in the picture. Compare the lanes through the election and prefix-repair events.

Choose **Repair** and select **Run to end**. Revisit both **AppendEntries to C** steps. Compare **Response** and **Previous index**, then find COMMIT in the new leader’s committed prefix. Why does C accept the second request?

## Inspect and implement the election rule

Expand the source to inspect actual vote, replication and commit-index calculations. Select **Test implementation** in the bench. In **Your JavaScript implementation**, compare the final term first, then the final index if the terms match. Test again and compare the shorter newer-term candidate with the longer older-term candidate.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

In **Repair**, open **Edit the experiment**, remove `"replicate:B"` before `"ack"`, and select **Run to end**. Read the acknowledgement step and compare with **Repair**. Choose **missing-majority** and run again. Which step shows why a client reply is withheld?

Return to **Repair** and replace `schedule` with `["append:COMMIT","replicate:B","ack","crash:A","elect:C"]`. Select **Run to end** and inspect **Election votes**. Then append `"append:NOOP"` and run again. The input error explains why a leader-only operation cannot run. Remove that final entry and run to inspect the valid election history again.

<details><summary>Hint 1 · Separate local append from committed prefix</summary><p>An entry in one stable log has survived that node's process restart, but is not necessarily protected against replacement after a different majority elects a leader.</p></details>
<details><summary>Hint 2 · Order election candidates by term, then index</summary><p>Do not compare array lengths first. Terms identify leadership epochs; only when last terms tie does the last index break the tie.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>A local-only acknowledgement can name an entry absent from every available majority. The repair makes the entry quorum committed before replying, then preserves it through an up-to-date election and log-prefix repair. The explicit NOOP establishes a current-term committed prefix on the new leader. This lab implements a bounded log core, not all of Raft: no election timers, concurrent leaders, arbitrary delayed messages, membership changes or log snapshots are simulated.</p></div>

## Transfer the idea

Place the two-phase coordinator's PREPARE and COMMIT records in this replicated log. Explain why preserving a recorded decision does not supply a missing participant YES vote. Then identify the atomicity boundary between a committed log entry and each participant's local data changes. Consensus replication and atomic commit solve connected but different problems.

**Success criteria:** cite term/index pairs and actual votes; show withheld acknowledgement without a majority and the prefix-repair backtrack; pass the election comparison bench and separate committed coordinator history from participant commit.

**Primary source:** [Ongaro and Ousterhout, In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf), especially the log replication and leader completeness rules.
