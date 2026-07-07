import { query, mutation } from "../_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthenticatedUser } from "../lib/auth";
import { getNicknameOwner, getProfileByAccountId } from "../lib/profiles";

/**
 * Returns the PHP account id from the validated JWT, or null if the
 * request is not authenticated. This replaces the previous `currentUserId`
 * (Id<"users">) that depended on Convex Auth.
 */
export const currentAccountId = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    return identity ? identity.subject : null;
  },
});

export const currentProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    return await getProfileByAccountId(ctx.db, identity.subject);
  },
});

export const isNicknameTaken = query({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const existing = await getNicknameOwner(ctx.db, args.nickname);
    return existing !== null;
  },
});

/**
 * Secret-gated upsert called by `POST /api/auth/sync-profile`.
 *
 * The Next.js route fetches fresh profile data from PHP (using the
 * httpOnly PHPSESSID cookie + INTERNAL_API_KEY), then calls this
 * mutation with the result. Two trust controls (defense in depth):
 *
 * 1. `CONVEX_SYNC_SECRET` — a dedicated shared secret that proves the
 *    call originated from the trusted server route, not the browser.
 * 2. JWT identity check — `ctx.auth.getUserIdentity().subject` must
 *    match `accountId`, so even a leaked secret cannot write to
 *    arbitrary profiles.
 *
 * `nickname` mirrors the PHP `username` (falling back to `name`) and is
 * refreshed on every sync so it always reflects the upstream account.
 */
export const upsertFromPhp = mutation({
  args: {
    secret: v.string(),
    accountId: v.string(),
    email: v.optional(v.string()),
    nickname: v.optional(v.string()),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    amount: v.optional(v.string()),
    verified: v.optional(v.boolean()),
    subscription: v.optional(
      v.object({
        packageId: v.number(),
        from: v.optional(v.string()),
        to: v.optional(v.string()),
        active: v.boolean(),
      }),
    ),
  },
  handler: async (
    ctx,
    { secret, accountId, nickname: phpNickname, ...fields },
  ) => {
    if (secret !== process.env.CONVEX_SYNC_SECRET) {
      throw new ConvexError("Forbidden");
    }

    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== accountId) {
      throw new ConvexError("Identity mismatch");
    }

    const now = Date.now();
    const existing = await getProfileByAccountId(ctx.db, accountId);

    const nickname =
      phpNickname?.trim() || fields.name?.trim() || `Player-${accountId}`;

    if (existing) {
      await ctx.db.patch(existing._id, { ...fields, nickname, updatedAt: now });
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      accountId,
      ...fields,
      nickname,
      verified: fields.verified ?? true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateNickname = mutation({
  args: { nickname: v.string() },
  handler: async (ctx, args) => {
    const profileId = await getAuthenticatedUser(ctx);
    const profile = await ctx.db.get(profileId);
    if (!profile) {
      throw new ConvexError("Profile not found");
    }

    const owner = await getNicknameOwner(ctx.db, args.nickname);
    if (owner && owner._id !== profile._id) {
      throw new ConvexError("Nickname is already taken");
    }

    await ctx.db.patch(profile._id, {
      nickname: args.nickname,
      updatedAt: Date.now(),
    });
  },
});
