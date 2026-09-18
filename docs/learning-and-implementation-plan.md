---
description: Incremental learning and implementation plan for a Pi extension that approves edit/write operations and previews proposed changes
tags: [pi, extension, typescript, permissions, edit, write, diff, vscode, learning-plan]
applies_to: [pi-coding-agent, personal-development-workflow]
status: in-progress
---

# Pi edit/write approval extension — learning and implementation plan

## At a glance

This is the roadmap and session handoff for a Pi extension that asks permission before changing files. Read it before continuing implementation.

| Item | Current state |
|---|---|
| Progress | Milestones 0–2 complete; Milestone 3 is in progress |
| Implementation | `change-approval.ts` |
| Canonical plan | `docs/learning-and-implementation-plan.md` |
| Repository | `https://github.com/YousufAzadSami/Pi-Extension-Edit-Approval` |
| Scope | Built-in tools named exactly `edit` and `write` |
| Deployment goal | One global Pi extension, installed separately on each machine |
| Pi version most recently observed | `0.85.1` on the current machine |

The extension now reviews each `edit` entry separately, applies the approved subset, and reports rejected entries to the model after partial execution. The Milestone 3A implementation is complete, but end-to-end manual testing is still pending.

### Repository and local checkouts

The GitHub repository is the canonical source. Documentation should prefer repository-relative paths because clone locations differ by machine.

Known local checkouts:

| Machine | Path |
|---|---|
| Current macOS machine | `/Users/sami/codes/Pi-Extension-Edit-Approval` |
| Work Laptop | `D:/others/Pi-Extension` |
| Work Desktop | `D:/personal/Pi-Extension-Edit-Approval` |

Verify these paths rather than assuming they still exist. Current development is on `Milestone-03`, based on `main`.

The extension is separate from the Argon product and must not be implemented in the Argon source tree. Any Argon handoff file should only point to this canonical plan, not duplicate it.

“Global” means available to all Pi projects for one user on one machine. It does not synchronize machines. Development should load a checkout explicitly; stable releases should be packaged and installed from the same Git source on every machine.

## Requirements

### Approval workflow

Whenever Pi requests `edit` or `write`:

1. Pause before execution.
2. Show the operation, target path, proposed change, and the model's concise reason for it.
3. Ask for one of:
   - **Yes** — execute that exact proposal.
   - **No** — reject it and do not retry it automatically.
   - **Other** — reject it, collect feedback, and let the model propose an alternative.

Escape or cancellation counts as **No**.

A multi-entry `edit` call is reviewed one entry at a time. Each answer affects only that entry:

- **Yes:** include the entry in the approved subset.
- **No:** leave the entry out and tell the model it was rejected.
- **Other:** leave the entry out and return the user's feedback to the model.

After all entries are reviewed, apply the approved subset together. For example, answers Yes/Other/No/Yes apply only entries 1 and 4.

### Safe meaning of `Other`

**Other rejects the proposal being reviewed, sends the user's feedback to the model, and requires approval for any replacement.**

The meaning of “proposal” depends on the tool:

- For `write`, the proposal is the complete file creation or replacement.
- For a multi-entry `edit`, each entry is reviewed as its own proposal. Rejecting one entry does not stop other entries approved with **Yes** from executing.

### Preview progression

1. Reuse Pi's built-in terminal rendering.
2. Add a clearer terminal diff only where needed.
3. Later offer an external comparison viewer, for example:
   - `code --diff <old-file> <new-file> --wait`
   - `kdiff3 <old-file> <new-file>`

### Security boundary

The initial extension intercepts only tools named `edit` and `write`. It does not stop mutations made through Bash, PowerShell, custom tools, or other extensions.

Possible later policy work includes mutating shell commands, custom tools, protected paths, paths outside the project, and allow-once/session modes. This extension is a workflow guard, **not** a security sandbox; extensions run with the user's normal system permissions.

## Learning approach

The project must teach three unfamiliar layers separately:

