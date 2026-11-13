# Defend your transaction.

A design is useful when another engineer can find its commit boundary, challenge its assumptions and reproduce the evidence behind it.

**You will:** produce a transaction design review supported by baseline, broken and repaired runs. **Prerequisites:** the order-service capstone. **Runtime:** your saved evidence and a local design notebook; no new protocol is simulated here.

## Start from a requirement

Design a bicycle checkout that reserves a bicycle and helmet, charges a customer, creates an order and requests dispatch. A client may repeat a request after losing the response. Workers may crash between any two durable operations. A dependency may stay unavailable longer than your request deadline.

Write the customer promise before choosing isolation or a messaging mechanism. Decide whether a failed payment releases stock immediately, eventually or through a manual exception path.

<!-- concept: design -->

## Predict

Before reopening a model, predict the result of removing the consumer inbox while keeping the outbox. Will the order count, delivery count and dispatch-effect count tell the same story? Write your reasoning, then use the replay case to identify which extra failure test your implementation needs.

## Assemble the evidence

1. Reproduce a failure in the naive capstone. Download its complete run.
2. Repair the payment and event boundaries. Download the repaired run and a relay replay run.
3. Add a concurrent anomaly example from lost updates or write skew. State why the chosen protection applies to your actual invariant.
4. Add a crash-prefix example from files or WAL. Identify the durable commit point and distinguish restart from power-loss claims.
5. Use the native or server extensions where the design needs independent sessions or real file operations. Keep their limitations beside their results.

Model evidence supports reasoning about that model. It does not establish that a production implementation executes those transitions. State how your implementation would be tested at the same boundaries.

## Review the design

| Design question | Evidence a reviewer should be able to find |
| --- | --- |
| What must stay true? | Exact invariants and request postconditions, including individual resource checks. |
| Who owns the state? | Database, payment API, broker, consumer and workflow owner. |
| What commits together? | Local transaction boundaries and external effects outside them. |
| What can overlap? | Conflicting reads/writes, lock ordering and isolation choice. |
| What makes a decision durable? | Commit records, request/result storage and publication intent. |
| What does a timeout mean? | An explicit unknown outcome and a lookup/retry protocol. |
| How does recovery finish? | Retry scope, stable identities, compensation and reconciliation. |
| Can it make progress? | Waiting bounds, hot keys, dependency failure and intervention policy. |
| What remains unproven? | Failure model, durability assumptions and implementation test gaps. |

## Challenge the happy path

For each case below, state the last durable fact, the next safe action, the customer-visible state and the independent check of the final result:

- Two identical requests arrive concurrently with the same key.
- The payment commits, but the response is lost.
- Payment succeeds after the inventory reservation expires.
- The order transaction commits, but the relay never starts.
- Dispatch is applied, but consumer progress is not committed.
- Cancellation overtakes a payment event.
- Compensation succeeds, but its acknowledgement is lost.
- A prepared participant cannot reach the decision owner.

<details><summary>Hint 1 · Follow one logical identity</summary><p>Carry the same request/order identity through reservation, payment, outbox and consumer records. Name each component's deduplication scope and retention.</p></details>
<details><summary>Hint 2 · Ask for a counterexample</summary><p>For each claimed guarantee, try removing one assumed mechanism or moving one crash before/after a durable write. If the claim survives every removal, it may be too vague to test.</p></details>
<details><summary>What a defensible answer includes</summary><p>Conditional inventory reservation and the reservation record commit locally; payment uses a durable stable key and recoverable result; a workflow reconciles successful payments with pending orders; paid status and an outbox intent commit together; the relay can repeat delivery; the consumer atomically stores its inbox identity with its effect. Cancellation and expiry have explicit versions and compensation paths. This is one possible design, not a single global ACID transaction. It still needs resource limits, retry budgets, retention policy, observability and tests against the real components.</p></details>

## Defend the mechanism as well as the design

Include your six implementation-bench functions and their named-case results. Choose one guarantee and trace it end to end through transaction descriptor, read visibility or lock/validation metadata, tentative writes, recovery records and acknowledgement. Identify the exact publication or durable-record boundary at each layer.

Show a tuple header and snapshot calculation, a lock-table or version-validation conflict, and a pageLSN/log recovery decision. For a distributed claim, include term/index pairs, an election check and the committed decision record, then distinguish that record from participant-local commit. Say which production details your small engines deliberately omit.

Finally propose one extension to implement yourself: predicate/range validation, a safe version-retention horizon, CLRs for interrupted undo, or retransmitted two-phase decision messages. Provide data structures, transition rules, an adversarial schedule and independent verification criteria before coding it.

## Transfer the idea

Choose a different system: a document index, account provisioning or a multi-file package update. Reuse the design questions, replacing the checkout-specific mechanisms where needed. Explain which guarantees can be weaker and why the business requirement permits that change.

Use the notebook below as your final design record. Include filenames of the downloaded evidence and a short explanation of what each run supports. A completed checklist is a review aid; the reasoning and reproducibility are the deliverable.
