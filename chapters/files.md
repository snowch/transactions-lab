# Replace a file safely.

Readers see the new configuration, the writer reports success, and a crash brings back the old one. Visibility and durability are different promises.

**You will:** separate file contents from the directory entry and place the acknowledgement after the required persistence operations. **Prerequisites:** [atomicity](./atomicity.html) and the distinction between visibility and durability. **Runtime:** a teaching model. Its assumptions appear before the scenario controls.

`fsync` asks the operating system to persist changes. A file flush covers its bytes; a directory flush covers changes to its names in this model.

<!-- concept: files -->

## Predict before running

For the durable protocol, predict recovery at three boundaries: after file fsync but before rename, after rename but before directory fsync, and after directory fsync but before acknowledgement. Which outcomes are permitted at each boundary, and what extra promise begins at acknowledgement?

## Control the experiment

The page loads **Baseline** with a rename and no explicit file or directory flush. Select **Run to end**, then select **rename atomically replaces the visible target** in the revealed trace. Select **Crash & recover here**. Compare `visible` with `recovered`.

<!-- experiment -->

The three stores in the drawing are distinct: buffered contents, the currently visible target, and durable replacement metadata/data. Follow each fsync and rename event instead of treating “new is visible” as proof that all persistence work finished.

## Inspect the evidence

Compare the drawing’s buffered contents, visible target and durable replacement with `recovered`. Revisit **Acknowledge the update to the caller** and crash there. The baseline makes the new file visible before it saves the data and name needed after the crash.

## Change one thing

Choose **Repair** and select **Run to end** to reveal the full schedule. Select each of **fsync the temporary file**, **rename atomically replaces the visible target**, and **fsync the parent directory persists the replacement name** in turn. Each time select **Crash & recover here** and record `recovered`. Repeat at the acknowledgement step. When does the model first require the new file?

Choose **unsafe-order**, select **Run to end**, then select **Crash & recover here**. Compare `durableName`, `durableTemp` and `recovered`. Which write was skipped before the new name became durable?

<details><summary>Separate bytes from names</summary><p>There are two things to persist: the new file’s bytes and the name that points to it.</p></details>
<details><summary>Check the file system boundary</summary><p>The temporary file must be on the same file system for the intended atomic rename. Directory fsync support and guarantees depend on the platform and storage stack.</p></details>
<div class="result-explanation"><h3>Why this result occurs</h3><p>Atomic rename makes readers switch names as one visible operation. It does not by itself flush file data or persist the changed directory. Under this model the durable protocol recovers a complete old or new file at every prefix and new after acknowledgement. The unsafe ordering can persist a new name before its data. Use the downloadable native exercise to execute Linux file operations; killing a process alone does not simulate a power failure.</p></div>

## Under the hood: data pages and directory entries are separate writes

A file descriptor names an open file object. Writing it changes buffered contents that the kernel may persist later. Rename changes the directory namespace that future lookups follow; it is not equivalent to forcing the new file's contents or the directory's own modified metadata. The durable replacement protocol has dependencies between those operations.

A journaling file system records recoverable metadata changes before installing them in their home locations. A copy-on-write design can instead prepare new blocks and publish a new root reference. Neither turns an arbitrary sequence of application-level multi-file operations into one transaction automatically. Reader visibility, namespace atomicity and post-crash durability remain distinct properties.

Compare the file replacement steps with the [WAL page engine](./recovery-engine.html): both must preserve the information that makes every allowed crash prefix recoverable, while their log format and commit unit differ.

## Transfer the idea

Replace two related files, data and index. Explain why two atomic renames are not one atomic multi-file transaction. Design a manifest or generation directory that readers follow through one published reference.

**Success criteria:** record recovered contents before and after acknowledgement at every repaired prefix; distinguish file-data and directory-name persistence; explain why process exit cannot validate power-loss behavior or a multi-file commit.

**Primary reference:** [Linux fsync](https://man7.org/linux/man-pages/man2/fsync.2.html).

[Run the native file and recovery exercises →](./native.html#local-files-and-recovery)
