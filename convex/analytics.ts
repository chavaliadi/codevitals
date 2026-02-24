import { mutation } from "./_generated/server";
import { v } from "convex/values";

// ─── Log a simple event ───────────────────────────────────────────────────────

export const logEvent = mutation({
    args: {
        event: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("AnalyticsTable", {
            event: args.event,
            timestamp: Date.now(),
        });
    },
});
