# Break a rule with snapshots.

Each doctor sees someone else on call. Both leave. Every row update succeeds, and the combined result breaks the roster.

**You will:** Distinguish a stable snapshot from serializability and identify a cross-row read/write dependency. **Prerequisites:** lost updates and transaction boundaries. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

A and B both read two available doctors, then update different rows. Will avoiding a same-row write conflict preserve “at least one doctor stays”?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

The initial roster has A and B. Step through both reads before either write. Each decision is locally reasonable. Check the roster after each commit and identify which earlier observation the other transaction invalidated.

## Change one thing

Run the repaired serializable scenario. One unsafe transaction aborts. Change the schedule to ["A.read", "A.write", "B.read", "B.write"]. Explain why this schedule can complete without the same abort. An abort is a signal to retry the decision, not permission to repeat an old decision.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>Draw an arrow from A’s read of B to B’s change, and another from B’s read of A to A’s change.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>A CHECK on one doctor row cannot generally enforce a rule across the whole roster. Protect the decision set, or serialize through an agreed invariant-owner row.</p></details>
<details><summary>Worked explanation</summary><p>The baseline snapshot preserves each local view while both doctors leave. The repaired model rejects the known unsafe dependency. It is deliberately smaller than PostgreSQL SSI, whose abort point can differ. Use independent PostgreSQL sessions in the server extension to reproduce real write skew and the serialization failure.</p></details>

## Transfer the idea

Design a rule requiring two staff with different certifications. Compare serializable transactions with an explicitly locked roster-owner row. State which writers must follow the protocol and what happens when new staff rows are inserted.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [PostgreSQL Serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE).

[Take this investigation to independent PostgreSQL sessions →](./native.html#shared-postgresql)
