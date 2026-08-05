---
description: Incremental learning and implementation plan for a Pi extension that approves edit/write operations and previews proposed changes
tags: [pi, extension, typescript, permissions, edit, write, diff, vscode, learning-plan]
applies_to: [pi-coding-agent, personal-development-workflow]
status: planning
---

# Pi edit/write approval extension — learning and implementation plan

## Purpose of this document

Preserve the requirements, technical findings, decisions, learning goals, implementation milestones, and current progress for a Pi Coding Agent extension that asks for permission before changing files.

This document is intended to be the starting point when continuing in a later Pi session. Future sessions should read this document before proposing or making extension changes.

## Project locations and their different purposes

### The canonical plan in the extension repository

This file is the durable **roadmap and session handoff document**. Its canonical location is repository-relative so it remains valid in every clone:

```text
docs/learning-and-implementation-plan.md
```

Canonical repository:

```text
https://github.com/YousufAzadSami/Pi-Extension-Edit-Approval
```

Its purpose is to preserve:

- what the user wants to build;
- why the project is being taught incrementally;
- what has already been learned and decided;
- which Pi APIs and examples were investigated;
- which milestones are complete or pending;
- how a future session should safely continue.

The former full copy under Argon's `.windsurf/plans/` directory has been replaced by a short pointer to this repository. The extension remains separate from the Argon product and must not be implemented in the Argon source tree.

### The extension source and local working copies

The extension source lives in the Git repository at:

```text
https://github.com/YousufAzadSami/Pi-Extension-Edit-Approval.git
```

It can be cloned on both work computers. Repository-relative paths, rather than absolute clone paths, identify project files.

The local clone paths are machine-specific:

| Machine | Local source/learning workspace |
|---|---|
| Work Laptop (current machine) | `D:/others/Pi-Extension` |
| Work Desktop | `D:/personal/Pi-Extension` (planned; parent directory reported as `D:/personal/`) |

Each clone will eventually contain the same TypeScript source, learning notes, tests, and package configuration. Absolute clone paths are local details, not the identity of the project. Documentation and commands should use `<local-clone>` or repository-relative paths whenever practical.

Keeping the clones outside Argon prevents experimental learning code from being mixed into a large production C++ repository. The continuation checklist must inspect the clone on the current machine because the plan records intentions while the clone records actual implementation state. This avoids overwriting work and prevents a later session from assuming that the plan is perfectly current.

### Global installation is separate from source location

The finished extension will be a **global Pi extension**. In Pi, global means available to all projects for one user on one machine; it does not automatically synchronize across computers.

Each machine will therefore need its own global installation under Pi's user configuration, ultimately sourced from the same public repository. During development, each clone will be loaded explicitly with `pi -e`. After stabilization, the preferred deployment is to package the extension and install that Git source globally on both machines.

In short:

```text
GitHub repository                     = canonical extension source
<local-clone>/docs/learning-and-implementation-plan.md
                                      = canonical plan
Argon .windsurf/plans pointer         = link to the canonical plan, not a second copy
D:/others/Pi-Extension                = Work Laptop clone
D:/personal/Pi-Extension              = planned Work Desktop clone
~/.pi/agent/... on each machine       = separate per-machine global installation
```

## Current status

- **Overall status:** Repository setup complete; extension implementation not started.
- **Intended extension scope:** Global on both the Work Laptop and Work Desktop.
- **Extension implementation:** Not started.
- **Repository files:** `.gitignore` and this canonical plan; no extension source yet.
- **Plan created and migrated:** Yes.
- **Current Pi version observed:** `0.83.0`.
- **Current machine:** Work Laptop.
- **Work Laptop clone:** `D:/others/Pi-Extension`.
- **Work Desktop clone:** `D:/personal/Pi-Extension` (planned, not yet verified or created).
- **Git repository:** `https://github.com/YousufAzadSami/Pi-Extension-Edit-Approval.git`, configured locally as `origin`.
- **Current local branch:** `main`, tracking `origin/main`.
- **Canonical plan:** `docs/learning-and-implementation-plan.md` in the extension repository.
- **Argon handoff file:** A stable GitHub and repository-relative pointer to the canonical plan.

