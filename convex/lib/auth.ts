import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Returns the external PHP `accounts.id` from the validated JWT.
 * Throws if the request is not authenticated.
 *
 * The id arrives in the JWT `sub` claim (always a string per RFC 7519)
 * and is stored on `profiles.accountId`.
 */
export async function getAuthenticatedAccountId(
  ctx: QueryCtx | MutationCtx,
): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ code: "NOT_AUTHENTICATED", message: "Not authenticated" });
  }
  return identity.subject;
}

/**
 * Returns the profile id (`Id<"profiles">`) for the authenticated user.
 * This is the app-level identity used as a foreign key in all game tables.
 *
 * Signature is intentionally preserved from the previous Convex-Auth
 * implementation so existing call sites (`convex/game/**`, `convex/lobby/**`)
 * do not change.
 */
export async function getAuthenticatedUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Id<"profiles">> {
  const accountId = await getAuthenticatedAccountId(ctx);
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
    .unique();
  if (!profile) {
    throw new ConvexError({ code: "PROFILE_SYNC_REQUIRED", message: "Profile not found. Please complete profile sync." });
  }
  return profile._id;
}
