# Run against real systems

Use the browser to control the failure story, then test the corresponding behavior against real file operations or independent PostgreSQL sessions.

## Run and change the mechanism engines

With Node.js 24, open a terminal in the repository root. Run the command below to print the repaired MVCC trace as JSON. Compare the final `reads` values with the browser’s **Observed values**.

```sh
node --input-type=module -e "import {mvcc, mechanismDefinitions} from './web/mechanisms.js'; console.log(JSON.stringify(mvcc(mechanismDefinitions.mvcc.presets.repaired), null, 2));"
```

In the MVCC bench, open **Download your code** and select **Download implementation**. Save `mvcc-implementation.mjs` in the repository root, then run the named cases in your terminal.

```sh
node web/verify-implementation.mjs mvcc ./mvcc-implementation.mjs
```

Downloads for a standalone folder: [mechanisms.js](./downloads/mechanisms.js), [benchmarks.js](./downloads/benchmarks.js), and [verify-implementation.mjs](./downloads/verify-implementation.mjs). Keep all three together; then run `node verify-implementation.mjs mvcc ./mvcc-implementation.mjs`. Implementations are self-contained exported functions; imports/closures inside a submitted function are outside this bench contract. The local checker runs your code directly, so use the browser worker if you want its bounded execution controls.

Change the engine itself for a larger project: add a second MVCC snapshot, a new lock mode, predicate validation or a compensation log record. State the new transition and failure rules, then add tests that independently check the resulting history. Inspect the original test suites as examples of boundary and invariant checks, rather than copying their expected outcomes blindly.

For the optional ARIES pointer exercise, download your implementation and run `node web/verify-implementation.mjs aries ./aries-implementation.mjs`. The complete engine module also exports ariesRecovery and recoverAries for scripted restart experiments.

## Shared PostgreSQL

You need Docker with Compose, Node.js 24 and this repository. The server uses PostgreSQL 17 with no published ports. Its password is for this isolated disposable lab only. Use a unique Compose project if you run multiple checkouts.

```sh
git clone https://github.com/snowch/transactions-lab.git
cd transactions-lab
npm ci
npm run test:server
```

The executable harness starts the service, creates fixtures and independent psql connections, runs each controlled schedule, checks the semantic results and shuts the service down in a finally block. It reports PASS only after checking actual returned data or PostgreSQL errors. It uses no client-driver dependency.

To investigate manually:

```sh
docker compose -f server/compose.yml up -d --wait
docker compose -f server/compose.yml exec db psql -U postgres -d transactions
```

In three terminals, run the `docker compose … exec` command above against the same service. Name the terminals A, B and observer. Follow those schedules in [the server worksheet](./downloads/server/README.md). Copy each statement in order, leaving the specified transaction open. The worksheet includes a conditional reservation, write skew versus Serializable, and a deadlock repair. Reset fixtures between experiments.

Downloads: [Compose service](./downloads/server/compose.yml) · [interactive worksheet](./downloads/server/README.md) · [automated verification](./downloads/server/verify.mjs).

Stop the manual lab when finished:

```sh
docker compose -f server/compose.yml down -v
```

The `-v` discards this lab's data. These exercises establish behavior for one PostgreSQL version and schedule, not production capacity or server power-loss recovery.

## Local files and recovery

You need Python 3.12+ on Linux. From the repository:

```sh
python3 native/files.py --protocol durable --crash after-rename
python3 native/files.py --protocol durable
python3 native/journal.py --representation increment
python3 native/journal.py --representation after-image
python3 -m unittest discover -s native -p 'test_*.py'
```

The file experiment runs a child process that writes a temporary file, optionally fsyncs it, renames it, optionally fsyncs the directory and acknowledges completion. Fault injection stops the child at the named boundary. A new process reads the resulting file and prints observations. The parent uses a fresh temporary directory for every run.

Repeat the first file command with `--protocol rename-only`. Then repeat it for each protocol with `--crash after-write`, `--crash after-file-sync`, `--crash after-rename` and `--crash after-dir-sync`. Compare the injected exit status and the contents read by the new process. A protocol that omits a step will report that it did not reach that point. The OS can still retain buffered data after a process exits.

The journal commands save a committed record, replay it, then restart recovery before the record is cleared. Compare the last entry in `startup_balances` with `expected` for both representations. Which representation repeats the committed effect?

Downloads: [file replacement](./downloads/native/files.py) · [journal recovery](./downloads/native/journal.py) · [native checks](./downloads/native/test_native.py).

## Bring the result back

Record the command, platform, protocol, injected boundary and observed data in your design record. Name the stronger fault model you have not tested. For storage durability, a credible power-loss experiment needs a controlled storage/VM fault setup and verification of its write-cache and flush semantics; an ordinary process kill is insufficient.