The user originally requested `.windsurf/plan`, but that singular directory did not exist. The existing repository convention is `.windsurf/plans`, so this document was placed there.

## User's requirements

### Permission before changes

Whenever Pi invokes the built-in `edit` or `write` tool:

1. Pause before the operation executes.
2. Explain why the proposed change is necessary.
3. Show what is going to change.
4. Ask the user to choose one of:
   - **Yes** — execute the proposed operation.
   - **No** — reject the proposed operation.
   - **Others** — let the user write custom feedback about the proposal.

### Meaning of `Others`

`Others` must not silently alter and execute the original operation.

The safe behavior is:

1. Ask the user for custom text.
2. Block the current `edit` or `write` call.
3. Return the user's feedback to the model as the blocking reason.
4. Allow the model to propose a revised operation.
5. Ask for permission again when the revised operation reaches `tool_call`.

This guarantees that only the exact operation approved with **Yes** is executed.

### Change preview

Desired progression:

1. Start with Pi's existing terminal rendering.
2. Add a clearer terminal diff where needed.
3. Later support an external comparison program such as:
   - VS Code: `code --diff <old-file> <new-file> --wait`
   - KDiff3: `kdiff3 <old-file> <new-file>`

### Why this must be taught and built step by step

The goal is not merely to produce a finished extension. The user wants to understand how to build and maintain it independently.

There are three unfamiliar layers to learn:

1. **TypeScript as a language**
   - The user currently has no TypeScript experience.
   - New syntax such as type annotations, imports, object types, unions, callbacks, `async`, `await`, and optional values must be introduced gradually.
   - Where useful, explanations may compare TypeScript concepts with familiar C++ concepts, while also explaining where the comparison stops being accurate.

2. **The TypeScript/JavaScript ecosystem**
   - The user is also unfamiliar with Node.js, npm packages, modules, runtime imports, type-only imports, transpilation, `package.json`, dependency resolution, and editor tooling.
   - These ecosystem concepts must not be assumed merely because a small TypeScript file can be copied and run.

3. **Pi itself**
   - The user needs to learn Pi's execution model and extension API: how Pi discovers an extension, calls its default export, registers callbacks, emits events, exposes `ExtensionAPI` and `ExtensionContext`, presents UI, invokes tools, and allows a `tool_call` handler to block execution.
   - The user should understand not only which API call to copy, but also when Pi calls it, what data it receives, what its return value means, and why that return value changes Pi's behavior.

Trying to implement permissions, custom feedback, rationale collection, terminal diffs, external diff viewers, configuration, and tests all at once would mix these three learning layers together. If something failed, it would be difficult to tell whether the problem came from TypeScript syntax, Node/package behavior, Pi's lifecycle, the TUI, or the extension's own logic.

Small milestones make the learning process safer and clearer:

1. Introduce one or two new concepts.
2. Make one small, visible change.
3. Predict what should happen.
4. Run it and observe the result.
5. Explain why the result occurred.
6. Fix misunderstandings before adding another layer.
7. Build the next feature on top of a known-working foundation.

This approach reduces debugging ambiguity, prevents large unexplained code dumps, creates confidence through working examples, and produces knowledge that can be reused for future Pi extensions.

### Teaching requirements

Implementation should proceed in very small pieces. Each change should explain:

- what is being changed;
- why it is needed now;
- why more advanced behavior is being postponed;
- what TypeScript syntax is involved;
- what JavaScript/Node.js ecosystem concept is involved, if any;
- what Pi API is involved;
- when registration occurs and when the registered code executes;
- what values enter and leave each important function;
- how to test the change;
- what success and failure look like;
- how the new piece connects to the previous and next milestones.

Teaching sessions should also follow these rules:

