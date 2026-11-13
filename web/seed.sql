CREATE TABLE accounts (
  id text PRIMARY KEY,
  balance integer NOT NULL CHECK (balance >= 0)
);
INSERT INTO accounts VALUES ('alice', 100), ('bob', 100);
CREATE TABLE inventory (sku text PRIMARY KEY, stock integer NOT NULL CHECK (stock >= 0));
INSERT INTO inventory VALUES ('bike', 1), ('helmet', 3);
CREATE TABLE reservations (request_id text PRIMARY KEY, sku text NOT NULL REFERENCES inventory(sku));
CREATE TABLE orders (id text PRIMARY KEY, status text NOT NULL CHECK(status IN ('pending','paid','cancelled')));
CREATE TABLE outbox (event_id text PRIMARY KEY, order_id text NOT NULL REFERENCES orders(id), payload jsonb NOT NULL);
