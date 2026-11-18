# Build a deadlock.

A holds the bicycle. B holds the helmet. Each needs the other item before it can finish.

**You will:** construct a wait-for cycle, distinguish blocking from deadlock, and remove the cycle through consistent acquisition order. **Prerequisites:** [lock compatibility and queues](./lock-manager.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

<!-- concept: locks -->

## Predict before running

If A acquires bike then helmet and B acquires helmet then bike, can either complete? Would a longer timeout solve the cycle?

## Control the experiment

The page loads **Baseline** with opposite resource orders. Select **Step** through **A waits for helmet, owned by B** and then **B waits for bike, owned by A**. Watch the second wait close the cycle in the graph.

<!-- experiment -->

Follow the directed wait-for arrows. One blocked request adds an edge; opposite resource acquisition closes a cycle. Ownership labels below the graph show the resources creating the wait.

## Inspect the evidence

Step through the ownership and waiting maps. An edge A → B means A needs a resource held by B. A single wait is ordinary contention; the two-edge cycle is a deadlock. The red check concerns progress, not evidence of a corrupt committed row.

## Change one thing

Choose **Repair** and select **Run to end**. Revisit **B waits for bike, owned by A** and **A commits and releases both locks** in the trace. What prevents the one-way wait from becoming a cycle? Compare `waiting`, `committed` and the model check with **Baseline**.

<details><summary>Follow the two wait edges</summary><p>Write down every held lock before writing down the next requested lock.</p></details>
<details><summary>Release the victim’s locks</summary><p>A timeout limits waiting. It does not establish why the wait occurred or prove that a whole workflow has been rolled back.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>Opposite acquisition order produces A waiting for B and B waiting for A. Consistent order prevents this cycle in the two-resource model. A real PostgreSQL server detects deadlocks and aborts a transaction; applications must handle that error. The model does not pick a victim or measure detector delay.</p></div>

## Under the hood: from ownership to a wait edge

The lock manager looks up a resource, checks compatibility against other owners, and either grants a request or queues it. Blocking is represented by dependencies on conflicting owners and, depending on queue policy, earlier incompatible requests. A deadlock detector traverses that graph and selects an abort victim from a cycle; abort must release ownership and allow eligible queued requests to wake.

The [lock-manager implementation](./lock-manager.html) exposes S/X compatibility, shared-to-exclusive upgrades, FIFO queues and DFS cycle detection. These S/X modes are teaching primitives. PostgreSQL has several table and tuple lock modes; a relation lock called RowExclusiveLock is compatible with another ordinary row-updating transaction's relation lock. Its name does not mean one writer owns every row exclusively. Use the actual blocker observations in the server worksheet rather than reading the mode name as a full explanation.

## Transfer the idea

Add a third resource, a coupon. Give checkout and cancellation one common resource order. Explain whether row IDs, table order, advisory locks or a single owner record make that order enforceable in your design. Reproduce the two-resource cycle on the real server.

**Success criteria:** derive the wait-for cycle from named resources; reproduce one-way waiting with consistent order; separate a progress failure from corrupt data and specify how the application handles a deadlock abort.

**Primary reference:** [PostgreSQL deadlocks](https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS).

[Take this investigation to independent PostgreSQL sessions →](./native.html#shared-postgresql)
