import { ConvexError } from "convex/values";
import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import {
  type AccessRole,
  type Permission,
  normalizeRole,
  roleHasPermission,
} from "./access";

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
  return (await getAuthenticatedProfile(ctx))._id;
}

/**
 * Returns the full authenticated profile document.
 * Throws if not authenticated or the profile has not been synced yet.
 */
export async function getAuthenticatedProfile(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"profiles">> {
  const accountId = await getAuthenticatedAccountId(ctx);
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_accountId", (q) => q.eq("accountId", accountId))
    .unique();
  if (!profile) {
    throw new ConvexError({ code: "PROFILE_SYNC_REQUIRED", message: "Profile not found. Please complete profile sync." });
  }
  return profile;
}

/**
 * Authoritative permission gate. Call at the start of any admin/moderation
 * mutation or query. Throws `FORBIDDEN` if the user's role lacks `permission`.
 * Returns the profile so the handler can reuse it.
 */
export async function requirePermission(
  ctx: QueryCtx | MutationCtx,
  permission: Permission,
): Promise<Doc<"profiles">> {
  const profile = await getAuthenticatedProfile(ctx);
  if (!roleHasPermission(profile.role, permission)) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have permission to perform this action.",
    });
  }
  return profile;
}

/** Authoritative role gate (prefer `requirePermission` for capability checks). */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  role: AccessRole,
): Promise<Doc<"profiles">> {
  const profile = await getAuthenticatedProfile(ctx);
  if (normalizeRole(profile.role) !== role) {
    throw new ConvexError({
      code: "FORBIDDEN",
      message: "You do not have the required role for this action.",
    });
  }
  return profile;
}
