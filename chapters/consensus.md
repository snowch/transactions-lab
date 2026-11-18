# Separate agreement from commit.

Replicating a coordinator can make a recorded decision more available. It cannot turn a missing participant vote into permission to commit.

**You will:** distinguish consensus over a decision log from atomic commit across resource owners. **Prerequisites:** [two-phase commit](./two-phase.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

A **quorum** is the required replica set for this exercise: a strict majority, `floor(replicas / 2) + 1`. Replica agreement concerns the decision log; participant YES/NO votes concern whether the resource owners can commit. The illustrated replication protocol is implemented in the next lab; this widget tests only the arithmetic and decision distinction.

<!-- concept: replication -->

## Predict before running

With five coordinator replicas and three reachable, predict quorum and progress when a participant vote is missing. Then hold all votes YES and compare reachable = 2 with reachable = 3. Which single change affects agreement availability, and which affects commit validity?

## Control the experiment

The page loads **Baseline** with three coordinator replicas, one reachable, and a missing participant vote. Select **Run to end** and find `reachable`, `quorum`, `participantVote` and `progress`.

<!-- experiment -->

## Inspect the evidence

The baseline cannot retrieve a decision. Choose **Repair** and select **Run to end**. Find the new `decision`. The preset changes both reachability and participant votes, so this comparison alone cannot establish which difference caused the result.

## Change one thing

Choose **Repair** and open **Edit the experiment**. With `replicas` at `3` and `decision` at `"commit"`, set `reachable` to `1` and select **Run to end**. Set only `reachable` to `2` and run again. Compare `quorum`, `progress` and `decision`.

Keep `reachable` at `2` and change `decision` to `"unknown"`. Run again. What does quorum establish with a missing `participantVote`? Select **no-vote** and run to see a reachable quorum return ABORT. For the five-replica prediction, set `replicas` to `5` and `decision` to `"commit"`, then run at `reachable` values `2` and `3`. At `reachable` `3`, change `decision` to `"unknown"` and run once more.

<details><summary>Separate votes from replica access</summary><p>Ask two questions separately: what may the participants decide, and how is that decision made durable and discoverable?</p></details>
<details><summary>Check what a minority can establish</summary><p>A minority read is not automatically authoritative. A real consensus system has election, term, log and read rules that this arithmetic exercise does not implement.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>With three replicas, a majority requires two. Replication reduces exposure to some coordinator failures under protocol assumptions, but a partition can prevent progress. Commit validity still depends on the participants and the commit protocol. Consensus, atomic commit, serializability and linearizability describe different properties; none is a synonym for the others.</p></div>

## Under the hood: a majority is part of a protocol

The arithmetic exercise above identifies quorum size, but quorum counting alone is not a consensus implementation. Replicas need term/ballot state, durable entries, election rules and a rule for choosing a committed prefix. Future leaders must preserve that prefix despite partially replicated, uncommitted suffixes.

The [next implementation lab](./replicated-log.html) exposes log index/term pairs, vote persistence, up-to-date checks, AppendEntries prefix rejection, nextIndex backtracking and current-term majority commit. You will implement the election comparison and trace the exact records retained through failover. These mechanisms explain why a reply after a local append can be lost from the authoritative history even though the node's own disk retained it.

## Transfer the idea

Compare two independent databases coordinated by an application with one replicated database spanning shards. Draw the resource owners and decision log. Identify where atomic commit and replication are needed and which failure prevents each from progressing.

**Success criteria:** compute the majority for five replicas; vary reachability while holding participant votes fixed, then vary votes with quorum fixed; explain why neither a minority nor a missing participant vote authorizes COMMIT.

**Primary reference:** [Gray and Lamport: Consensus on Transaction Commit](https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/).