1. **TypeScript:** types, imports, object and union types, callbacks, optional values, `async`, and `await`.
2. **JavaScript/Node.js:** runtime modules, type-only imports, package resolution, `package.json`, dependencies, editor tooling, and how Pi loads TypeScript.
3. **Pi:** extension discovery, factory execution, callback registration, lifecycle events, contexts, UI, tool interception, and blocking return values.

Each milestone should use this loop:

1. Define the new concepts.
2. Make one small, visible change.
3. Predict the result.
4. Run and observe it.
5. Explain why it happened.
6. Resolve misunderstandings before continuing.

For each change, explain:

- what changes and why it is needed now;
- what is deliberately postponed;
- relevant TypeScript, Node.js, and Pi concepts;
- registration time versus handler execution time;
- important function inputs and outputs;
- how to test it and recognize success or failure; and
- how it connects to adjacent milestones.

Prefer runnable examples over large code dumps. Define unfamiliar terms, distinguish compile-time TypeScript types from runtime JavaScript values, and use C++ comparisons only where helpful while stating their limits. Do not advance merely because code runs; confirm that the user understands it.

## Confirmed Pi behavior

These findings were rechecked against the installed Pi `0.85.1` documentation and implementation. Recheck them after Pi upgrades.

### Extension registration and interception

An extension default-exports a factory that Pi calls with an `ExtensionAPI` object:

```ts
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function changeApprovalExtension(pi: ExtensionAPI) {
    pi.on("tool_call", async (event, ctx) => {
        // Registered now; executed later for each tool request.
    });
}
```

Pi loads TypeScript extensions through `jiti`, so a separate compile step is not required for normal loading. Runtime npm dependencies still need correct package configuration and installation.

The relevant lifecycle is:

```text
model requests tool
    → tool_execution_start
    → tool_call             permission gate runs here
    → execute only if allowed
    → tool result/end events
```

A `tool_call` handler controls execution as follows:

| Return | Result |
|---|---|
| `undefined` | Allow normal execution |
| `{ block: true, reason: "..." }` | Prevent execution and return the reason to the model |
| Throw | Pi blocks the call as a fail-safe |

Because the handler is asynchronous, Pi waits while `await ctx.ui.select(...)` or `input(...)` is open. Waiting for the Promise keeps the tool unexecuted; it does not freeze the operating system.

### UI and non-interactive modes

The first implementation uses:

```ts
await ctx.ui.select(title, ["Yes", "No", "Other"]);
await ctx.ui.input(title, placeholder);
ctx.ui.notify(message, "info");
```

Mode behavior:

| Mode | `ctx.hasUI` | Relevant behavior |
|---|---:|---|
| TUI | `true` | Dialogs and custom TUI components work |
| RPC | `true` | Basic dialogs use the UI protocol; `custom()` is unavailable |
| Print/JSON | `false` | Cannot ask for approval |

The permission gate must fail closed when `ctx.hasUI` is false. TUI-specific work must additionally check `ctx.mode === "tui"`.

### Parallel calls and file mutation

In Pi's default parallel mode, sibling tool calls are preflighted sequentially, so approval questions appear one at a time. Calls that pass preflight may then execute concurrently.

Built-in `edit` and `write` use Pi's shared per-file mutation queue. A future wrapper must delegate to those implementations or use `withFileMutationQueue()` so same-file mutations remain serialized.

### Existing previews

Pi already renders proposals before execution:

- **`edit`:** reads the target, applies replacements in memory, computes a display diff, and shows it in the tool-call row without writing the file.
- **`write`:** shows proposed content with syntax highlighting where possible. Collapsed output shows up to ten lines; the normal tool-expansion key shows more.

`write` does not compare proposed content with an existing file, so a true old/new write diff remains necessary. Milestone 3 must also test whether the transcript preview remains visible enough while the approval selector is open.

### Why the model's reason is unavailable today

Built-in arguments contain only the operation:

```ts
// edit
{ path: string, edits: Array<{ oldText: string, newText: string }> }

// write
{ path: string, content: string }
```

They do not contain semantic motivation. A `tool_call` listener can describe the operation and why approval is required, but it cannot truthfully infer the model's reason. Do not present a fabricated generic sentence as the model's rationale.

Milestone 4 should override/wrap the built-in tools with schemas that add a required concise `reason`. This is a user-facing justification, not private chain-of-thought. Example:

