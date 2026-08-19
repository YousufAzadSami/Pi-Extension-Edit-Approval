import type {
    ExtensionAPI,
    ExtensionContext,
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

        if (event.toolName !== "edit" && event.toolName !== "write") {

            // Sami: How can I print the other toolNames here? For debug and learning purposes
            debugNotify(ctx, `Ignoring tool: ${event.toolName}`);

            return undefined;
        }

        const path = event.input.path as string;
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
            ["Yes", "No"],
        );

        if (choice === "Yes") {
            return undefined;
        }

        return {
            block: true,
            reason: "User rejected this operation",
        };
    });
}