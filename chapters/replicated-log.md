# Replicate the decision log.

A coordinator's decision can survive its current leader only if the protocol preserves the record through replication and future elections. Trace the entries and votes that make that possible.

**You will:** inspect term/index pairs, implement election log comparison, trace AppendEntries prefix matching, and locate quorum commit before acknowledgement. **Prerequisites:** two-phase commit and the consensus/commit distinction. **Runtime:** a three-node Raft-style log core with explicit send events.

## Predict

A writes COMMIT locally and replies before either follower has it. A becomes unreachable. Can B and C elect a leader whose log does not contain that decision? What must change before the original reply is justified?

## The state behind the replicas

Each node has a durable log and term/vote state. A log entry has an index, term and command. The leader tracks each follower's nextIndex and confirmed matchIndex. Its commitIndex identifies the prefix it may expose as committed.

Before appending a suffix, a follower checks that the preceding entry matches the leader's expected position and term. A mismatch rejects the request; the leader backs nextIndex up and sends a longer suffix. This is why the repaired scenario sends to C twice after the election: its first request assumes a prefix that C does not yet have.

Election voters grant at most one vote per term and require an up-to-date candidate log: compare the last entry's term first, then its index. A candidate with a longer log from an older term may still be less up to date. A majority election and these log rules help preserve committed history.

For this core, the leader advances commitIndex to N only when a majority has confirmed through N **and the entry at N is from the leader's current term**. Committing that current-term prefix also commits preceding entries. This restriction matters after an election; counting old-term copies alone is not the full rule.

## Control the experiment

The baseline acknowledges a local-only COMMIT, then loses A. B and C can elect B without that uncommitted entry. B commits a NOOP in its new term, and the recovered prefix has no COMMIT. The acknowledgement was unjustified.

<!-- experiment -->

Each replica has its own log lane. Entry labels distinguish locally stored entries from that node’s committed prefix; a down node keeps its stable log in the picture. Compare the lanes through the election and prefix-repair events.

In Repair, A first replicates COMMIT to B and commits it through a majority. After A becomes unavailable, B wins an up-to-date election. C initially rejects the assumed prefix, so B backs up and sends COMMIT plus its current-term NOOP. The new majority commits the prefix; the original decision remains recoverable.

## Inspect and implement the election rule

Expand the source to inspect actual vote, replication and commit-index calculations. The bench asks you to implement the small log comparison used by election voters. It includes a shorter/newer-term candidate and a longer/older-term candidate so log length alone fails.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

Remove replicate:B before A's first ack. With the quorum policy the reply is withheld. Try missing-majority and explain the resulting progress limit. In the repaired schedule, replace elect:B with elect:C: B's more recent log should prevent C from winning that election, and subsequent leader-only operations must be rejected until a valid leader is elected.

<details><summary>Hint 1 · Separate local append from committed prefix</summary><p>An entry in one stable log has survived that node's process restart, but is not necessarily protected against replacement after a different majority elects a leader.</p></details>
<details><summary>Hint 2 · Order election candidates by term, then index</summary><p>Do not compare array lengths first. Terms identify leadership epochs; only when last terms tie does the last index break the tie.</p></details>
<details><summary>Worked explanation</summary><p>A local-only acknowledgement can name an entry absent from every available majority. The repair makes the entry quorum committed before replying, then preserves it through an up-to-date election and log-prefix repair. The explicit NOOP establishes a current-term committed prefix on the new leader. This lab implements a bounded log core, not all of Raft: no election timers, concurrent leaders, arbitrary delayed messages, membership changes or log snapshots are simulated.</p></details>

## Transfer the idea

Place the two-phase coordinator's PREPARE and COMMIT records in this replicated log. Explain why preserving a recorded decision does not supply a missing participant YES vote. Then identify the atomicity boundary between a committed log entry and each participant's local data changes. Consensus replication and atomic commit solve connected but different problems.

**Primary source:** [Ongaro and Ousterhout, In Search of an Understandable Consensus Algorithm](https://raft.github.io/raft.pdf), especially the log replication and leader completeness rules.