> Add an empty-input check so the parser does not access the first character of an empty string.

When overriding built-ins:

- delegate to `createEditTool()` and `createWriteTool()`;
- preserve exact result shapes and the built-in mutation queue;
- cache delegates by `ctx.cwd`;
- rely on built-in renderer inheritance where practical; and
- explicitly preserve prompt metadata, because `promptSnippet` and `promptGuidelines` are not inherited.

Label the value as the **model's stated reason**, not verified truth.

## Architecture and deployment

Keep one logical extension because approval policy, rationale, previews, and viewer integration form one workflow. Start with one file and split it only as complexity grows.

Current layout:

```text
<local-clone>/
├── change-approval.ts
└── docs/
    └── learning-and-implementation-plan.md
```

Possible mature layout:

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

The extra files remain modules of one extension loaded through `index.ts`.

Use a disposable workspace during development:

```bash
cd test-workspace
pi --no-extensions -e ./change-approval.ts
```

Explicit `-e` loading prevents experimental behavior from affecting ordinary sessions. After stabilization, add package metadata and install the Git package globally on each machine.

## Current implementation

`change-approval.ts` currently:

- registers `tool_call` and `tool_result` listeners;
- ignores tools other than `edit` and `write` during approval;
- uses `isToolCallEventType()` to narrow built-in tool inputs safely;
- uses one shared helper for Yes/No/Other decisions and feedback;
- keeps one whole-operation Yes/No/Other prompt for `write`;
- reviews every `edit` entry in order and shows its old and new text;
- applies the approved subset for mixed Yes/No/Other decisions;
- blocks an `edit` when no entry is approved and returns all decision details;
- stores partial rejection summaries in a `Map` keyed by `toolCallId`;
- appends those summaries to the matching tool result and then removes the temporary state;
- fails closed when no UI is available; and
- has `DEBUG_ENABLED = true` for learning notifications, including every tool result.

Not yet implemented or verified:

- end-to-end manual testing of mixed edit decisions and model-visible summaries;
- a combined approval-and-preview component;
- an old/new `write` diff;
- required model rationale;
- external viewers;
- configuration;
- automated tests; or
- package metadata/global installation.

## Milestones

Complete, explain, and test one milestone before starting the next.

### Milestone 0 — learning workspace

**Status:** Complete.

Created the minimal `change-approval.ts` extension and learned TypeScript modules, `import type`, default exports, parameter typing, registration versus execution, and `pi -e` loading.

**Verified:** Pi loaded the extension without TypeScript/runtime errors.

### Milestone 1 — Yes/No gate

**Status:** Complete.

Implemented target-tool guards, asynchronous selection, allow/block return values, cancellation as rejection, and fail-closed no-UI behavior.

**Manual test record:** Read/non-target handling and approved/rejected `write` and `edit` calls were verified. Approved operations executed; rejected operations left targets unchanged. The no-UI path was deferred.

### Milestone 2 — `Other` feedback

**Status:** Complete.

Added nested input, optional values, optional chaining, trimming, conditional reasons, and safe rejection semantics.

**Manual test record:** Empty or cancelled input blocked without feedback. Non-empty feedback reached the model; the model proposed a revision; the revision prompted again and executed only after a later **Yes**.

### Milestone 3 — per-entry edit approval and terminal previews

**Status:** In progress.

**Goal:** Review each proposed edit clearly, apply only approved entries, and report every decision to the model.

#### 3A — per-entry `edit` decisions

Implemented:

1. Narrow `edit` and `write` events with `isToolCallEventType()`.
2. Use a shared helper for Yes/No/Other decisions.
3. Review each item in `event.input.edits` in order.
4. Collect entries approved with **Yes**.
5. Exclude entries rejected with **No**, **Other**, or cancellation.
6. Replace `event.input.edits` with the approved subset before execution.
7. Block the call and return all decision details when no entry is approved.
8. Store partial rejection summaries by `toolCallId`.
9. Append those summaries in `tool_result` and remove the temporary state.

Manual verification still needed:

