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

export default function changeApprovalExtension(pi: ExtensionAPI) {
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

        const choice = await ctx.ui.select(
            `Approve ${event.toolName} operation?\n\nFile: ${path}`,
            ["Yes", "No", "Other"],
        );

        if (choice === "Yes") {
            return undefined;
        }

        if (choice === "Other") {
            const feedback = await ctx.ui.input(
                "What should Pi do instead?",
                "Write your instructions",
            );

            const trimmedFeedback = feedback?.trim();

            return {
                block: true,
                reason: trimmedFeedback
                    ? `User rejected this operation with feedback: ${trimmedFeedback}`
                    : "User rejected this operation without additional feedback",
            };
        }

        return {
            block: true,
            reason: "User rejected this operation",
        };
    });
}