- Define unfamiliar terminology before relying on it.
- Prefer a small runnable example over a large final implementation.
- Explain code block by block rather than asking the user to accept it as magic.
- Use C++ comparisons when helpful, but state important differences.
- Distinguish TypeScript compile-time types from JavaScript runtime values.
- Distinguish extension registration time from event-handler execution time.
- Let the user ask questions or repeat a milestone before proceeding.
- Do not advance merely because the code works; confirm that the user understands why it works.

## Scope clarification

The first implementation will intercept tool calls named exactly:

- `edit`
- `write`

This does **not** prevent every possible filesystem mutation. For example, a `bash` command, a custom tool, or an extension can also modify files.

This initial scope matches the explicit edit/write requirement. A later policy milestone may optionally cover:

- dangerous or file-mutating Bash commands;
- custom mutation tools;
- protected paths;
- operations outside the current project;
- an allow-once or allow-for-session mode.

The plan must not claim to be a complete security sandbox. Pi extensions run with the user's normal system permissions.

## Recommended architecture

Use **one logical extension**, initially implemented as one file and later split into several modules.

### Initial structure in either machine's clone

```text
<local-clone>/
└── change-approval.ts
```

Current/planned expansions of `<local-clone>` are:

```text
Work Laptop:  D:/others/Pi-Extension
Work Desktop: D:/personal/Pi-Extension
```

A portable development test can run from a disposable subdirectory inside the clone:

```bash
cd test-workspace
pi --no-extensions -e ../change-approval.ts
```

This explicitly loads the learning version without automatically affecting ordinary Pi sessions or mixing experimental code into Argon.

### Later source structure

```text
<local-clone>/
├── package.json
├── docs/
│   └── learning-and-implementation-plan.md
├── extensions/
│   └── change-approval/
│       ├── index.ts
│       ├── approval-dialog.ts
│       ├── preview.ts
│       ├── rationale-tools.ts
│       ├── external-diff.ts
│       └── types.ts
└── tests/
```

This remains one Pi extension because Pi loads the default-exported function from `index.ts`. The other files are implementation modules. Once stable and stored in the Git repository, the package should be installed globally and separately on both machines.

### Why not several independent extensions initially?

The permission policy, rationale, preview, and external viewer are parts of the same approval workflow. Keeping them together provides:

- one place to configure behavior;
- predictable event-handler ordering;
- easier sharing of types and state;
- fewer extension-loading interactions;
- a simpler mental model for a beginner.

If external-diff integration eventually becomes independently reusable, it can be separated later without changing the first lessons.

## Confirmed Pi API behavior

### Extension entry point

A Pi extension default-exports a factory function:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function changeApprovalExtension(pi: ExtensionAPI) {
    // Register behavior here.
}
```

Pi imports the module, obtains its default export, and calls that function with a real `ExtensionAPI` object.

### Interception point

The important event is:

```ts
pi.on("tool_call", async (event, ctx) => {
    // Runs before the requested tool executes.
});
```

Relevant lifecycle:

```text
model requests a tool
    ↓
tool_execution_start
    ↓
tool_call event          ← permission extension runs here
    ↓
allow or block
    ↓
