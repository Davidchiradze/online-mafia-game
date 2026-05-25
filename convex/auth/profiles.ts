import { query, mutation } from "../_generated/server";
import { v } from "convex/values";
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

export const getByAccountId = query({
  args: { accountId: v.string() },
  handler: async (ctx, args) => {
    return await getProfileByAccountId(ctx.db, args.accountId);
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
 * Idempotent upsert of the profile row for the authenticated user.
 *
 * Called once after Convex auth is established (see ProfileSyncBootstrap).
 * Source-of-truth for identity fields (email/username/name/avatar/role) is
 * the PHP backend; this mutation just mirrors the latest JWT claims into
 * the `profiles` table so game queries can resolve a stable `Id<"profiles">`.
 *
 * `nickname` is treated as a per-game display name. We seed it from
 * `username` (or `name`) on first sync, then leave it alone so users can
 * change it later via a future `updateNickname` flow without it being
 * overwritten on every login.
 */
export const syncCurrentProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const accountId = identity.subject;
    const claims = identity as unknown as {
      subject: string;
      email?: string;
      name?: string;
      username?: string;
      avatar?: string;
      role?: string;
    };

    const email = claims.email ?? undefined;
    const username = claims.username ?? undefined;
    const name = claims.name ?? undefined;
    const avatar = claims.avatar ?? undefined;
    const role = claims.role ?? undefined;

    const now = Date.now();
    const existing = await getProfileByAccountId(ctx.db, accountId);

    if (existing) {
      await ctx.db.patch(existing._id, {
        email,
        username,
        name,
        avatar,
        role,
        updatedAt: now,
      });
      return existing._id;
    }

    const fallbackNickname =
      (username && username.trim()) ||
      (name && name.trim()) ||
      `Player-${accountId}`;

    return await ctx.db.insert("profiles", {
      accountId,
      email,
      username,
      name,
      nickname: fallbackNickname,
      avatar,
      role,
      verified: true,
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
      throw new Error("Profile not found");
    }

    const owner = await getNicknameOwner(ctx.db, args.nickname);
    if (owner && owner._id !== profile._id) {
      throw new Error("Nickname is already taken");
    }

    await ctx.db.patch(profile._id, {
      nickname: args.nickname,
      updatedAt: Date.now(),
    });
  },
});
