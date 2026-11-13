# Know what ran.

An experiment is useful when its boundary is as clear as its result. This course combines three different kinds of evidence.

## Real SQL in your browser

SQL cells execute genuine PostgreSQL through [PGlite](https://pglite.dev/), compiled to WebAssembly. They do not invent query output. The runtime is self-hosted with the built site and starts in a Web Worker. Each SQL page gets one private in-memory database and one connection, seeded with accounts, inventory, reservations, orders and an outbox.

Editors on one page share that database. Navigation or reset starts fresh. Restore SQL changes the editor text, not database state. An SQL error triggers rollback of an open transaction in this lab. Edits and run output are not automatically preserved after navigation; download SQL or the complete notebook first. Statements stop after a 30-second limit by terminating the worker; reset then starts fresh.

Separate PGlite instances have separate databases. They are not competing clients of one shared database. The browser SQL proves statement and transaction behavior for that runtime; independent snapshots, contention, server recovery and replication need a server exercise. Browser commit is not a power-loss durability claim.

## Controlled models

Concurrency, storage and distributed-protocol widgets execute explicit JavaScript transitions. Their inputs, traces, checks and state are inspectable and exportable. Each widget identifies its assumptions. They are not measurements of a live database, disk, payment API, consensus group or broker.

Step reveals a transition, Run to end exposes the whole schedule, and clicking a revealed trace entry revisits that state. Crash & recover discards the modeled volatile state at the selected point. Repeating recovery in the replay lab deliberately tests a second recovery failure. Original trace and recovery results are separate parts of the export.

A green check means the named predicate holds at that state. It does not prove correctness over all inputs. Pending means that a postcondition is not yet due or recovery has not been evaluated. A failed deadlock check concerns liveness, whereas a failed inventory check concerns safety.

## Executable internals and implementation benches

Six mechanism engines expose transaction publication, tuple-version visibility, lock tables/queues, optimistic version validation, buffer/log recovery and a replicated log core. State tables and raw snapshots come from the same executable functions. Source disclosures are generated directly from those functions; complete modules are downloadable. The snapshot write-skew model now derives read/write edges and runs an actual cycle check; it does not implement PostgreSQL's SSI dangerous-structure detection.

Implementation benches run your JavaScript function in a separate Worker against named input/output cases. You can inspect every failing input and compare a reference after trying. Stop terminates the worker; a two-second limit bounds a nonterminating attempt. Code edits invalidate prior results and save locally when storage permits. The step-through engine continues to use its published reference algorithm; the separate bench does not silently replace it. Download your implementation to change and test the full engine locally.

Notebook exports include current implementation source, the tested source, named-case results, status and build revision. Passing these finite cases is evidence, not a formal proof. The log recovery core has one writer and no ARIES CLRs; the Raft-style core has explicit synchronous send events and omits timers, membership changes and arbitrary concurrent-leader schedules. Each lab lists further limits beside its controls.

## Native and shared-server extensions

The downloadable Python exercises execute real file operations in a temporary directory. Fault injection exits a process at named protocol points. It tests program restart and recovery, not abrupt power loss, hardware caches, every file system or every torn-write pattern.

The Docker exercise uses independent connections to one PostgreSQL server. It tests conditional updates, snapshot write skew, serializable aborts, blocking, deadlocks and retries. It is a disposable local laboratory, with no public port. Review its README before running it.

## Notes and privacy

Model inputs and SQL execute on your device. The app has no hosted database, account system or analytics. Static hosting still serves requests normally. Design drafts use localStorage when available; storage restrictions are reported. Run evidence lives in memory until downloaded or the page closes. Download notebook + evidence includes current notes, SQL source and visible output, exported model runs and the current run. A self-review mark is not a test result.

## A vocabulary for the design record

| Term | Question it answers |
| --- | --- |
| Atomicity | Do this transaction's effects commit together or get abandoned together? |
| Invariant / ACID consistency | Which application rules must valid committed states preserve? A transaction can still implement the wrong business operation. |
| Isolation | Which interactions between concurrent transactions are permitted? |
| Snapshot | Which versions can this reader see? A stable snapshot alone does not prevent write skew. |
| Serializability | Are the results compatible with some serial execution of the transactions? That order need not follow wall-clock completion order. |
| Strict serializability | Is the serial order also compatible with real-time ordering of non-overlapping transactions? |
| Linearizability | Can each operation on an object appear to take effect at one instant between invocation and response? State the operation and object boundary. |
| Durability | Which acknowledged decisions survive which failures, on which storage stack? |
| Safety | Can an invalid state or conflicting final decision occur? |
| Liveness | Under which availability and scheduling assumptions does work eventually finish? |
| Atomic commit | Do the participants reach one commit/abort outcome? Isolation is an additional requirement. |
| Consensus | How do replicas agree on a value or ordered log under the protocol's fault assumptions? |

Define the required scope. A serializable database transaction does not automatically cover a separate payment call; a replicated log does not automatically preserve an application invariant.

## Sources and adaptation

The SQL worker, editor interaction, navigation and build pattern were adapted from [PostgreSQL Lab](https://github.com/snowch/postgresql-lab). Recovery and external-effect investigations draw on the teaching scenarios in [Event Streaming Lab](https://github.com/snowch/event-streaming-lab). The file-system progression follows [Systems From Scratch, chapter 22](https://snowch.github.io/computer-systems/the-file-system/). The new models and course connect these ideas through transaction design. Original material is copyright Christopher Snow; dependency licenses remain their own.

Primary technical references are linked in each investigation. Particularly useful starting points:

- [PostgreSQL transaction isolation](https://www.postgresql.org/docs/current/transaction-iso.html), [locking](https://www.postgresql.org/docs/current/explicit-locking.html) and [WAL](https://www.postgresql.org/docs/current/wal-intro.html).
- Linux [rename](https://man7.org/linux/man-pages/man2/rename.2.html) and [fsync](https://man7.org/linux/man-pages/man2/fsync.2.html).
- Gray and Lamport, [Consensus on Transaction Commit](https://www.microsoft.com/en-us/research/publication/consensus-on-transaction-commit/).
- Garcia-Molina and Salem, [Sagas](https://www.cs.cornell.edu/andru/cs711/2002fa/reading/sagas.pdf).
- [Kafka delivery semantics](https://kafka.apache.org/documentation/#semantics) and [Stripe's idempotency contract](https://docs.stripe.com/api/idempotent_requests).
