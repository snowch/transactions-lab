# Independent PostgreSQL sessions

This is a disposable PostgreSQL 17 service. It publishes no network ports.
Its local-only password is not for application use. Docker Compose is required.
Run commands from the repository root. Downloaded files also work together in
one folder: substitute `-f compose.yml` below.

```sh
docker compose -f server/compose.yml up -d --wait
```

In **each of three terminals**, open psql:

```sh
docker compose -f server/compose.yml exec db psql -X -U postgres -d transactions
```

Call the terminals A, B and observer. `\set VERBOSITY verbose` includes SQLSTATE
in errors. All sessions connect to the same server and database.

## 1. Conditional reservation: one bicycle

Observer, once (reset only with no open competing transactions):

```sql
DROP SCHEMA IF EXISTS lab CASCADE;
CREATE SCHEMA lab;
CREATE TABLE lab.inventory(sku text PRIMARY KEY, stock int CHECK(stock>=0));
INSERT INTO lab.inventory VALUES ('bike',1),('helmet',1);
```

A:

```sql
BEGIN;
UPDATE lab.inventory SET stock=stock-1 WHERE sku='bike' AND stock>0 RETURNING stock;
```

B (leave waiting):

```sql
BEGIN;
SET LOCAL lock_timeout='60s';
UPDATE lab.inventory SET stock=stock-1 WHERE sku='bike' AND stock>0 RETURNING stock;
```

Observer:

```sql
SELECT pid,state,wait_event_type,pg_blocking_pids(pid) AS blockers,query
FROM pg_stat_activity WHERE datname='transactions' AND pid<>pg_backend_pid();
```

A: `COMMIT;`. B's statement now returns no row because it rechecks stock.
B: `COMMIT;`. Observer: `SELECT * FROM lab.inventory;`.
The bike stock is 0, not -1. A waiting timeout would leave B's transaction failed;
use `ROLLBACK;` before rerunning. This worksheet's two updates do not insert
reservation records; the browser CTE exercise adds that local atomic boundary.

## 2. Write skew and Serializable

Observer:

```sql
CREATE TABLE lab.on_call(name text PRIMARY KEY, available boolean);
INSERT INTO lab.on_call VALUES ('A',true),('B',true);
```

A, then B, before either writes:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT count(*) FROM lab.on_call WHERE available;
```

Both see 2. A:

```sql
UPDATE lab.on_call SET available=false WHERE name='A';
COMMIT;
```

B:

```sql
UPDATE lab.on_call SET available=false WHERE name='B';
COMMIT;
```

Observer: `SELECT * FROM lab.on_call;`. Both left, breaking the invariant.
Reset using `UPDATE lab.on_call SET available=true;`. Repeat both reads using
`BEGIN ISOLATION LEVEL SERIALIZABLE;`. Commit A's change first, then attempt B's.
B should receive SQLSTATE 40001 under this controlled schedule. An abort can
occur at a different statement in other schedules. B: `ROLLBACK;` then retry the
whole decision:

```sql
BEGIN ISOLATION LEVEL SERIALIZABLE;
UPDATE lab.on_call SET available=false
WHERE name='B' AND (SELECT count(*) FROM lab.on_call WHERE available)>1;
COMMIT;
```

One doctor remains. Explain why blindly repeating the old UPDATE is insufficient.

## 3. Deadlock and consistent ordering

A:

```sql
BEGIN;
UPDATE lab.inventory SET stock=stock WHERE sku='bike';
```

B:

```sql
BEGIN;
UPDATE lab.inventory SET stock=stock WHERE sku='helmet';
```

A, leave waiting:

```sql
UPDATE lab.inventory SET stock=stock WHERE sku='helmet';
```

B:

```sql
UPDATE lab.inventory SET stock=stock WHERE sku='bike';
```

PostgreSQL aborts one transaction with SQLSTATE 40P01. Roll it back and commit
the other. Do not grade which participant is the victim. Repair both paths to
acquire bike, then helmet. B may wait for A, but the cycle is absent in this schedule.

## 4. Inspect tuple versions and the snapshot boundary

Observer, once:

```sql
CREATE TABLE lab.versions(id integer PRIMARY KEY,value integer);
INSERT INTO lab.versions VALUES (1,100);
```

A:

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT pg_current_snapshot()::text, id,value,xmin::text,xmax::text
FROM lab.versions;
```

B:

```sql
UPDATE lab.versions SET value=70 WHERE id=1;
SELECT id,value,xmin::text,xmax::text FROM lab.versions;
```

A: repeat its SELECT. It still reads value 100 using its pinned snapshot, while
B sees 70 with a different creator xmin. A's visible old tuple may carry a
superseding xmax without becoming invisible to this older snapshot. Finish A
with COMMIT; a new statement can now see 70. Do not grade exact XID values.
`pg_current_snapshot()` formats xmin:xmax:active-IDs; the tuple's xmax has a
different meaning and in PostgreSQL can also encode locks/MultiXacts. The browser
MVCC engine omits those extra physical details. SQL SELECT enumerates logical
visible rows, not all heap versions.

Compare the three actual observations with the MVCC lab's creator/deleter
predicate and status table. Explain the version-retention obligation while A
remains open. The automated harness verifies the value and creator change plus
snapshot stability on this real server.

## Verify and stop

`npm run test:server` runs these schedules automatically in a separately named
Compose project, checks actual outcomes, and removes that project's service.
The tests bound waits and inspect real lock waiting before advancing the owner.
For your manual project:

```sh
docker compose -f server/compose.yml down -v
```

The last command discards the lab's data. No power-loss or performance claim is made.
