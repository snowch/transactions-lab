# Whole-course learning-design and UX review

Reviewed 13 November 2026 against [learning-design](../.agents/skills/learning-design/SKILL.md)
and [UX](../.agents/skills/ux/SKILL.md). Scope: all 24 core investigations,
optional A1, the landing page, runtime guide, native guide, all concept diagrams,
seven implementation benches, native programs and the shared-server worksheet.

## Findings and fixes

- **Prediction after explanation:** retained the concept-first sequence. Fourteen
  prediction prompts now ask about a changed fixture, schedule, observation or
  failure boundary, rather than repeating the diagram's worked result. Matching
  follow-up activities make those predictions testable.
- **Evidence and assessment:** replaced fourteen identical success paragraphs and
  added missing criteria, giving every investigation a specific evidence contract.
  Criteria distinguish algorithm results, internal observations, business checks
  and limitations. The final deliverable requires explanations and reproducible
  artifacts, not selecting Repair or checking a completion box.
- **Controlled comparisons:** the lost-update and consensus presets change two
  inputs. Instructions now hold the relevant fixture/votes fixed before changing
  one policy or availability input. An accessible notice lists all fields that
  differ from the original baseline, including JSON edits. It does not claim that
  a comparison is automatically controlled.
- **History versus final state:** transaction-manager checks now retain a failure
  when a reader saw partial work, even after commit or abort restores a complete
  public map. A table exposes each actual observation. A correct final balance
  cannot erase a visibility violation earlier in the history.
- **Progression and scope:** replaced fragile/vague prerequisite references with
  named lesson links. Introduced MVCC, LSNs, quorum, outbox/inbox and saga terms
  before their diagrams. Foundation recovery now asks about redo/undo retention;
  CLR implementation and interrupted undo remain optional advanced work.
- **Executable instructions:** matched scenario labels to the actual dropdown,
  separated a valid failed-election prefix from an invalid leader-only extension,
  provided consistent split-debit amounts, and labelled tasks needing downloaded
  engine extensions. The core checkpoint is correctly described as an atomic
  metadata snapshot, rather than a full concurrent fuzzy-checkpoint protocol.
- **Usability:** mobile navigation makes obscured lesson content inert while open
  and restores access on close. Readers with JavaScript disabled get an explicit
  explanation of which activities require it. Input errors invalidate stale
  evidence; scenario restoration recovers the experiment.

## Lesson-by-lesson review

Every row was reviewed for practical question, observable goals, prerequisites,
concept explanation, prediction, evidence, controlled change, progressive help,
transfer and primary references. The following are the specific evidence or
progression decisions, rather than an automated claim of teaching effectiveness.