tool executes only if allowed
```

### Allowing an operation

Returning nothing allows normal execution:

```ts
return undefined;
```

### Blocking an operation

Returning a block result prevents execution:

```ts
return {
    block: true,
    reason: "User rejected this operation",
};
```

The reason is returned to the agent, allowing it to understand the rejection and react.

### Why `async` and `await` make the gate work

The event handler is asynchronous. Pi waits for its result before executing the tool.

```ts
const choice = await ctx.ui.select(...);
```

`await` pauses this handler while the user decides. It does not freeze the operating system; it waits for the Promise representing the dialog result. Since the handler has not yet allowed the tool call, the edit/write operation remains unexecuted.

### Available UI calls

The first implementation can use:

```ts
await ctx.ui.select(title, ["Yes", "No", "Others"]);
await ctx.ui.input(title, placeholder);
ctx.ui.notify(message, "info");
```

A custom TUI component is unnecessary for the first milestone.

### Behavior without an interactive UI

`ctx.hasUI` is false in print and JSON modes. The extension should fail closed:

```ts
if (!ctx.hasUI) {
    return {
        block: true,
        reason: "Approval UI is unavailable",
    };
}
```

This prevents a permission requirement from being silently bypassed in a mode that cannot ask the user.

RPC mode has UI protocol support, but custom TUI components are unavailable there. Basic `select` and `input` operations can be considered separately when RPC support is tested.

### Parallel tool calls

Pi preflights sibling tool calls sequentially in its default parallel execution mode. Permission questions should therefore be presented one at a time. Approved sibling tools may execute concurrently after preflight.

Pi's built-in `edit` and `write` implementations use the shared file-mutation queue, which serializes mutations targeting the same file.

## Existing preview behavior in Pi 0.83.0

### `edit`

The built-in edit renderer already computes a proposed diff before execution. Its call renderer:

1. reads the target file;
2. applies the proposed replacements in memory;
3. computes a display-oriented diff;
4. displays that diff in the terminal tool-call row;
5. does not write the file during preview.

This means the first permission-gate version can reuse Pi's existing terminal preview rather than implement a diff algorithm immediately.

### `write`

The built-in write renderer shows proposed content before execution. In collapsed mode it shows up to ten lines; the normal tool-expansion key can reveal more.

It does not present a true comparison against an existing file. A later milestone will add an old-versus-new diff for `write`.

## Important limitation: obtaining the reason for a change

The built-in tool arguments do not contain a semantic rationale.

### Built-in `edit` input

```ts
{
    path: string;
    edits: Array<{
        oldText: string;
        newText: string;
    }>;
}
```

### Built-in `write` input

```ts
{
    path: string;
    content: string;
}
```

A normal `tool_call` listener can explain what operation is requested and why approval is required, but it cannot reliably explain the model's semantic motivation.

Do not pretend that a generated generic sentence is the model's actual reason.

### Planned robust solution

In a later milestone, wrap/override the built-in `edit` and `write` tools with schemas that require a concise, user-facing `reason` field, then delegate execution to Pi's original tool implementation.

The reason should be a short justification, not private chain-of-thought. Example:

```text
Add a missing empty-input check so the parser does not access the first character of an empty string.
```

The approval dialog can then display:

```text
Operation: edit
File: src/parser.ts
Reason: Add a missing empty-input check ...
```

## Incremental milestones

Each milestone should be completed, explained, and tested before moving to the next one.

### Milestone 0 — establish the learning workspace

**Status:** Pending.

**Goal:** Create only the minimum source file needed for the first extension test.

**Planned change:**

```text
<local-clone>/change-approval.ts
```

For the current Work Laptop session, this expands to:

```text
D:/others/Pi-Extension/change-approval.ts
```

**Concepts taught:**

- TypeScript module;
- `import type`;
- default export;
- function parameter typing;
- extension registration versus later event execution;
- loading an extension with `pi -e`.

**Acceptance criteria:**

- Pi starts with the extension loaded.
- No TypeScript/runtime loading error appears.
- No file operation behavior changes beyond what is intentionally implemented.

### Milestone 1 — intercept edit/write with Yes and No

**Status:** Pending.

**Goal:** Prove the smallest complete permission loop.

**Behavior:**

- Ignore all tools except `edit` and `write`.
- Show operation name and path.
- **Yes** returns `undefined` and allows execution.
- **No** returns `{ block: true, reason: ... }`.
- Escape/cancel is treated as rejection.
- No UI means reject by default.

**Concepts taught:**

- event-driven callbacks;
- guard clauses;
- string comparisons;
- discriminated event data;
- asynchronous dialogs;
- return values controlling Pi behavior.

**Acceptance criteria:**

1. A read operation does not prompt.
2. An edit operation prompts before changing the file.
3. Selecting No leaves the file unchanged.
4. Selecting Yes allows the requested change.
5. Cancelling leaves the file unchanged.

### Milestone 2 — add `Others` feedback

**Status:** Pending.

**Goal:** Let the user reject an operation with custom guidance.

**Behavior:**

- Add the exact option label `Others`.
- Selecting it opens an input dialog.
- Non-empty feedback is included in the block reason.
- Empty/cancelled feedback still blocks the original operation.
- A revised model proposal must trigger a new approval question.

**Concepts taught:**

- nested asynchronous UI operations;
- optional values;
- optional chaining;
- trimming strings;
- conditional expressions;
- safe rejection semantics.

**Acceptance criteria:**

1. The original operation never executes after selecting Others.
2. The model receives the custom feedback.
3. A revised edit causes another approval prompt.
4. Only a later explicit Yes executes the revised edit.

### Milestone 3 — understand and improve terminal previews

**Status:** Pending.

**Goal:** Make proposed changes understandable without leaving the terminal.

**Steps:**

1. Test Pi's existing pre-execution edit diff.
2. Test write-content expansion.
3. Decide whether the existing transcript plus `ctx.ui.select` is sufficiently visible.
4. If not, create a custom TUI approval component that combines:
   - operation;
   - path;
   - rationale when available;
   - diff/content preview;
   - Yes/No/Others choices;
   - keyboard help.
5. Add a true old/new diff for `write`.

**Concepts taught:**

- TUI components;
- rendering width;
- keyboard handling;
- ANSI-safe wrapping;
- terminal themes;
- reading without mutating;
- creating previews in memory.

**Acceptance criteria:**

- The proposed change is visible before approval.
- Preview code never writes the target file.
- Large previews are truncated or scrollable.
- Added and removed lines are visually distinguishable.
- Preview errors cause a safe rejection or clearly warn the user.

### Milestone 4 — require a user-facing rationale

**Status:** Pending.

**Goal:** Reliably display why the model says the edit/write is necessary.

**Likely design:**

- Re-register tools named `edit` and `write` with an added required `reason` field.
- Preserve their original path/content/edit fields.
- Delegate execution to tools created by `createEditTool()` and `createWriteTool()`.
- Preserve built-in mutation queue behavior.
- Preserve or inherit built-in rendering where practical.
- Cache delegated tool instances by `ctx.cwd` so session/cwd changes use the correct base directory.

**Concepts taught:**

- tool schemas;
- TypeBox;
- tool overriding;
- delegation/wrapping;
- structural typing;
- runtime values versus TypeScript-only types;
- preserving built-in behavior.

**Acceptance criteria:**

1. The model cannot invoke wrapped edit/write without a reason accepted by the schema.
2. The reason appears in the permission UI.
3. Yes delegates to Pi's original implementation.
4. No/Others prevent delegation.
5. Existing edit/write result shapes and rendering still work.
6. The dialog labels the text as the model's stated reason, not as verified truth.

### Milestone 5 — external diff viewer

**Status:** Pending.

**Goal:** Optionally inspect a proposal in VS Code or KDiff3 before deciding.

**Proposed process:**

1. Read the existing target without modifying it.
2. Compute proposed new content in memory.
3. Write old/new snapshots to a temporary extension-owned directory.
4. Launch the selected viewer.
5. Wait for it to close when the viewer supports waiting.
6. Return to the terminal approval prompt.
7. Clean up temporary files.

**Important constraints:**

- Never ask the viewer to edit the real target as part of preview.
- Temporary filenames must make old/new identity obvious.
- Paths containing spaces must be passed as process arguments, not concatenated shell text.
- Cleanup must run after success, cancellation, and launch failure.
- Viewer failure must not imply approval.

**Concepts taught:**

- Node.js filesystem APIs;
- temporary directories;
- process execution with argument arrays;
- `try/finally` cleanup;
- Windows executable discovery;
- configuration and fallback behavior.

**Acceptance criteria:**

- VS Code or KDiff3 opens old and proposed content side-by-side.
- Closing the viewer returns to approval.
- The real file remains unchanged until Yes is selected.
- Missing viewer executable falls back to terminal preview and reports the problem.
- Temporary files are cleaned up.

### Milestone 6 — configuration, persistence, and policy expansion

**Status:** Pending.

**Possible settings:**

- enable/disable edit approval;
- enable/disable write approval;
- selected preview mode: terminal, VS Code, KDiff3;
- fail-closed behavior without UI;
- protected paths;
- maximum preview lines/bytes;
- allow-once versus reject;
- optional Bash mutation policy.

Start with hard-coded safe defaults. Add configuration only after core behavior is understood and tested.

### Milestone 7 — tests and packaging

**Status:** Pending.

**Goals:**

- Move pure logic into testable helper functions.
- Add tests for decision mapping and preview generation.
- Add TypeScript/editor project configuration if useful.
- Package the extension only after the local design stabilizes.

**Potential tests:**

- non-target tools are ignored;
- Yes allows;
- No blocks;
- Escape blocks;
- Others always blocks the original call;
- custom feedback is preserved;
- write preview handles missing/existing files;
- edit preview handles multiple replacements;
- no-UI mode blocks;
- paths with spaces work;
- temporary files are cleaned up;
- concurrent calls are serialized through the approval flow.

## First proposed implementation

The initial implementation discussed, but not yet written, is:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function changeApprovalExtension(pi: ExtensionAPI) {
    pi.on("tool_call", async function handleToolCall(event, ctx) {
        if (event.toolName !== "edit" && event.toolName !== "write") {
            return undefined;
        }

        const path = event.input.path as string;

        if (!ctx.hasUI) {
            return {
                block: true,
                reason: `${event.toolName} blocked because approval UI is unavailable`,
            };
        }

        const choice = await ctx.ui.select(
            `Approve ${event.toolName} operation?\n\nFile: ${path}`,
            ["Yes", "No", "Others"],
        );

        if (choice === "Yes") {
            return undefined;
        }

        if (choice === "Others") {
            const feedback = await ctx.ui.input(
                "What should Pi do instead?",
                "Write your instructions",
            );

            return {
                block: true,
                reason: feedback?.trim()
                    ? `User rejected this operation with feedback: ${feedback.trim()}`
                    : "User rejected this operation without additional feedback",
            };
        }

        return {
            block: true,
            reason: "User rejected this operation",
        };
    });
}
```

