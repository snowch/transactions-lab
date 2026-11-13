# Separate agreement from commit.

Replicating a coordinator can make a recorded decision more available. It cannot turn a missing participant vote into permission to commit.

**You will:** Distinguish consensus over a decision log from atomic commit across resource owners. **Prerequisites:** [two-phase commit](./two-phase.html). **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

A **quorum** is the required replica set for this exercise: a strict majority, `floor(replicas / 2) + 1`. Replica agreement concerns the decision log; participant YES/NO votes concern whether the resource owners can commit. The illustrated replication protocol is implemented in the next lab; this widget tests only the arithmetic and decision distinction.

<!-- concept: replication -->

## Predict before running

With five coordinator replicas and three reachable, predict quorum and progress when a participant vote is missing. Then hold all votes YES and compare reachable = 2 with reachable = 3. Which single change affects agreement availability, and which affects commit validity?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Run the one-replica baseline. Inspect reachable and quorum. Select Repair: two replicas and all YES votes permit a durable commit decision in this simplified model. The lab models the reasoning boundary, not a working consensus protocol.

## Change one thing

Repair changes both reachable and decision. For a controlled availability comparison, start with replicas = 3 and decision = "commit" (all participant YES votes), varying only reachable from 1 to 2. Next hold reachable = 2 and vary only decision from commit to unknown: quorum availability cannot resolve a missing participant vote. Try no-vote to make ABORT available too. Test the five-replica predictions with decision held fixed while reachability changes.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Ask two questions separately: what may the participants decide, and how is that decision made durable and discoverable?</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A minority read is not automatically authoritative. A real consensus system has election, term, log and read rules that this arithmetic exercise does not implement.</p></details>
<details><summary>Worked explanation</summary><p>With three replicas, a majority requires two. Replication reduces exposure to some coordinator failures under protocol assumptions, but a partition can prevent progress. Commit validity still depends on the participants and the commit protocol. Consensus, atomic commit, serializability and linearizability describe different properties; none is a synonym for the others.</p></details>

## Under the hood: a majority is part of a protocol

The arithmetic exercise above identifies quorum size, but quorum counting alone is not a consensus implementation. Replicas need term/ballot state, durable entries, election rules and a rule for choosing a committed prefix. Future leaders must preserve that prefix despite partially replicated, uncommitted suffixes.

The [next implementation lab](./replicated-log.html) exposes log index/term pairs, vote persistence, up-to-date checks, AppendEntries prefix rejection, nextIndex backtracking and current-term majority commit. You will implement the election comparison and trace the exact records retained through failover. These mechanisms explain why a reply after a local append can be lost from the authoritative history even though the node's own disk retained it.

## Transfer the idea

Compare two independent databases coordinated by an application with one replicated database spanning shards. Draw the resource owners and decision log. Identify where atomic commit and replication are needed and which failure prevents each from progressing.

**Success criteria:** compute the majority for five replicas; vary reachability while holding participant votes fixed, then vary votes with quorum fixed; explain why neither a minority nor a missing participant vote authorizes COMMIT.

**Primary reference:** [Gray and Lamport: Consensus on Transaction Commit](https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/).
