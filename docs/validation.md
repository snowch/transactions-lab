# Implementation and learning review

## UX skill review

Reviewed the landing page, model investigation and SQL investigation at 1440px
and 390px widths in Chromium. The next action, active chapter, execution status,
editable controls, state, invariant checks and recovery are visible. Step and
scenario controls work by keyboard, focus is visible, Escape closes chapter
navigation and returns focus, and the skip link reaches the reading area.
State and tables scroll inside their containers; mobile pages have no document
horizontal overflow. Checks include text PASS/FAIL/Pending rather than relying
on color. Runtime errors offer reset; editing inputs invalidates old model runs
and marks old SQL output. Predictions appear before execution, and design records
save locally with explicit storage-failure feedback.

Screenshots are produced by browser tests as Actions artifacts: homepage desktop,
lost-update desktop, file-recovery mobile and SQL mobile. Full-page captures are
returned to scroll position zero so fixed navigation appears in its normal place.

## Learning-design skill review

The 24 core investigations and optional ARIES lab have a practical question, prerequisites, explicit runtime,
prediction, inspectable evidence, a change to try, progressive hints, worked
reasoning and an independent transfer task. SQL baselines intentionally include
a false business postcondition; a passing sum alone is insufficient. The course
separates safety from liveness, stable snapshots from serializability, durable
intent from delivery, and delivery from external effects. Runtime limits and
primary sources are recorded beside the investigations. The final design review
requires evidence and additional failure analysis, not a preset completion click.

## Checks executed

- `npm run check`: static build; 103 Node checks for content, local links, real SQL
  and model semantics, including all 512 three-node directed graphs, every repaired
  log-engine crash prefix, and six core implementation contracts and the optional ARIES contract; three Python test
  methods including all native protocol boundaries and repeated replay.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: sixteen browser journeys
  covering all 28 generated pages, scenario changes, crash/recovery, SQL errors
  and reset, exported evidence, persisted notes, keyboard and mobile layout.
  The added journeys execute all seven learner-code benches, check edge-case feedback,
  code persistence and notebook exports, terminate a nonterminating function, and
  inspect the engine tables, source and editor at desktop/mobile widths.
- `npm run test:server`: PostgreSQL 17 with independent psql connections; observed
  blocking plus predicate recheck, Repeatable Read write skew, Serializable
  SQLSTATE 40001 and a whole-decision retry, SQLSTATE 40P01 deadlock and consistent
  acquisition order, and actual tuple creator XIDs with a pinned MVCC snapshot.
  The disposable Compose service was removed afterward.

## Material limits

The native file tests establish real process restart observations on this Linux
host, not power-loss durability. Models expose their assumptions and cover small
specified state spaces. They do not implement PostgreSQL SSI, all of Raft, the full ARIES fuzzy-checkpoint/logical-undo protocol,
a payment connector or a production storage engine. No production throughput
claim is made. Cross-browser and assistive-technology usability beyond Chromium
keyboard/layout checks have not been established.

## Mechanism-first revision review

Reviewed the new MVCC mobile and recovery-engine desktop screenshots. Tuple, lock,
validation, page/log and replica tables expose computed internal state before the
raw snapshot. Wide tables and actual engine source scroll inside their containers.
Implementation benches define contracts, start with a defect, reveal named inputs
and expected/actual results, and keep the reference behind disclosure controls.
Edited code invalidates its results, draft code persists locally, and exports
distinguish tested source from current source. A worker Stop control and two-second
limit support recovery from nonterminating code.

All existing chapters now explain their enforcement machinery. The six new labs
implement publication, visibility/retention, lock queues/cycles, OCC validation,
LSN/checkpoint redo/undo and a bounded replicated log. Write-skew dependencies and
2PC stable records are computed/exposed instead of assuming an unexplained safe
mode. The final design requires submitted algorithms and internal evidence.
The trace uses reference code while the separate bench tests learner code; this
boundary is explicit. Production differences and omitted mechanisms are named.

## Optional advanced ARIES review

A1 is a separate Advanced · Optional navigation group; the 24 core titles and
numbering remain stable. It links from the WAL/recovery foundation, states its
prerequisites, and is not required for the core design capstone. The lab includes
a pointer implementation exercise with zero-pointer edge cases and exact engine
source. Structured tables distinguish prevLSN, undoNextLSN and the compensated
UPDATE, alongside transaction status, dirty-page recLSNs and ToUndo.

Reviewed desktop and 390px mobile screenshots. The log table follows the latest records so CLRs are visible; earlier history and
additional columns scroll within its container; page width remains bounded. Browser checks reproduce faulty double
undo, exercise repeated corrected restarts, inspect both CLR pointers and verify
manual restart after completed recovery.

Semantic checks cover every selected repaired trace prefix, 36 combinations of
CLR/page durability boundaries and repeated-attempt counts, loser redo, CLR
redo/skip decisions, bounded durable compensation, stable END records and restart
fixed points. The baseline ends B at 95; the repaired result is A 110, B 100, C 100.
The model has full-transaction rollback on disjoint fixed pages and an atomic
checkpoint snapshot; it does not claim full fuzzy-checkpoint merging, savepoints,
nested top actions, logical index undo or media recovery. Primary references are
the original Mohan et al. paper and Apache Derby's implementation explanation.

