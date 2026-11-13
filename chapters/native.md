# Take the boundary to a real system.

Use the browser to control the failure story, then test the corresponding behavior against real file operations or independent PostgreSQL sessions.

## Run and change the mechanism engines

The source displayed in the implementation labs is executable JavaScript, not a separate illustrative listing. From the repository, invoke the pure engine directly:

```sh
node --input-type=module -e "import {mvcc, mechanismDefinitions} from './web/mechanisms.js'; console.log(JSON.stringify(mvcc(mechanismDefinitions.mvcc.presets.repaired), null, 2));"
```

Download your function from an implementation bench and run its named cases locally:

```sh
node web/verify-implementation.mjs mvcc ./mvcc-implementation.mjs
```

Downloads for a standalone folder: [mechanisms.js](./downloads/mechanisms.js), [benchmarks.js](./downloads/benchmarks.js), and [verify-implementation.mjs](./downloads/verify-implementation.mjs). Keep all three together; then run `node verify-implementation.mjs mvcc ./mvcc-implementation.mjs`. Implementations are self-contained exported functions; imports/closures inside a submitted function are outside this bench contract. The local checker runs your code directly, so use the browser worker if you want its bounded execution controls.

Change the engine itself for a larger project: add a second MVCC snapshot, a new lock mode, predicate validation or a compensation log record. State the new transition and failure rules, then add tests that independently check the resulting history. Inspect the original test suites as examples of boundary and invariant checks, rather than copying their expected outcomes blindly.

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

Open three terminals against the same service. Follow the session A, B and observer schedules in [the server worksheet](./downloads/server/README.md). Copy each statement in order, leaving the specified transaction open. The worksheet includes a conditional reservation, write skew versus Serializable, and a deadlock repair. Reset fixtures between experiments.

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

Try `--protocol rename-only` and each crash point: `after-write`, `after-file-sync`, `after-rename`, `after-dir-sync`. A point absent from the selected protocol is not reached; the output reports that no injected exit occurred. Change the script to use an in-place write and explain what another reader could observe. A process exit does not remove OS caches: seeing new after a crash is not evidence that fsync was unnecessary.

The journal exercise persists a committed record, replays it, simulates a recovery interruption before clearing the record and replays on a new startup. Compare repeated increment with after-image replay. Inspect actual JSON files through the code; the invariant is the final balance, not just a successful exit status.

Downloads: [file replacement](./downloads/native/files.py) · [journal recovery](./downloads/native/journal.py) · [native checks](./downloads/native/test_native.py).

## Bring the result back

Record the command, platform, protocol, injected boundary and observed data in your design record. Name the stronger fault model you have not tested. For storage durability, a credible power-loss experiment needs a controlled storage/VM fault setup and verification of its write-cache and flush semantics; an ordinary process kill is insufficient.
