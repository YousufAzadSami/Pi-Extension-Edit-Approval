import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function changeApprovalExtension(pi: ExtensionAPI) {
    pi.on("tool_call", async function handleToolCall(event, ctx) {
        // What other event.toolName are there? 
        // What is the diff between edit and write? 
        if (event.toolName !== "edit" && event.toolName !== "write") {
            // How can I print the other toolNames here? For debug and learning purposes
            return undefined;
        }

        const path = event.input.path as string;
        // Same for path, I would like to see the Path 

        if (!ctx.hasUI) {
            //  When can this happen?
            return {
                block: true,
                reason: `${event.toolName} blocked because approval UI is unavailable`,
            };
        }

        // ctx.ui.select - What is select? 
        const choice = await ctx.ui.select(
            `Approve ${event.toolName} operation?\n\nFile: ${path}`,
            ["Yes", "No"],
        );

        if (choice === "Yes") {
            return undefined;
        }

        // is reason a variable known by Pi? What type is it? Who receives it and how is it processed? 
        return {
            block: true,
            reason: "User rejected this operation",
        };
    });
}