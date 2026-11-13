# Transactions Lab

Apply the UX and learning-design skills in `.agents/skills/` before and after changes.
Review and fix within the authorized scope; these reviews do not require user approval.

- Keep transaction internals and executable implementation exercises central. The six-part course connects mechanisms to a design record. Every investigation needs a prediction,
  inspectable evidence, a change to try, progressive help, and an independent transfer task.
- Real SQL uses PGlite. Browser models must identify their failure model and limitations.
  Separate instances are not concurrent sessions against one shared database.
- Never imply process termination proves power-loss durability or that a simulation proves
  a production protocol correct. Distinguish atomic visibility, durability, isolation, and liveness.
- Keep simulation transitions in `web/models.js`, curriculum in `scripts/catalog.mjs` and
  `chapters/`, implementation benches in `web/benchmarks.js`, and native/server material downloadable from the built site.
- Support the `/transactions-lab/` GitHub Pages subpath; deploy through Actions.
- Run `npm run check`, `npm run test:browser`, and `npm run test:server` when server
  exercises change. Inspect desktop and mobile screenshots. Record reviews in `docs/validation.md`.
- Do not delegate to other agents unless the user explicitly requests it.
