# Validate a transaction.

Optimistic concurrency lets a transaction do tentative work before deciding whether its observations are still usable. Implement that decision from recorded versions.

**You will:** build read/write sets, compare observed and current versions, and explain why write-conflict checking alone permits write skew. **Prerequisites:** snapshots and the doctor-roster invariant. **Runtime:** an executable optimistic concurrency control (OCC) engine over two keys.

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

Inspect each transaction's snapshot, read versions and staged writes. The baseline commits T1 and T2 because their write sets are disjoint. The roster has no doctor left. The repaired validator rejects T2 because its recorded A version differs from the current A version after T1's publication.

<!-- experiment -->

The diagram separates recorded read versions and private writes, then shows the exact tested-versus-current comparison from the most recent validation event. It does not judge an already committed read against unrelated future changes.

## Read and implement the validator

The predicate below is the one the engine invokes. The surrounding engine determines which versions are supplied and makes checking plus publication one event; a correct predicate cannot compensate for an incomplete read set or an unsafe publication boundary.

<!-- mechanism-source -->

<!-- implementation -->

## Change one thing

Move T2:begin and its reads to after T1:commit, then remove T2's leaving write because the new decision must keep the last doctor. Verify the fresh read set validates. For a stale-read experiment, keep its old write and explain why a transaction engine still cannot choose the right business operation for the programmer.

<details><summary>Hint 1 · Compare the actual version maps</summary><p>After T1 commits, A has a new version. T2's write-set-only test includes B but omits the stale observation of A.</p></details>
<details><summary>Hint 2 · Missing keys conflict too</summary><p>If a previously read key disappeared, its current version cannot equal the recorded version. An empty read set is valid, but that does not prove the transaction recorded everything it depended on.</p></details>
<details><summary>Worked explanation</summary><p>The baseline validates B@0 while A has changed, so the two decisions can both commit. The repair compares A@0 with A@1 and aborts T2 before publishing its private write. This is an OCC implementation with sequential commit validation. PostgreSQL Serializable Snapshot Isolation uses a different mechanism: nonblocking predicate-read tracking and read/write dependency detection. Both must reason about observations, but they are not the same algorithm.</p></details>

## Transfer the idea

A request reads “all bookings overlapping this time interval.” Another transaction inserts a new overlapping row whose key was never read. Explain why validating only existing key versions misses this phantom. Add a range/predicate generation number to your proposed read set, and specify every insertion/deletion that must change it. Compare that design with predicate locking and PostgreSQL's SIREAD dependency tracking.

**Primary sources:** [Kung and Robinson, On Optimistic Methods for Concurrency Control](https://dl.acm.org/doi/10.1145/319566.319567) and [PostgreSQL Serializable isolation](https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE).