For the smallest teaching steps, this may be introduced first as Yes/No and then extended with Others rather than written all at once.

## Manual test strategy

Use a disposable test directory, not important source code.

Suggested files:

```text
approval-test/
├── existing.txt
└── expected-notes.md
```

Suggested prompts:

1. `Read existing.txt.`
   - Expected: no approval prompt.
2. `Change one word in existing.txt.`
   - Select No.
   - Expected: file remains unchanged.
3. Repeat and select Yes.
   - Expected: exact proposal executes.
4. Ask Pi to create `new.txt`.
   - Select No.
   - Expected: file is not created.
5. Repeat and select Others; write `Use the name revised.txt instead.`
   - Expected: original write is blocked; model proposes a new operation; new operation asks again.
6. Run Pi in print mode with the extension and request a write.
   - Expected: operation is blocked because no approval UI is available.

Before every test, record the initial file content or use Git so that changes are easy to verify and undo.

## Safety rules for implementation sessions

Until the extension itself is active and tested, the assistant working on this project should manually follow the intended workflow:

1. Explain each proposed edit/write.
2. Show the target path and proposed content/diff.
3. Ask for Yes, No, or Others.
4. Do not invoke edit/write until the user approves.

Additional rules:

- Do not modify the Argon source tree while developing the extension unless explicitly requested.
- Do not treat plan approval as blanket approval for all implementation milestones.
- Ask separately before each implementation change or clearly grouped change.
- Do not use Bash to bypass an edit/write permission rejection.
- Do not overwrite pre-existing work.
- Use disposable files for approval testing.

