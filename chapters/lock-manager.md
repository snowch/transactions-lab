# Build the lock manager.

“Take a lock” becomes concrete when you implement the compatibility check, queue the blocked request, construct its dependencies and decide which transaction to abort.

**You will:** trace shared/exclusive compatibility and upgrades, build a wait-for graph, and implement cycle detection. **Prerequisites:** transaction lifetime and directed graphs; the graph traversal is introduced below. **Runtime:** an executable lock table and request queues.

## Predict

A and B both hold shared locks on bike. Each now requests an exclusive lock on the same key. Does owning a shared lock give either permission to upgrade immediately?

## Compatibility before policy

A **shared lock (S)** permits another shared owner; an **exclusive lock (X)** conflicts with every other owner's S or X. A requester's existing ownership does not conflict with itself. Upgrading S to X still requires all *other* owners to stop holding conflicting locks.

| Held by another transaction | Request S | Request X |
| --- | --- | --- |
| S | grant if queue policy permits | wait |
| X | wait | wait |

A lock-table entry contains holders and a FIFO request queue. A blocked transaction stops issuing operations. Releasing an owner's locks lets the manager reconsider the queue head and grant eligible requests. The engine retains all granted locks until commit or abort, a conservative **rigorous two-phase locking** discipline. Strict 2PL retains exclusive locks until transaction end while also following the two-phase acquisition rule; implementations vary in how long they retain shared locks.

## Control the experiment

Both shared requests are granted. Each upgrade is queued because the other transaction still owns S. The manager derives A → B and B → A from those actual requests. The baseline detector reports the cycle but takes no action.

<!-- experiment -->

The wait-for drawing uses directed arrows from each waiting transaction to its blockers. Step through both upgrades and the detector: the cycle appears before the victim aborts, then disappears when its ownership and queued request are removed.

Repair chooses the youngest participant in a detected cycle, aborts it, removes its queued and held locks, and wakes the surviving upgrade. Observe the resulting X owner and the emptied queue. Victim choice affects wasted work and fairness; it does not change the definition of a cycle.

## The detector algorithm

Depth-first search keeps a recursion-stack set and a completed set. Encountering a node already on the current recursion stack proves a directed cycle. Encountering an already completed node does not: two branches can share the same downstream owner without deadlocking. The diamond case in the bench catches that common mistake.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

Use `["A:X:bike", "B:S:bike", "A:commit", "B:commit"]`. B waits, A releases, and B's queued request is granted. There is no cycle. Try an upgrade with only one shared owner and explain why it can be granted without waiting. Attempt another operation from a waiting transaction; the engine rejects that impossible schedule.

<details><summary>Hint 1 · Build dependencies from actual blockers</summary><p>For each queued request, identify conflicting holders and earlier incompatible queued requests. A long wait alone is not a cycle.</p></details>
<details><summary>Hint 2 · Use two traversal sets</summary><p>The active DFS stack and the fully explored set have different meanings. Mark a node finished only after exploring its outgoing edges.</p></details>
<details><summary>Worked explanation</summary><p>The upgrade cycle exists because each transaction holds a shared lock that prevents the other's exclusive request. Aborting B releases its S lock and removes its queued X request, allowing A to upgrade. A production abort must also undo B's data changes, cancel its waits and preserve recovery correctness. This lock-table engine models ownership and scheduling; the transaction manager and recovery engine explain the other responsibilities.</p></details>

## Transfer the idea

Add intention locks for a table/row hierarchy. State why a table S request must notice row writers without inspecting every row lock individually. Then propose a fairness rule that prevents an endless stream of new readers from starving a queued writer, and explain the queue dependencies it adds to the detector.

**Primary sources:** [PostgreSQL locking and deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html) and [SQLite locking protocol](https://sqlite.org/lockingv3.html).
