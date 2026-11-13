# Did it commit?

The server commits the charge. The response disappears. The client knows the outcome is unknown, not that the charge failed.

**You will:** Recover an ambiguous outcome with stable request identity and bind that identity to the original payload and result. **Prerequisites:** retries and external effects. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

When a request times out, is it safe to generate a new payment key and try again? Which server-side state would make retry safe?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Step through the charge commit and lost response. The baseline retries with a fresh key and creates a second charge. The repaired scenario reuses request-1 and returns the stored result. Count charges separately from attempts.

## Change one thing

Try conflict. The same key is reused with a changed amount, and the checked binding rejects it. Edit binding to "unchecked" and observe the silent mismatch. Your design must specify an authenticated key scope, payload comparison, durable result, retention and concurrent-request handling.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>A new random key on each attempt identifies attempts, not one logical request.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>The key, original parameters, effect and result must share an appropriate atomic protocol. An in-memory cache updated after charging leaves another crash gap.</p></details>
<details><summary>Worked explanation</summary><p>A stable identity lets the server distinguish a repeated request from a new one. Recording the result atomically with the effect makes the lost response recoverable. This model assumes that atomic record exists; a real payment API has a specific contract for in-progress requests, errors and expiry. A timeout is an observation about communication, not proof of rollback.</p></details>

## Transfer the idea

A mobile client retries tomorrow after its key has expired. Define the guarantee you can still offer. Compare looking up an order by a durable business identifier with relying only on a short-lived idempotency cache.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [Stripe idempotent requests](https://docs.stripe.com/api/idempotent_requests).