## Decisions recorded

1. **One logical extension, multiple modules later.**
2. **Begin with terminal UI, not external diff programs.**
3. **Use `tool_call` as the permission interception point.**
4. **Fail closed when approval cannot be requested.**
5. **Treat Escape/cancel as No.**
6. **`Others` blocks the original operation and sends feedback to the model.**
7. **Reuse Pi's existing edit preview first.**
8. **Add a true write diff later.**
9. **Do not fabricate semantic rationale from path/edit data.**
10. **Add a required concise `reason` through wrapped tools in a later milestone.**
11. **The finished extension will be global, meaning available to all Pi projects on each machine where it is installed.**
12. **Develop outside Argon in a machine-specific clone: `D:/others/Pi-Extension` on the Work Laptop and planned `D:/personal/Pi-Extension` on the Work Desktop.**
13. **Use `https://github.com/YousufAzadSami/Pi-Extension-Edit-Approval` as the canonical source shared by both machines.**
14. **Keep the canonical plan at `docs/learning-and-implementation-plan.md` in that repository and retain only a stable pointer in Argon.**
15. **Develop with explicit `pi -e` loading; install the stable package globally and separately on both machines.**
16. **No extension code is to be created merely because this plan was approved. Implementation still requires a separate explicit approval.**

## Open questions

