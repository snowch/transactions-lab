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

- `npm run check`: static build; 98 Node checks for content, local links, real SQL
  and model semantics, including all 512 three-node directed graphs, every repaired
  log-engine crash prefix, and six core implementation contracts and the optional ARIES contract; three Python test
  methods including all native protocol boundaries and repeated replay.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: fifteen browser journeys
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

Desktop and mobile figure captures are saved as `concept-<id>-1440.png` and
`concept-<id>-390.png`. Full-page WAL desktop and MVCC mobile captures show the
reading sequence. Screenshot viewports expand around tall figures so fixed
navigation cannot cover their headings. The diagrams do not depend on interaction
or claim to represent a selected execution. Cross-browser and assistive-technology
review beyond Chromium remains unverified.
