import {
    isToolCallEventType,
    type ExtensionAPI,
    type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const DEBUG_ENABLED: boolean = true;

function debugNotify(ctx: ExtensionContext, message: string): void {
    if (!DEBUG_ENABLED || !ctx.hasUI) {
        return;
    }

    ctx.ui.notify(`SAMI: ${message}`, "info");
}

type ApprovalDecision =
    | { choice: "yes" }
    | { choice: "no" }
    | { choice: "other"; feedback?: string }
    | { choice: "cancelled" };

async function askForDecision(
    ctx: ExtensionContext,
    title: string,
    feedbackPrompt: string,
): Promise<ApprovalDecision> {
    const choice = await ctx.ui.select(title, ["Yes", "No", "Other"]);

    if (choice === "Yes") {
        return { choice: "yes" };
    }

    if (choice === "Other") {
        const feedback = await ctx.ui.input(
            feedbackPrompt,
            "Write your instructions",
        );
        const trimmedFeedback = feedback?.trim();

        return {
            choice: "other",
            feedback: trimmedFeedback || undefined,
        };
    }

    if (choice === "No") {
        return { choice: "no" };
    }

    return { choice: "cancelled" };
}

export default function changeApprovalExtension(pi: ExtensionAPI) {
    const pendingEditRejections = new Map<string, string[]>();

    pi.on("tool_call", async function handleToolCall(event, ctx) {

        let path: string;

        if (isToolCallEventType("edit", event)) {
            path = event.input.path;
        } else if (isToolCallEventType("write", event)) {
            path = event.input.path;
        } else {
            // Sami: How can I print the other toolNames here? For debug and learning purposes
            debugNotify(ctx, `Ignoring tool: ${event.toolName}`);
            return undefined;
        }

        // Sami: Same for path, I would like to see the Path
        debugNotify(ctx, `Target path: ${path}`);

        if (!ctx.hasUI) {
            return {
                block: true,
                reason: `${event.toolName} blocked because approval UI is unavailable`,
            };
        }

        // For edit tool calls
        if (isToolCallEventType("edit", event)) {
            const approvedEdits: typeof event.input.edits = [];
            const rejectionReasons: string[] = [];

            for (const [index, edit] of event.input.edits.entries()) {
                const editNumber = index + 1;
                const decision = await askForDecision(
                    ctx,
                    `Approve edit ${editNumber} of ${event.input.edits.length}?\n\nFile: ${path}\n\nOld text:\n${edit.oldText}\n\nNew text:\n${edit.newText}`,
                    `What should Pi do instead for edit ${editNumber}?`,
                );

                if (decision.choice === "yes") {
                    approvedEdits.push(edit);
                    continue;
                }

                if (decision.choice === "other") {
                    rejectionReasons.push(decision.feedback
                        ? `Edit ${editNumber} rejected with feedback: ${decision.feedback}`
                        : `Edit ${editNumber} rejected without additional feedback`);
                    continue;
                }

                if (decision.choice === "no") {
                    rejectionReasons.push(`Edit ${editNumber} rejected by the user`);
                    continue;
                }

                rejectionReasons.push(`Edit ${editNumber} approval was cancelled`);
            }

            if (approvedEdits.length === 0) {
                return {
                    block: true,
                    reason: `No edit entries were approved:\n${rejectionReasons.join("\n")}`,
                };
            }

            if (rejectionReasons.length > 0) {
                pendingEditRejections.set(event.toolCallId, rejectionReasons);
            }

            event.input.edits = approvedEdits;
            return undefined;
        }

        // For write tool calls
        const decision = await askForDecision(
            ctx,
            `Approve ${event.toolName} operation?\n\nFile: ${path}`,
            "What should Pi do instead?",
        );

        if (decision.choice === "yes") {
            return undefined;
        }

        if (decision.choice === "other") {
            return {
                block: true,
                reason: decision.feedback
                    ? `User rejected this operation with feedback: ${decision.feedback}`
                    : "User rejected this operation without additional feedback",
            };
        }

        return {
            block: true,
            reason: "User rejected this operation",
        };
    });

    pi.on("tool_result", function handleToolResult(event, ctx) {

        debugNotify(
            ctx,
            `Received tool result: ${event.toolName} (${event.toolCallId})`,
        );

        const rejectionReasons = pendingEditRejections.get(event.toolCallId);

        if (!rejectionReasons) {
            return undefined;
        }

        debugNotify(
            ctx,
            `Adding ${rejectionReasons.length} rejection reason(s) to ${event.toolName} result`,
        );

        pendingEditRejections.delete(event.toolCallId);

        return {
            content: [
                ...event.content,
                {
                    type: "text",
                    text: `The following proposed edit entries were not approved and were not applied:\n${rejectionReasons.join("\n")}`,
                },
            ],
        };
    });
}