1. Confirm all-Yes execution.
2. Confirm Yes/No/Yes partial execution and model-visible rejection details.
3. Confirm Yes/Other/No/Yes applies only entries 1 and 4 and returns the feedback.
4. Confirm all-rejected calls are blocked and leave the file unchanged.

The model-facing summary must distinguish:

- **No:** rejected; do not retry automatically.
- **Other:** rejected with feedback; a revised proposal may be made as a new approval request.

If every entry is rejected, return the summaries in the blocking reason because no tool result will follow.

#### 3B — terminal preview quality

1. Test the built-in pre-execution diff for valid `edit` calls.
2. Test expanded `write` content for new and existing files.
3. Check preview visibility while `ctx.ui.select` is open.
4. If needed, build a custom TUI component with a size-limited or scrollable preview.
5. Add a true old/new diff for existing-file `write` operations.

Teach typed narrowing, arrays, filtering, mutable tool arguments, `toolCallId` correlation, temporary `Map` state, custom components, width-safe rendering, and in-memory previews.

**Done when:** each edit decision affects only its entry; approved entries execute together; rejected entries remain unchanged; the model receives a clear mixed-result summary; proposals are visible before approval; and large previews remain usable.

### Milestone 4 — required rationale

**Status:** Pending.

**Goal:** Reliably show why the model says the operation is needed.

Likely design:

1. Register replacement tools named `edit` and `write` with their original fields plus required `reason`.
2. Delegate execution to built-ins created with `createEditTool()` and `createWriteTool()`.
3. Preserve built-in results, rendering, prompt metadata, and mutation behavior.
4. Use the correct delegate for the current `ctx.cwd`.

Teach TypeBox schemas, overriding, delegation, structural typing, and runtime values versus TypeScript-only types.

**Done when:** calls without a valid reason fail schema validation; the stated reason appears in the approval UI; Yes delegates; No/Other do not; built-in behavior remains intact; and the UI does not imply the reason is verified.

### Milestone 5 — external diff viewer

**Status:** Pending.

**Goal:** Optionally inspect old and proposed content in VS Code or KDiff3.

Process:

1. Read the target without modifying it.
2. Compute proposed content in memory;
3. write clearly named old/new snapshots to an extension-owned temporary directory;
4. launch the viewer with argument arrays;
5. wait when supported;
6. return to approval; and
7. clean up in `finally` after success, cancellation, or failure.

Never pass the real target as an editable preview file. Handle spaces without shell-string concatenation. Viewer failure must report the problem, fall back to terminal preview, and never imply approval.

Teach Node.js filesystem APIs, temporary directories, child processes, `try/finally`, Windows executable discovery, configuration, and fallback behavior.

### Milestone 6 — configuration and policy

**Status:** Pending.

Start with hard-coded safe defaults. Add settings only after the core behavior is understood and tested.

Candidates:

- per-tool approval switches;
- terminal/VS Code/KDiff3 preview mode;
- no-UI policy;
- protected paths;
- preview byte/line limits;
- allow-once/session behavior; and
- optional shell-mutation policy.

### Milestone 7 — tests and packaging

**Status:** Pending.

Move pure decision and preview logic into testable functions. Add tests, TypeScript/editor configuration where useful, package metadata, and global-install instructions only after the design stabilizes.

Test backlog:

- non-target tools are ignored;
- whole-operation `write` Yes/No/Other behavior;
- multi-entry edit: all Yes;
- multi-entry edit: Yes/No/Yes;
- multi-entry edit: Yes/Other/No/Yes;
- all edit entries rejected;
- rejection summaries reach the model and temporary state is cleaned up;
- missing and existing-file write previews;
- no-UI failure;
- paths with spaces;
- preview size limits;
- temporary-file cleanup; and
- serialized approval/concurrent mutation behavior.

## Manual test matrix

Use disposable files or Git so every change can be inspected and undone.

