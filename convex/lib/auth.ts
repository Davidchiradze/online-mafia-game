import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Returns the Convex Auth user ID (Id<"users">).
 * Use only when you need the raw auth identity (e.g. profile lookups).
 */
export async function getAuthenticatedUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Not authenticated");
  }
  return userId;
}

/**
 * Returns the profile ID (Id<"profiles">) for the authenticated user.
 * This is the app-level identity used as foreign key in all game tables.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"profiles">> {
  const authUserId = await getAuthenticatedUserId(ctx);
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", authUserId))
    .unique();
  if (!profile) {
    throw new Error("Profile not found. Please complete your profile setup.");
  }
  return profile._id;
}
