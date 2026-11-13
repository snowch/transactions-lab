# Make the promise.<br>Then try to break it.

A transaction promises that a change will preserve something important, even when operations overlap or a machine stops. Find out exactly what that promise needs.

<div class="hero-actions"><a class="start-link" href="./invariants.html">Start the first investigation →</a><a href="#the-laboratory">Explore the course</a></div>

<div class="lab-strip"><span><strong>18</strong> investigations</span><span><strong>6</strong> connected parts</span><span><strong>0</strong> accounts to create</span></div>

## The laboratory

Reserve the last bicycle. Transfer money. Replace a configuration file. Lose a commit response. Each small system has a rule it must preserve. You control the operations and failures that put the rule under pressure.

**Predict → run → inspect → break → repair → defend.**

Run real PostgreSQL in your browser. Step through explicit models of concurrent requests, storage writes and distributed decisions. Then take selected investigations to a shared PostgreSQL server or a local file system. The model and the real-system exercises say exactly what each can establish.

## A journey across the boundary

<div class="course-grid">
<a href="./invariants.html"><span>01—03 / DESIGN</span><h3>What must stay true?</h3><p>State an invariant, choose a boundary, and reserve the last item.</p></a>
<a href="./lost-update.html"><span>04—08 / CONCURRENCY</span><h3>Who can interfere?</h3><p>Interleave requests, break snapshots, build a deadlock and retry a decision.</p></a>
<a href="./files.html"><span>09—11 / DURABILITY</span><h3>What survives a crash?</h3><p>Replace a file, find the commit point and crash during recovery.</p></a>
<a href="./two-phase.html"><span>12—13 / DISTRIBUTED COMMIT</span><h3>Who knows the decision?</h3><p>Lose a coordinator and separate participant agreement from replication.</p></a>
<a href="./outbox.html"><span>14—16 / WORKFLOWS</span><h3>Where does the promise end?</h3><p>Close a dual-write gap, retry an unknown outcome and recover compensation.</p></a>
<a href="./order-workflow.html"><span>17—18 / DESIGN REVIEW</span><h3>Can you defend it?</h3><p>Break the order service and support your transaction design with evidence.</p></a>
</div>

## Before you begin

Be comfortable reading a short program and basic SQL: `SELECT`, `UPDATE` and `INSERT`. We introduce transaction terms as they become useful. Some JSON editing is used to change model settings; each scenario has a restore button.

Start in the browser with no installation. PostgreSQL loads on SQL pages, so the first SQL exercise downloads a larger WebAssembly runtime. Other models use only JavaScript. A modern browser with JavaScript and WebAssembly is required; the explanations and worked reasoning remain readable without running an experiment.

Work at your own pace. Allow around 20–40 minutes for an investigation, and longer for the native extensions and final design. These are estimates, not completion requirements.

## Leave with a design, and the evidence

Every chapter has a prediction, a controlled experiment, progressive hints, a worked explanation and a transfer task. Use the lab notebook to record the invariant, participants, transaction boundary, concurrency strategy, durable commit point and recovery policy.

Download baseline and repaired runs before moving on. Draft notes save locally when browser storage is available; executed database state and run history last only for the current page. A check mark records your own review, not certification.

[What runs where?](./runtime.html) · [Run against real systems](./native.html) · [Source and issue tracker](https://github.com/snowch/transactions-lab)