Resolve these only when their milestone is reached:

1. Should permission apply only to built-in `edit`/`write`, or eventually to Bash/custom mutation tools too?
2. Should every operation always ask, or should future modes include allow-for-session/path?
3. Should `Others` use a single-line input or a multi-line editor?
4. Is the existing edit preview visible enough while `ctx.ui.select` is open?
5. Which external viewer is preferred: VS Code, KDiff3, or configurable order?
6. Should external-viewer launch be automatic or selected from the dialog?
7. Should approvals and rejections be persisted as TUI-only session entries for auditing?
8. Should write-to-new-file display complete content or a `/dev/null`-style unified diff?
9. How should very large or binary writes be represented?

## Session continuation checklist

At the beginning of a later session:

1. Read the canonical plan completely at `docs/learning-and-implementation-plan.md` in the extension repository.
2. Determine which machine is in use and locate its clone:
   - Work Laptop: `D:/others/Pi-Extension`;
   - Work Desktop: `D:/personal/Pi-Extension` (planned path; verify when first used).
3. Inspect the local clone for files created or changed since the plan was last updated.
4. Check Git status and pull/synchronize with the remote before continuing; never assume the other machine's work is already present.
5. Check current Pi version with `pi --version` because APIs may have changed independently on either machine.
6. Read the current installed Pi extension documentation if implementation is about to continue.
7. Inspect current Git/worktree state before modifying anything.
8. Identify the first milestone whose status is still Pending.
9. Explain that milestone and the exact proposed change.
10. Show the proposed edit/write.
11. Ask the user for **Yes**, **No**, or **Others**.
12. After implementation, update the canonical plan's status and record test results.

At the end of each implementation session, update:

- Current status;
- milestone status;
- files created or changed;
- commands used for testing;
- observed results;
- unresolved errors;
- next recommended action;
- any decisions that changed.

## Local Pi references consulted

Documentation:

- `C:/Users/Yousuf Azad/AppData/Local/pi-node/current/node_modules/@earendil-works/pi-coding-agent/docs/extensions.md`
- `C:/Users/Yousuf Azad/AppData/Local/pi-node/current/node_modules/@earendil-works/pi-coding-agent/docs/tui.md`
- `C:/Users/Yousuf Azad/AppData/Local/pi-node/current/node_modules/@earendil-works/pi-coding-agent/README.md`

Examples:

- `examples/extensions/permission-gate.ts`
- `examples/extensions/protected-paths.ts`
- `examples/extensions/question.ts`
- `examples/extensions/tool-override.ts`
- `examples/extensions/built-in-tool-renderer.ts`
- `examples/extensions/minimal-mode.ts`

Relevant installed implementation/type declarations inspected:

- `dist/core/tools/edit.js`
- `dist/core/tools/edit.d.ts`
- `dist/core/tools/edit-diff.d.ts`
- `dist/core/tools/write.js`
- `dist/core/tools/write.d.ts`
- `dist/core/extensions/types.d.ts`

## Next recommended action

Start **Milestone 0 / Milestone 1** by proposing the smallest `change-approval.ts` version that handles only edit/write Yes/No approval. Show the complete new file and explain every block before asking permission to create it.
