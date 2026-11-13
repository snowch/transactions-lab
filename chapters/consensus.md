# Separate agreement from commit.

Replicating a coordinator can make a recorded decision more available. It cannot turn a missing participant vote into permission to commit.

**You will:** Distinguish consensus over a decision log from atomic commit across resource owners. **Prerequisites:** two-phase commit. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

Three coordinator replicas have a quorum of two. If only one is reachable, can this model establish an authoritative decision? If two are reachable but a participant vote is missing, does the quorum supply that vote?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Run the one-replica baseline. Inspect reachable and quorum. Select Repair: two replicas and all YES votes permit a durable commit decision in this simplified model. The lab models the reasoning boundary, not a working consensus protocol.

## Change one thing

Keep reachable = 2 but set decision = "unknown". Observe that quorum availability does not resolve the missing participant vote. Try no-vote: replication can make ABORT available too. Change replicas to 5 and predict the smallest reachable set that meets the majority requirement.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Ask two questions separately: what may the participants decide, and how is that decision made durable and discoverable?</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A minority read is not automatically authoritative. A real consensus system has election, term, log and read rules that this arithmetic exercise does not implement.</p></details>
<details><summary>Worked explanation</summary><p>With three replicas, a majority requires two. Replication reduces exposure to some coordinator failures under protocol assumptions, but a partition can prevent progress. Commit validity still depends on the participants and the commit protocol. Consensus, atomic commit, serializability and linearizability describe different properties; none is a synonym for the others.</p></details>

## Transfer the idea

Compare two independent databases coordinated by an application with one replicated database spanning shards. Draw the resource owners and decision log. Identify where atomic commit and replication are needed and which failure prevents each from progressing.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [Gray and Lamport: Consensus on Transaction Commit](https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/).