| Prompt/action | Expected result |
|---|---|
| Read `existing.txt` | No approval prompt |
| Edit it; choose No | File unchanged |
| Repeat; choose Yes | Exact proposal executes |
| Multi-entry edit; choose Yes/No/Yes | Only entries 1 and 3 execute; the model sees that entry 2 was rejected |
| Multi-entry edit; choose Yes/Other/No/Yes | Only entries 1 and 4 execute; the model receives feedback for entry 2 and rejection status for entry 3 |
| Reject every edit entry | Complete call is blocked; file is unchanged |
| Create `new.txt`; choose No | File not created |
| Choose Other for a write and request a different filename | Original write is rejected; revised write prompts again |
| Request a write in print mode | Blocked because approval UI is unavailable |

Before each test, record initial content. Include both new and existing files when testing `write` previews.

## Implementation safety rules

Until the extension is active and verified in the current session, manually follow its intended policy:

1. Explain the proposed change.
2. Show the target and proposed content or diff.
3. Ask for **Yes**, **No**, or **Other**.
4. Do not edit or write until approved.

Also:

- approval of this plan is not blanket approval for future milestones;
- ask separately for each change or clearly grouped change;
- never use Bash to bypass a rejected file operation;
- do not overwrite pre-existing work;
- keep experiments outside Argon; and
- use disposable files for approval testing.

## Durable decisions

1. One logical extension; multiple modules only when useful.
2. Begin with Pi's terminal UI and existing preview.
3. Gate execution at `tool_call` and fail closed when approval is unavailable.
4. Treat Escape as No. `Other` rejects the proposal being reviewed and returns optional guidance; approved sibling entries in a multi-entry `edit` may still execute.
5. Add a genuine old/new `write` diff later.
6. Never fabricate semantic rationale; require a concise stated reason through wrapped tools.
7. Intercepting only `edit`/`write` is intentional initial scope, not sandboxing.
8. Keep GitHub as canonical source and use repository-relative documentation.
9. Develop with explicit `pi -e`; package and install globally per machine only when stable.
10. Plan approval never grants automatic approval for implementation changes.

## Open questions

Resolve these only in the relevant milestone:

1. Expand policy to shell/custom mutation tools?
2. Always ask, or add allow-for-session/path modes?
3. Single-line or multi-line input for `Other`?
4. Is the built-in edit preview visible enough during selection?
5. Prefer VS Code, KDiff3, or a configurable order?
6. Launch external viewers automatically or from the dialog?
7. Persist approval/rejection audit entries in the TUI session?
8. Show new-file writes as full content or `/dev/null`-style diffs?
9. How should binary or very large writes be represented?

## Session continuation checklist

At the start of a session:

1. Read this file.
2. Locate the current clone and inspect Git status; do not assume another machine's work is synchronized.
3. Pull/synchronize deliberately without overwriting local work.
4. Run `pi --version` and reread installed Pi docs before relying on API details.
5. Inspect current source rather than assuming this plan is perfectly current.
6. Select the first pending milestone and explain its concepts, exact change, and test.
7. Show the proposed edit and request **Yes**, **No**, or **Other**.

At the end, update current status, milestone/test records, changed files, commands and results, unresolved errors, changed decisions, and the next action.

## Pi references

Read installed copies because APIs can change:

Documentation:

- `README.md`
- `docs/extensions.md`
- `docs/tui.md`
- `docs/packages.md`

Examples:

- `examples/extensions/permission-gate.ts`
- `examples/extensions/protected-paths.ts`
- `examples/extensions/question.ts`
- `examples/extensions/tool-override.ts`
- `examples/extensions/built-in-tool-renderer.ts`
- `examples/extensions/minimal-mode.ts`

Relevant implementation/type declarations:

- `dist/core/tools/edit.js` and `edit.d.ts`
- `dist/core/tools/edit-diff.js`
- `dist/core/tools/write.js` and `write.d.ts`
- `dist/core/tools/renderers/edit.js`
- `dist/core/tools/renderers/write.js`
- `dist/core/tools/file-mutation-queue.js`
- `dist/core/extensions/types.d.ts`

## Next action

Resume Milestone 3A with end-to-end manual testing in a disposable workspace. Test all Yes, Yes/No/Yes, Yes/Other/No/Yes, and all-rejected flows. Confirm that only approved entries change the file, the model receives every rejection summary, and temporary `Map` state is removed. Record the results here before starting Milestone 3B preview work.