## Live diagram review

Reviewed MVCC, wait-for graphs, ARIES CLR links, replica lanes and 2PC at 390px
(320px for the wait graph), plus the WAL buffer/disk view at 1440px. Component
screenshots use a taller viewport to show the complete diagram below the sticky
execution controls. Captures include `mvcc-diagram-390.png`,
`lock-manager-diagram-320.png`, `aries-diagram-390.png`,
`replicated-log-diagram-390.png`, `two-phase-diagram-390.png` and
`recovery-engine-diagram-1440.png`. Arrow labels and directions are readable;
SVGs can scroll horizontally inside the narrowest page without widening it.
Text labels distinguish visible, durable and committed state without color alone.

Six semantic checks verify visibility/retention, dependency cycles, unsafe WAL
ordering, both CLR targets, per-node committed prefixes, participant knowledge
and projection purity. Two browser journeys check selected history, crash states,
scenario changes, stale-input invalidation, mobile overflow and sticky controls.
Diagrams use the exact reference-model snapshot and do not claim real disk or
cluster execution. Chapter prompts explain how each drawing relates to the
mechanism and the evidence the learner should inspect; the optional ARIES
drawing remains in the advanced lab.

## Concept illustration review

The concept-first revision adds 20 original annotated illustrations across all
24 core investigations and optional A1. Each appears before prediction and code
execution. These static examples teach the components and causal relationships;
the existing live diagrams remain within the experiment as inspectable evidence.
Captions distinguish boundaries and failure assumptions, including old snapshot
visibility, cross-row dependency cycles, log-before-page vs commit-before-ack,
prepared promises vs final decisions, and transaction history vs CLR skip links.

Browser checks open all investigations with JavaScript disabled at 1440px, 390px
and 320px. They verify that each illustration loads, has descriptive alternative
text, precedes prediction, selects the correct responsive SVG and does not widen
the page. A second check measures labels inside every node and panel in all 40
SVG assets. Review fixes included three overflowing node labels, larger mobile
text, stacked mobile panels and the local server's missing SVG MIME type.
The first Actions run caught a heading overflow under its system font. Shorter
panel headings fix that crowding; label checks now also exercise DejaVu Sans and
Liberation Sans so differences from the local system font remain covered. That
check also caught and shortened an advanced ARIES mobile annotation.

Desktop and mobile figure captures are saved as `concept-<id>-1440.png` and
`concept-<id>-390.png`. Full-page WAL desktop and MVCC mobile captures show the
reading sequence. Screenshot viewports expand around tall figures so fixed
navigation cannot cover their headings. The diagrams do not depend on interaction
or claim to represent a selected execution. Cross-browser and assistive-technology
review beyond Chromium remains unverified.

## Whole-course review

[The complete review](course-review.md) records the learning-design and UX pass
for all 25 investigations and the supporting guides, with a lesson-by-lesson
evidence matrix. It replaces generic assessment wording, makes counterfactual
predictions testable, fixes controlled comparisons and executable instructions,
keeps ARIES optional, and adds reader-history evidence. New UI checks cover
multi-input preset differences and mobile background focus; no-JavaScript reading
now explicitly distinguishes static explanations from executable activities.

## Learner wording and interface audit

### Opening check

Baseline `b33ed5f` on the publishing branch. The catalog contains 28 learner pages:
24 core investigations, optional ARIES, the overview, and the runtime and native guides.
The browser surface includes concept figures, real PGlite cells, 21 model experiments,
seven JavaScript benches, and the design notebook. The optional PostgreSQL worksheet
and native file exercises are in scope where the pages direct learners to them.

The overview expects basic SQL and short JavaScript functions. The course introduces
engine-specific information as needed. A learner must be able to tell what fixtures
or scenarios are prepared, which editor or control to use, what exactly to change,
when to run it, and which observable fields support the comparison. Models, actual
SQL, local process restart, and independent PostgreSQL sessions provide distinct
kinds of evidence.

Apply the repository learning-design and UX skills before and after the changes.
Read every learner route and inspect the generated controls, figure captions,
example inputs, status, errors and feedback. Keep the investigation and the evidence
it needs visible. Keep additional inspection and transfer help optional. Preserve
existing browser storage and distinguish run outcomes from understanding checks.
Opening Chromium walkthroughs surfaced a destructive starter restore, previous SQL
results removed by failed attempts, and a reset control below the cells that need
it. Verify original and literal changed cases through the actual page, then record
functional evidence separately from learner outcomes.

### Closing check

Re-read the overview, 25 investigations and two references as they render. The final
copy identifies plans the page prepares, learner actions, and evidence to compare.
The work retains the previous course's concept examples and original SQL. Earlier
anchors still resolve. Checks now say whether a model rule holds, while code cases,
SQL errors, saved drafts and learner self-review use separate feedback. The visible
explanations follow the results; hints, source, full JSON and file downloads are
optional. Additions to the recovery and replica tables expose evidence needed by
those investigations without requiring full JSON.

