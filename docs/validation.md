# Initial implementation review

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

All 18 investigations have a practical question, prerequisites, explicit runtime,
prediction, inspectable evidence, a change to try, progressive hints, worked
reasoning and an independent transfer task. SQL baselines intentionally include
a false business postcondition; a passing sum alone is insufficient. The course
separates safety from liveness, stable snapshots from serializability, durable
intent from delivery, and delivery from external effects. Runtime limits and
primary sources are recorded beside the investigations. The final design review
requires evidence and additional failure analysis, not a preset completion click.

## Checks executed

- `npm run check`: static build; 49 Node checks for content, local links, real SQL
  and model semantics; three Python test methods including all native protocol
  boundaries and repeated replay.
- `CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: seven browser journeys
  covering all 21 generated pages, scenario changes, crash/recovery, SQL errors
  and reset, exported evidence, persisted notes, keyboard and mobile layout.
- `npm run test:server`: PostgreSQL 17 with independent psql connections; observed
  blocking plus predicate recheck, Repeatable Read write skew, Serializable
  SQLSTATE 40001 and a whole-decision retry, SQLSTATE 40P01 deadlock and consistent
  acquisition order. The disposable Compose service was removed afterward.

## Material limits

The native file tests establish real process restart observations on this Linux
host, not power-loss durability. Models expose their assumptions and cover small
specified state spaces. They do not implement PostgreSQL SSI, a consensus protocol,
a payment connector or a production storage engine. No production throughput
claim is made. Cross-browser and assistive-technology usability beyond Chromium
keyboard/layout checks have not been established.
