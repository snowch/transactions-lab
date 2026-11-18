# Runtime and evidence

Find out which engine ran each exercise, what it prepared, and which evidence you can keep.

## Real SQL in your browser

Each SQL page prepares one private in-memory database and one PostgreSQL connection using [PGlite](https://pglite.dev/). The lab loads the database and SQL engine on your device. Run the numbered cells in order unless a lesson directs you to a specific cell.

All SQL cells on a page share that database. **Reset database** loads the sample data again and keeps the editor text. **Restore SQL** loads the original text in its own cell. **Recover edit** retrieves the previous text on that page. The activity message reports an SQL error and any automatic rollback of an open transaction. The previous successful output shows which execution produced it.

Navigation starts a fresh database. Select **Download SQL** to keep the editor text, or use **Download notebook + evidence** to keep the text and displayed results with their sources. A query that runs longer than 30 seconds stops the worker. Use **Reset database** to continue.

The browser setup demonstrates one database connection. For blocking and independent snapshots, use the shared PostgreSQL worksheet. The course uses models for replicated logs and several crash protocols.

## Controlled models

A model begins with the selected scenario’s prepared state. **Step** first shows that initial state, then advances one transition at a time. **Run to end** reveals every step. Select a trace entry to inspect its state. **Crash & recover here** uses the selected step’s durable state. In the repeated-recovery lab, pressing it again restarts from the previous recovery result.

The changed-settings notice compares current input with the original **Baseline**. To test one policy, set the other inputs to the same values for both runs. Scenario selection and **Restore scenario** load the full preset.

Under **Model checks at this step**, **Holds** means the displayed state meets the named rule. **Violated** identifies a state that breaks it. **Pending** marks a check whose outcome is not available at this step. These checks evaluate the model state. Use your own explanation and transfer answer to review your understanding.

## Executable internals and implementation benches

Concept figures explain an authored example. Live diagrams and tables show the selected step of the running model. Before a run, the live diagram may preview its initial state. Open **Inspect JSON or download run evidence** for the model input, revealed trace and recovery history.

The trace runs the published engine. **Test implementation** runs your function separately in a Worker against named inputs. Expand a case to compare `expected` and `actual`. A syntax or runtime error is reported separately from a case whose output differs. **Stop code** ends a running test; the worker also stops after two seconds. Edited code needs a fresh test.

**Restore starter** keeps a recoverable copy of your code when browser storage allows it. Use **Recover draft** to retrieve it. If storage blocks a save, the editor remains available; open **Download your code** for a separate copy.

Activity results apply to the supplied inputs and assumptions. Each model describes its limits beside the scenario. The recovery and replicated-log chapters explain where their teaching engines differ from production ARIES and Raft.

## Native and shared-server extensions

The downloadable Python exercises perform real file operations in temporary directories. The process exits at selected points and a new process inspects the result. This observes process restart with the OS still running.

The shared PostgreSQL worksheet uses independent connections to a disposable local server. It tests conditional updates, snapshots, blocking, deadlocks and retries. The service publishes no network ports.

## Notes and privacy

Model inputs and SQL execute on your device. The app has no hosted database, account system or analytics. Static hosting serves the site files. Browser storage keeps design drafts and bench code when permitted. Open **Download notes and evidence** to export current notes, case results, SQL source and output, and model runs. Saving the self-review mark records your own review.

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