| Page | Learner-facing action and evidence checked |
| --- | --- |
| Overview | Defined the entry path, basic SQL and JavaScript prerequisites and distinction between diagrams and measured evidence. Removed the competing start link and decorative counts. |
| Invariants | Run SQL 01–03, change the recipient in SQL 02, and compare individual balances with the conservation and request checks. |
| Transaction manager | Step through an observation and compare the abort preset under each publication policy. The final map matches while a historical read differs. |
| Atomicity | Run each SQL cell and inspect balances, conservation and creator XIDs. Replace the savepoint debit with 130; the constraint rejects it and the fixture remains 100/100. |
| Constraints | Compare a zero-row result with the constraint error after removing the two availability predicates. The first reservation remains. |
| MVCC | Track snapshot `active` IDs and writer status across reordering, abort and vacuum-before-commit; compare the fresh-statement scenario. |
| Lost update | Serialize the schedule, then compare the two strategies at matching stock counts. Check the rejected request separately. |
| Write skew | Compare the original read-before-write schedule with serial requests and read the rejected dependency graph. |
| Validation | Run both fresh-read schedules, with and without the second leave. Compare committed values and observed versions. The bench reads only the supplied version maps. |
| Lock manager | Revisit the queue before and after release, test a single-owner upgrade and read the invalid blocked-operation error. |
| Locks | Compare opposite resource order with same-order waiting. Inspect the direction of the edges and completion. |
| Retries | Compare observed values, expected versions and roster counts across retries with the same conflicting commit. |
| Contention | Compare `slots` and `clock` before and after setting `keys` to 1. The output counts logical ticks. |
| Files | Revisit rename, fsync and acknowledgement steps. Crash and compare visible names and recovered data, including the unsafe order. |
| WAL | Revisit a page installation in each protocol and both sides of the durable marker. Read recovered disk pairs rather than the final acknowledged state alone. |
| Recovery engine | Inspect a checkpointed loser, then test deleting a checkpoint, flushing Bob after commit and splitting Alice's debit. Read actual redo and reverse-order undo decisions. |
| Repeated recovery | Try 80 + 5 under both replay representations and run two further restarts. Zero amount masks the defect. |
| Two-phase commit | Compare timeout abort, waiting and authoritative recovery using both participant statuses and progress. |
| Consensus | Change reachability with votes fixed, then vary the vote with quorum fixed. Use both three and five replicas. |
| Replicated log | Check no-majority acknowledgement, both follow-up sends and a failed election with a valid inspectable prefix. A leader-only event fails separately. |
| Outbox | Check duplicate publication in the model. In separate SQL, compare both existence fields after rollback and edited commit. |
| Idempotency | With the same key and altered payload, compare checked and unchecked binding, charge count and response. |
| Saga | Inspect progress at the failed release before comparing history and restored stock. The lost acknowledgement is an independent design task. |
| Order workflow | Compare reservation, charge, delivery and effect counts in baseline, repair and replay. Export those runs for the design review. |
| Design review | Provide exact routes and export controls, tie claims to tested mechanisms, and keep the missing consumer case as a design task. |
| ARIES | Replay the compensation and zero-pointer cases; compare both CLR links and final page values across restart boundaries. |
| Real systems guide | Identify the repository folder, local commands, evidence fields and scope of independent PostgreSQL and native process-restart checks. |
| Runtime guide | Describe fixture, reset, recovery, error and export behavior using the current control labels. Keep model and SQL evidence distinct. |

#### Functional verification

- `npm run check` executes 103 Node checks and three native Python test methods.
- All 16 Chromium journeys pass through the Pages subpath. They include all 28
  learner routes, seven original starter and corrected bench runs, SQL error and
  source provenance, keyboard trace revisits, notebook recovery, and no-script
  diagrams. Exact follow-up walkthroughs run all 12 SQL cells in their original
  sequences and the four documented edited SQL sequences. Another 58 model
  variants and recovery actions match the native engine and independent outcome
  checks, including two intentional invalid schedules.
- Screen and keyboard checks use 320, 390, 820 and 1440 CSS pixels. Screenshots
  include the SQL error and inventory result, internal diagrams and mobile
  navigation. Both system color preferences were used; the lab uses its light
  palette under both. A saved implementation from the old storage key remains
  recoverable after Restore and reload; a blocked save leaves the exact code
  available for download and retains the previous saved draft.
- The unchanged six independent-session server tests pass in a disposable local
  PostgreSQL 17.12 service. The published `postgres:17` image exhausted the local
  Docker filesystem while creating the container, so this local run uses the
  cached `postgres:17-bookworm` image with an unchanged copy of the verifier.
  The repository's published CI still uses its original Compose image.

#### Evidence of learning effectiveness

Learner understanding remains unmeasured. The evidence above establishes the
behavior of the software and the accuracy of the directions for the tested examples.
