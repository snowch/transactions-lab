# Build the lock manager.

“Take a lock” becomes concrete when you implement the compatibility check, queue the blocked request, construct its dependencies and decide which transaction to abort.

**You will:** trace shared/exclusive compatibility and upgrades, build a wait-for graph, and implement cycle detection. **Prerequisites:** [transaction lifetime](./transaction-manager.html) and JavaScript sets; directed-graph traversal is introduced here. **Runtime:** an executable lock table and request queues.

<!-- concept: locks -->

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

The page loads **Baseline** with two shared requests, two upgrades and a cycle check. Select **Step** through both upgrades. Compare **Granted owners**, **Waiting requests** and the arrows in the wait-for graph. Which request closes the cycle?

<!-- experiment -->

The wait-for drawing uses directed arrows from each waiting transaction to its blockers. Step through both upgrades and the detector: the cycle appears before the victim aborts, then disappears when its ownership and queued request are removed.

Choose **Repair** and select **Run to end**. The detector chooses the younger transaction to abort. Check **Granted owners** and **Waiting requests**. Which transaction can now acquire X, and why?

## The detector algorithm

Depth-first search keeps a recursion-stack set and a completed set. Encountering a node already on the current recursion stack proves a directed cycle. Encountering an already completed node does not: two branches can share the same downstream owner without deadlocking. Select **Test implementation** and inspect the diamond case. In **Your JavaScript implementation**, track the nodes on the current search path separately from completed nodes. Test again and compare the diamond with a real cycle.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

In **Repair**, open **Edit the experiment** and set `schedule` to `["A:X:bike", "B:S:bike", "A:commit", "B:commit"]`. Select **Run to end**, then revisit **B requests S on bike: queued** and **A commits**. Compare the owners and queue before and after release. Run `["A:S:bike", "A:X:bike"]` next. Why can one owner upgrade without waiting? Finally run `["A:X:bike", "B:S:bike", "B:X:bike"]` and read the input error for an operation from a blocked transaction.

<details><summary>Hint 1 · Build dependencies from actual blockers</summary><p>For each queued request, identify conflicting holders and earlier incompatible queued requests. A long wait alone is not a cycle.</p></details>
<details><summary>Hint 2 · Use two traversal sets</summary><p>The active DFS stack and the fully explored set have different meanings. Mark a node finished only after exploring its outgoing edges.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The upgrade cycle exists because each transaction holds a shared lock that prevents the other's exclusive request. Aborting B releases its S lock and removes its queued X request, allowing A to upgrade. A production abort must also undo B's data changes, cancel its waits and preserve recovery correctness. This lock-table engine models ownership and scheduling; the transaction manager and recovery engine explain the other responsibilities.</p></div>

## Transfer the idea

Design three transactions holding x, y and z respectively, each requesting the next resource in a cycle. Derive the graph and test your downloaded detector with it. Remove one request and explain why the remaining shared downstream dependency is not itself a cycle. The browser ownership engine has two clients; the detector function accepts a larger graph.

**Optional extension:** propose intention locks for a table/row hierarchy, or a fairness rule preventing new readers from starving a queued writer. Specify the extra compatibility and queue dependencies before extending the engine.

**Success criteria:** derive the upgrade cycle from conflicting holders and queued requests; show release and wakeup after victim abort; pass the detector bench including shared downstream nodes; distinguish cycle detection from timeout.

**Primary sources:** [PostgreSQL locking and deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html) and [SQLite locking protocol](https://sqlite.org/lockingv3.html).
