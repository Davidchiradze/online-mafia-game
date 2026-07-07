import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "../_generated/server";
import {
  getAuthenticatedProfile,
  requirePermission,
} from "../lib/auth";
import { writeAudit } from "../lib/admin";
import {
  PERMISSIONS,
  accessRoleValidator,
  getPermissionsForRole,
  normalizeRole,
  type AccessRole,
  type Permission,
} from "../lib/access";
import type { Id } from "../_generated/dataModel";

/**
 * The caller's own access info. Used by the frontend (`useAccess`) and by
 * actions that need to authorize via `ctx.runQuery` (e.g. the refund action).
 */
export const myAccess = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    accountId: string | null;
    profileId: Id<"profiles"> | null;
    role: AccessRole;
    permissions: readonly Permission[];
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        accountId: null,
        profileId: null,
        role: "user",
        permissions: [],
      };
    }
    const profile = await getAuthenticatedProfile(ctx);
    const role = normalizeRole(profile.role);
    return {
      accountId: profile.accountId,
      profileId: profile._id,
      role,
      permissions: getPermissionsForRole(role),
    };
  },
});

/**
 * Paginated user list for the admin panel. Requires USER_VIEW.
 * With a `search` term, matches nicknames via the full-text index; otherwise
 * lists everyone newest-first.
 */
export const listUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    filter: v.optional(
      v.union(
        v.literal("admins"),
        v.literal("moderators"),
        v.literal("subscribers"),
        v.literal("banned"),
      ),
    ),
  },
  handler: async (ctx, { paginationOpts, search, filter }) => {
    await requirePermission(ctx, PERMISSIONS.USER_VIEW);

    const term = search?.trim();
    const base = term
      ? ctx.db
          .query("profiles")
          .withSearchIndex("search_nickname", (q) =>
            q.search("nickname", term),
          )
      : ctx.db.query("profiles").order("desc");

    // Narrow to the selected group. `.filter()` composes with both the search
    // index and `.order("desc")`, and is fine at admin-only data volume.
    const filtered = filter
      ? base.filter((q) => {
          if (filter === "admins") return q.eq(q.field("role"), "admin");
          if (filter === "moderators")
            return q.eq(q.field("role"), "moderator");
          if (filter === "subscribers")
            return q.eq(q.field("subscription.active"), true);
          return q.neq(q.field("bannedAt"), undefined); // banned
        })
      : base;

    const result = await filtered.paginate(paginationOpts);

    return {
      ...result,
      page: result.page.map((p) => ({
        _id: p._id,
        accountId: p.accountId,
        nickname: p.nickname,
        email: p.email,
        avatar: p.avatar,
        role: normalizeRole(p.role),
        bannedAt: p.bannedAt ?? null,
        banReason: p.banReason ?? null,
        subscription: p.subscription ?? null,
        createdAt: p.createdAt,
      })),
    };
  },
});

/** Promote/demote a user's access role. Requires ROLE_ASSIGN. */
export const assignRole = mutation({
  args: { targetProfileId: v.id("profiles"), role: accessRoleValidator },
  handler: async (ctx, { targetProfileId, role }) => {
    const actor = await requirePermission(ctx, PERMISSIONS.ROLE_ASSIGN);

    const target = await ctx.db.get(targetProfileId);
    if (!target) {
      throw new ConvexError({ code: "USER_NOT_FOUND", message: "User not found" });
    }
    if (target._id === actor._id) {
      throw new ConvexError({
        code: "CANNOT_CHANGE_OWN_ROLE",
        message: "You cannot change your own role.",
      });
    }

    const previousRole = normalizeRole(target.role);
    await ctx.db.patch(targetProfileId, { role, updatedAt: Date.now() });
    await writeAudit(ctx, actor._id, "role.assign", targetProfileId, {
      previousRole,
      newRole: role,
    });
  },
});

/** Ban or unban a user. Requires USER_BAN. */
export const setBanned = mutation({
  args: {
    targetProfileId: v.id("profiles"),
    banned: v.boolean(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { targetProfileId, banned, reason }) => {
    const actor = await requirePermission(ctx, PERMISSIONS.USER_BAN);

    const target = await ctx.db.get(targetProfileId);
    if (!target) {
      throw new ConvexError({ code: "USER_NOT_FOUND", message: "User not found" });
    }
    if (target._id === actor._id) {
      throw new ConvexError({
        code: "CANNOT_BAN_SELF",
        message: "You cannot ban yourself.",
      });
    }

    await ctx.db.patch(targetProfileId, {
      bannedAt: banned ? Date.now() : undefined,
      banReason: banned ? reason : undefined,
      updatedAt: Date.now(),
    });
    await writeAudit(
      ctx,
      actor._id,
      banned ? "user.ban" : "user.unban",
      targetProfileId,
      { reason: reason ?? null },
    );
  },
});
