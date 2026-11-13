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

## Verify and stop

`npm run test:server` runs these schedules automatically in a separately named
Compose project, checks actual outcomes, and removes that project's service.
The tests bound waits and inspect real lock waiting before advancing the owner.
For your manual project:

```sh
docker compose -f server/compose.yml down -v
```

The last command discards the lab's data. No power-loss or performance claim is made.