| Investigation | Learning/design decision | Evidence checked |
| --- | --- | --- |
| 01 · Invariants | Compare two conserved outcomes; require a request-specific verifier. | Published wrong-recipient SQL returns false; corrected recipient returns true. |
| 02 · Transaction manager | Compare abort under two publication policies; retain reader history. | Both final maps can be 100/100, while an earlier exposed read is 70/100 and its history check remains failed. |
| 03 · Atomicity | Separate full rollback, savepoint rollback and tuple visibility. | SQL yields 70/130; debit 130 raises 23514 and rollback retains 100/100. |
| 04 · Conditional reservation | Distinguish zero rows, reservation identity and constraint rejection. | One reservation, stock 0; removing the predicate rejects the second decrement and retains the first reservation. |
| 05 · MVCC | Predict active-at-capture and aborted-writer cases; label the two-reader extension. | Both histories retain the old reader's 100; creator/status/active-set visibility and finite bench cases execute. |
| 06 · Lost update | Match stock before comparing strategies; use a new stock-3 prediction. | Stale writes yield stock 2 + reservations 2; conditional writes yield 1 + 2 from stock 3. |
| 07 · Write skew | Derive arrows and compare overlapping versus serial histories. | Model derives/rejects cycles; actual Repeatable Read permits both doctors to leave, Serializable rejects the unsafe attempt. |
| 08 · OCC validation | Require the actual observed/current version mismatch and a phantom limit. | Read-set checking rejects stale dependencies before publication; validator bench and committed store inspected. |
| 09 · Lock manager | Keep three-client detector transfer within scope; intention locks are optional. | S/X upgrade queues, cycle detection, victim release and wakeup; exhaustive three-node graph oracle. |
| 10 · Deadlocks | Separate a progress failure from data corruption. | Opposite-order cycle and consistent-order waiting; PostgreSQL emits 40P01 and one victim aborts. |
| 11 · Retries | Predict observed value and expected version, not just attempt count. | Statement retry retains the unsafe decision; whole-decision retry preserves one doctor; real Serializable retry verified. |
| 12 · Contention | Derive logical batches and demand a hot-key counterexample. | Equal-service tick model and keys=1 boundary; no production throughput inference. |
| 13 · Files | Predict three persistence boundaries; name the actual unsafe-order preset. | Every repaired crash prefix; unsafe directory-first contents; native process-boundary observations. |
| 14 · WAL | Compare the same page-install event with different durable facts. | Every repaired prefix recovers a complete old/new transfer; in-place mid-write fails; commit and acknowledgement distinguished. |
| 15 · Recovery engine | Test a checkpointed active loser; replace mandatory CLR transfer with retention reasoning. | Redo guards, loser before-image undo, dirty-page recLSNs and retained pre-checkpoint dependencies. |
| 16 · Repeated recovery | Use 80 + 5 and identify why amount=0 is an inadequate test. | Three replays yield 85/90/95 for increment and 85/85/85 for after-image; native replay repeats the defect. |
| 17 · 2PC | Require both agreement and blocked-resource evidence. | Durable PREPARED/COMMIT, inconsistent timeout abort, safe waiting and authoritative recovery. |
| 18 · Consensus boundary | Hold votes fixed while varying reachability, then reverse that comparison. | Five replicas require three; reachable=3 still cannot invent a missing participant YES vote. |
| 19 · Replicated log | Keep the failed-election prefix inspectable before adding an invalid append. | C gets only its own vote; later append is rejected; majority acknowledgement, term/index comparison and prefix repair execute. |
| 20 · Outbox | Predict publication count separately from order/intent count. | Relay can publish twice; real SQL commits order+intent together or rolls both back; modified COMMIT case preserves both. |
| 21 · Idempotency | Predict checked/unchecked payload binding, not only charge count. | Stable/new keys, payload conflict, cached result and independent charge/payload predicates. |
| 22 · Sagas | Separate pending from completed failure and distinguish pre-effect failure from lost acknowledgement. | Durable pending release retries to completion; reservation/release history remains; lost-ack behavior is a design task. |
| 23 · Order workflow | Require separate resource counts and name the missing expiry/refund path. | Baseline duplicates charge/loses intent; protected and relay-replay cases retain one charge/effect despite repeated delivery. |
| 24 · Design review | Require six core functions, failure table and reproducible artifacts; A1 is optional. | Counterexamples cover concurrent duplicates, timeout, expiry, relay/inbox, cancellation and compensation boundaries. |
| A1 · ARIES | Predict three CLR/page durability combinations; define chain terms before the figure. | Repaired prefixes, durable CLR bounds, redo/skip and repeated restarts; both links and the independent final counters inspected. |

## Validation and limits

- `npm run check`: 103 Node checks, including all published SQL in order, the
  changed SQL branches above and five counterfactual activity checks; three
  Python test methods cover native file boundaries and repeated replay.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: 16 browser journeys
  covering all 28 generated pages, seven benches, evidence/notes, stale-input
  recovery, keyboard access, responsive concept/live diagrams and the new
  controlled-comparison journey. Concept images also run with JavaScript disabled
  at 1440/390/320px; SVG label bounds use three font choices.
- `npm run test:server`: six reported checks against independent PostgreSQL 17
  sessions: conditional blocking/recheck, Repeatable Read write skew, Serializable
  failure/retry, pinned versions, deadlock and consistent ordering. The disposable
  service is removed after verification.
- Desktop and mobile captures are retained in `test-results/` and CI artifacts.
  The reading sequence, edited comparison notice, SQL surface, internal tables,
  implementation editor, navigation and crash/recovery controls are reviewed.

These are executed software checks and an editorial learning/UX review. They are
not a learner study or a proof over arbitrary schedules. Models retain their
published fault limits; native process exit does not prove power-loss durability.
Cross-browser and screen-reader review beyond Chromium keyboard/layout checks
has not been established. Primary references remain beside each investigation;
PostgreSQL, Linux, Raft, ARIES and payment API guarantees are not conflated.
