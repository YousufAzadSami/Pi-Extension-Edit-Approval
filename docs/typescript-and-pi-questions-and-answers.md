# TypeScript and Pi extension questions and answers

This document records TypeScript, JavaScript, and Pi extension questions that came up while developing [`change-approval.ts`](../change-approval.ts).

## TypeScript types and asynchronous functions

### Is `type CustomType = { sampleString: "Test" }` a type alias?

Yes. `type` gives a name to a TypeScript type:

```ts
type CustomType = {
    sampleString: "Test";
};
```

Here, `"Test"` is a **string literal type**. The property can contain only that exact value:

```ts
const valid: CustomType = { sampleString: "Test" };
```

Use `string` when any string should be accepted:

```ts
type CustomType = {
    sampleString: string;
};
```

### What is `ApprovalDecision`?

[`ApprovalDecision`](../change-approval.ts#L17) is a type alias containing four possible object shapes:

```ts
type ApprovalDecision =
    | { choice: "yes" }
    | { choice: "no" }
    | { choice: "other"; feedback?: string }
    | { choice: "cancelled" };
```

The `|` symbol means **or**. A value of this type must be one of these variants:

```ts
{ choice: "yes" }
{ choice: "no" }
{ choice: "other", feedback: "Keep the existing name" }
{ choice: "cancelled" }
```

The `?` in `feedback?: string` means that feedback is optional.

The `choice` property is a **discriminator**. After checking it, TypeScript knows which variant is being used:

```ts
if (decision.choice === "other") {
    // TypeScript now knows that decision may contain feedback.
    console.log(decision.feedback);
}
```

### What does `Promise<ApprovalDecision>` mean?

The return type of [`askForDecision()`](../change-approval.ts#L23) is:

```ts
Promise<ApprovalDecision>
```

This means the asynchronous function will eventually produce an `ApprovalDecision`.

Without `await`, the result is still a Promise:

```ts
const pendingDecision = askForDecision(/* ... */);
// Type: Promise<ApprovalDecision>
```

With `await`, the Promise is resolved:

```ts
const decision = await askForDecision(/* ... */);
// Type: ApprovalDecision
```

An `async` function always returns a Promise. JavaScript automatically wraps an ordinary returned value such as `{ choice: "yes" }` in that Promise.

### Does `const` mean immutable in TypeScript/JavaScript? What happens without it?

Unlike a const object in C++, JavaScript and TypeScript `const` does **not** make an object immutable. It prevents the variable from referring to a different value.

For example, [`pendingEditRejections`](../change-approval.ts#L55) can be pictured like this:

```text
pendingEditRejections ───────► Map object
         const                   mutable
```

`const` locks the arrow, not the object.

The existing Map can still be changed:

```ts
const pendingEditRejections = new Map<string, string[]>();

pendingEditRejections.set("call-1", ["Rejected"]); // Allowed
pendingEditRejections.delete("call-1");             // Allowed
pendingEditRejections.clear();                       // Allowed
```

The variable cannot be assigned a different Map:

```ts
pendingEditRejections = new Map(); // TypeScript error
```

Using `let` would allow both kinds of change:

```ts
let pendingEditRejections = new Map<string, string[]>();

pendingEditRejections.set("call-1", ["Rejected"]); // Allowed
pendingEditRejections = new Map();                   // Also allowed
```

Replacing the Map would discard its stored rejection information. Because both event callbacks close over this variable, both callbacks would then see the replacement Map.

Using no declaration keyword is invalid TypeScript:

```ts
pendingEditRejections = new Map();
```

TypeScript reports that it cannot find the name. JavaScript modules also run in strict mode, where assigning to an undeclared variable causes a `ReferenceError`. Old non-strict JavaScript could accidentally create a global variable this way, but this should never be used.

Conceptually, JavaScript `const` with an object is closer to a constant C++ pointer to a mutable object:

```cpp
std::map<...>* const pendingEditRejections = &someMap;
```

The pointer cannot be redirected, but the pointed-to Map can be modified. It is not like declaring the C++ Map itself const:

```cpp
const std::map<...> pendingEditRejections;
```

The three JavaScript declaration keywords differ as follows:

| Keyword | Can reassign? | Scope | Modern recommendation |
|---|---:|---|---|
| `const` | No | Block | Use by default |
| `let` | Yes | Block | Use when reassignment is required |
| `var` | Yes | Function | Usually avoid |

Objects and arrays follow the same rule:

```ts
const settings = { enabled: true };
settings.enabled = false;             // Allowed
settings = { enabled: false };        // Not allowed

const entries = ["one"];
entries.push("two");                  // Allowed
entries = [];                          // Not allowed
```

The practical rule is: use `const` unless the variable must later receive a different value. The extension should keep the same shared Map while adding and deleting entries, so `const` is the correct declaration.

## `edit` and `write` approval behavior

### Why use `toolCallId` for mixed decisions but not for all-Yes decisions?

Every tool call has a `toolCallId`. The code needs to store data under that ID only when information must survive from `tool_call` to `tool_result`.

| Decisions | Behavior | Temporary Map entry? |
|---|---|---|
| All Yes | The normal result is sufficient | No |
| Some Yes and some No/Other | Approved entries execute, and rejection details must be added later | Yes |
| No Yes decisions | The call is blocked and reasons are returned immediately | No |

A single `toolCallId` identifies the complete edit call, not each individual entry.

## Functions and callbacks

### Is `changeApprovalExtension` a function?

Yes. [`changeApprovalExtension`](../change-approval.ts#L54) is the extension's main function:

```ts
export default function changeApprovalExtension(pi: ExtensionAPI) {
```

- `function` declares a function.
- `changeApprovalExtension` is its name.
- `pi` is its parameter.
- `ExtensionAPI` is the TypeScript type of `pi`.
- `export default` makes this function the file's main export.

Pi calls this function when it loads the extension. The function then registers handlers for events that may happen later.

### Are `handleToolCall` and `handleToolResult` also functions?

Yes. They are callback functions passed to `pi.on()`:

```ts
pi.on("tool_call", async function handleToolCall(event, ctx) {
    // Runs before a tool executes.
});

pi.on("tool_result", function handleToolResult(event, ctx) {
    // Runs after a tool executes.
});
```

`pi.on` is itself a function attached to the `pi` object. A function attached to an object is commonly called a **method**.

The two arguments supplied to `pi.on()` are:

1. the event name, such as `"tool_call"`;
2. the callback function that Pi should call later.

### Is `handleToolCall` a predefined name?

No. It is a name chosen by this extension.

This would also work:

```ts
pi.on("tool_call", async function approveProposedChanges(event, ctx) {
    // ...
});
```

The function could even be anonymous:

```ts
pi.on("tool_call", async function (event, ctx) {
    // ...
});
```

A descriptive name improves readability, debugging, and stack traces. Pi associates the callback with the event because it is passed to `pi.on()`, not because of its function name.

### Is `"tool_call"` a predefined variable?

It is predefined by Pi, but it is an **event name**, not a variable.

`"tool_call"` is a string literal recognized by the Pi extension API. It identifies the lifecycle point before a tool executes. At this point, a handler can inspect the request, modify its input, or block it.

`"tool_result"` is another predefined event name. It occurs after tool execution and allows a handler to modify the result.

The exact event name matters. An unknown name such as `"my_tool_call"` is not a Pi event.

### Where do `event` and `ctx` come from?

Pi creates them and passes them as arguments when it invokes the registered callback.

Conceptually, Pi performs a call similar to:

```ts
await handleToolCall(actualEventObject, actualContextObject);
```

The names `event` and `ctx` are chosen by us. Their positions determine which value they receive:

- the first parameter receives the event payload;
- the second parameter receives the context.

For `tool_call`, `event` includes values such as:

```ts
event.toolName
event.toolCallId
event.input
```

`ctx` provides services and session information such as:

```ts
ctx.hasUI
ctx.cwd
ctx.ui.select(...)
ctx.ui.input(...)
ctx.ui.notify(...)
```

### What else can Pi pass to a `pi.on()` event handler?

For `pi.on()` event handlers, the current Pi API passes exactly two positional arguments:

```ts
function handler(event, ctx)
```

It does not pass a third event-handler argument. The contents and TypeScript types of `event` and `ctx` can change according to the registered event name.

For example:

- a `tool_call` event contains tool input;
- a `tool_result` event contains tool output;
- a `session_start` event contains the reason the session started;
- most handlers receive `ExtensionContext`, while `project_trust` receives a smaller specialized context.

A handler may ignore an argument:

```ts
pi.on("session_start", function handleSessionStart(_event, ctx) {
    ctx.ui.notify("Session started", "info");
});
```

The underscore in `_event` is a convention meaning, “this parameter is intentionally unused.”

Other Pi APIs use different callback signatures. For example:

```ts
// Extension command callback:
handler(args, ctx)

// Custom tool execution callback:
execute(toolCallId, params, signal, onUpdate, ctx)
```

Those are separate APIs. Their parameters do not change the two-argument contract of `pi.on()` handlers.

## Event order in this extension

The main flow is:

```text
Pi loads the extension
        |
        v
changeApprovalExtension(pi) runs once
        |
        +-- registers handleToolCall
        |
        +-- registers handleToolResult

Later, the model requests a tool
        |
        v
handleToolCall(event, ctx) runs
        |
        v
The approved tool input executes
        |
        v
handleToolResult(event, ctx) runs
```

The two handlers can both access `pendingEditRejections` because it is declared inside `changeApprovalExtension` and outside both handlers. JavaScript keeps that shared outer value available to the inner functions. This behavior is called a **closure**.

## Debugging `tool_result`

The `tool_result` handler can use `ctx` with the existing `debugNotify()` helper:

```ts
debugNotify(
    ctx,
    `Received tool result: ${event.toolName} (${event.toolCallId})`,
);
```

Placed before the rejection lookup, it runs for every tool result. A second notification after the lookup can show when the extension actually appends rejection details.

Using `ctx.ui.notify()` through `debugNotify()` is safer for Pi's terminal interface than printing arbitrary output with `console.log()`.
