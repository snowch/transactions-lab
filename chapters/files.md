# Replace a file safely.

Readers see the new configuration, the writer reports success, and a crash brings back the old one. Visibility and durability are different promises.

**You will:** Separate file contents from the directory entry and place the acknowledgement after the required persistence operations. **Prerequisites:** atomicity and failure boundaries. **Runtime:** a deterministic teaching model on your device. Read its local failure assumptions below the controls.

## Predict before running

Does an atomic rename guarantee that the new bytes and replacement name survive power loss? Which exact operation would justify saying “saved”?

## Control the experiment

Use **Step** to reveal one state transition, or **Run to end** to inspect the full trace. Click a revealed trace entry to revisit it. Choose another scenario to compare a repair; open **Edit the experiment** to change its inputs. Each scenario starts fresh.

<!-- experiment -->

## Inspect the evidence

Step to the rename in the baseline. Crash and recover there. The simplified durable namespace still points to old. Run to acknowledgement and crash again: the durability check fails, even though a complete file was visible before the crash. Each crash inspection starts from the selected step; it does not erase the original trace.

## Change one thing

Select the durable repair: write temp, fsync temp, rename, fsync parent directory, then acknowledge. Crash at every prefix. Old or new is acceptable before acknowledgement; after acknowledgement, new is required. Try directory-first to observe a persisted name referring to incomplete contents.

Download a run before changing settings. The export includes the submitted configuration, visible trace, checks, recovery attempts and model boundary. Save a baseline and a repair so the design record can refer to actual evidence.

<details><summary>Hint 1 · Follow the state</summary><p>There are two things to persist: the new file’s bytes and the name that points to it.</p></details>
<details><summary>Hint 2 · Locate the boundary</summary><p>The temporary file must be on the same file system for the intended atomic rename. Directory fsync support and guarantees depend on the platform and storage stack.</p></details>
<details><summary>Worked explanation</summary><p>Atomic rename makes readers switch names as one visible operation. It does not by itself flush file data or persist the changed directory. Under this model the durable protocol recovers a complete old or new file at every prefix and new after acknowledgement. The unsafe ordering can persist a new name before its data. Use the downloadable native exercise to execute Linux file operations; killing a process alone does not simulate a power failure.</p></details>

## Transfer the idea

Replace two related files, data and index. Explain why two atomic renames are not one atomic multi-file transaction. Design a manifest or generation directory that readers follow through one published reference.

**Success criteria:** identify the first decisive transition; explain the violated rule or blocked progress; justify the repair under explicit assumptions; and name a failure your experiment does not cover.

**Primary reference:** [Linux fsync](https://man7.org/linux/man-pages/man2/fsync.2.html).

[Run the native file and recovery exercises →](./native.html#local-files-and-recovery)
