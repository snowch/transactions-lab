# Validate a transaction.

Optimistic concurrency lets a transaction do tentative work before deciding whether its observations are still usable. Implement that decision from recorded versions.

**You will:** build read/write sets, compare observed and current versions, and explain why write-conflict checking alone permits write skew. **Prerequisites:** [write-skew dependencies](./write-skew.html) and JavaScript maps. **Runtime:** an executable optimistic concurrency control (OCC) engine over two keys.

<!-- concept: validation -->

## Predict

T1 reads A and B and writes A. T2 reads A and B and writes B. If validation checks only the rows each transaction writes, which invalidated observations are missed?

## Read, validate, publish

The store keeps `{value, version}` per key. At begin, a transaction obtains a snapshot. Reads record observed versions; writes remain in a private map. Commit performs validation and publication in one ordered engine event:

```text
read phase:      remember key → observed version; stage key → new value
validation:     compare dependencies with the current committed store
publication:    if valid, assign a commit version and install the write set
abort:          if invalid, discard the private write set
```

Atomic validate-and-publish matters. Two threads that both validate, then publish later without synchronization can both validate against the same old state. A real implementation needs a critical section, compare-and-swap protocol or equivalent serialization of this boundary.

**Write-set validation** checks whether another transaction overwrote a row this attempt plans to change. **Read-set validation** also checks observations that influenced its decision, including rows it did not change. This small engine conservatively validates every recorded read and every write base version.

## Control the experiment

The page loads **Baseline** with A and B available and two decisions made from the same version. Select **Run to end** and inspect both statuses in **Recorded dependencies** and both values in **Committed version store**. Choose **Repair** and run again. Which tested version differs from the current version when T2 tries to commit?

<!-- experiment -->

The diagram separates recorded read versions and private writes, then shows the exact tested-versus-current comparison from the most recent validation event. It does not judge an already committed read against unrelated future changes.

## Read and implement the validator

The surrounding engine supplies the versions and makes checking and publication one event. In the bench, select **Test implementation**. Compare the result for a stale read of a key the transaction does not write. In **Your JavaScript implementation**, return true only when every entry in `readVersions` matches `currentVersions`. A missing current key conflicts. Test again. The engine checks write base versions separately.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

In **Repair**, open **Edit the experiment**. Replace `schedule` with `["T1:begin","T1:read:A","T1:read:B","T1:write:A:false","T1:commit","T2:begin","T2:read:A","T2:read:B","T2:commit"]`. Select **Run to end**. Find T2’s read version of A and its final status.

Insert `"T2:write:B:false"` before `"T2:commit"` and run again. Does T2 validate against fresh versions while still breaking the roster rule? Explain which decision belongs to the application.

<details><summary>Hint 1 · Compare the actual version maps</summary><p>After T1 commits, A has a new version. T2's write-set-only test includes B but omits the stale observation of A.</p></details>
<details><summary>Hint 2 · Missing keys conflict too</summary><p>If a previously read key disappeared, its current version cannot equal the recorded version. An empty read set is valid, but that does not prove the transaction recorded everything it depended on.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>The baseline validates B@0 while A has changed, so the two decisions can both commit. The repair compares A@0 with A@1 and aborts T2 before publishing its private write. This is an OCC implementation with sequential commit validation. PostgreSQL Serializable Snapshot Isolation uses a different mechanism: nonblocking predicate-read tracking and read/write dependency detection. Both must reason about observations, but they are not the same algorithm.</p></div>

## Transfer the idea

A request reads “all bookings overlapping this time interval.” Another transaction inserts a new overlapping row whose key was never read. Explain why validating only existing key versions misses this phantom. Add a range/predicate generation number to your proposed read set, and specify every insertion/deletion that must change it. Compare that design with predicate locking and PostgreSQL's SIREAD dependency tracking.

**Success criteria:** show T2’s observed A version and the current A version at validation; abort before publishing stale private writes; pass the validator bench; identify a phantom that finite key versions cannot detect.

**Primary sources:** [Kung and Robinson, On Optimistic Methods for Concurrency Control](https://dl.acm.org/doi/10.1145/319566.319567) and [PostgreSQL Serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE).
