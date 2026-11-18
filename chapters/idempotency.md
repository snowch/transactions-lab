# Did it commit?

The server commits the charge. The response disappears. The client knows the outcome is unknown, not that the charge failed.

**You will:** recover an ambiguous outcome with stable request identity and bind that identity to the original payload and result. **Prerequisites:** [outbox recovery boundaries](./outbox.html) and [retries](./retries.html). **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

An **idempotency key** identifies one logical request across attempts. **Payload binding** associates that key with the original request data, such as the amount to charge.

<!-- concept: idempotency -->

## Predict before running

Reuse one key but change its amount from 30 to 40. Predict charges, storedAmount and response under checked and unchecked binding. Can a one-charge check pass while the API silently returns a result for the wrong payload?

## Control the experiment

The page loads **Baseline** with a new key on retry and a lost response. Select **Step** through the first charge and retry. Read `charges`, `attempts` and `response` separately.

<!-- experiment -->

## Inspect the evidence

Step through the charge commit and lost response. The baseline retries with a fresh key and creates a second charge. The repaired scenario reuses request-1 and returns the stored result. Count charges separately from attempts.

## Change one thing

Choose **Repair** and select **Run to end**. Compare `charges`, `attempts` and `response` with **Baseline**. Choose **conflict** and run again. Open **Edit the experiment**, change `binding` from `"checked"` to `"unchecked"`, and select **Run to end**. Compare `charges`, `storedAmount` and `response` with **conflict**. Which model check can fail even when there is just one charge?

<details><summary>Distinguish request and attempt keys</summary><p>A new random key on each attempt identifies attempts, not one logical request.</p></details>
<details><summary>Store the effect and result together</summary><p>The key, original parameters, effect and result must share an appropriate atomic protocol. An in-memory cache updated after charging leaves another crash gap.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>A stable identity lets the server distinguish a repeated request from a new one. Recording the result atomically with the effect makes the lost response recoverable. This model assumes that atomic record exists; a real payment API has a specific contract for in-progress requests, errors and expiry. A timeout is an observation about communication, not proof of rollback.</p></div>

## Under the hood: the request/result record is transactional state

A durable idempotency table typically binds an authenticated request scope and key to a payload fingerprint, operation state and stored result. A unique-key arbitration path must coordinate simultaneous insertions; an in-flight second request may wait, receive an explicit pending result or be rejected according to the API contract.

The business effect and its key/result record need one atomic protocol. Storing a cache entry after charging creates a crash gap. In a local database the [transaction manager](./transaction-manager.html) and [recovery engine](./recovery-engine.html) can publish and preserve both rows together. With an external payment provider, that provider's actual idempotency/reconciliation contract supplies the corresponding boundary.

Retention and lookup are part of correctness. Expiring the key while retries are still permitted can turn an old request into a new effect, even if every individual insert was atomic.

## Transfer the idea

A mobile client retries tomorrow after its key has expired. Define the guarantee you can still offer. Compare looking up an order by a durable business identifier with relying only on a short-lived idempotency cache.

**Success criteria:** count charges separately from attempts; compare checked and unchecked payload binding with the same key; identify the stored result and specify authenticated scope, retention and concurrent-duplicate behavior.

**Primary reference:** [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests).
