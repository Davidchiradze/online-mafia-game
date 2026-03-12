import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { getAuthenticatedUser } from "../lib/auth";
import { getGameById, assertIsHost } from "../lib/games";
import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "../lib/constants";

/**
 * Get player roles filtered by team visibility.
 * Reactive: auto-updates when roles change or game finishes.
 *
 * Visibility rules:
 * - Game finished → everyone sees all roles
 * - Own role → always visible
 * - Host → sees all roles
 * - Mafia team (DON, MAFIA, MAFIA_RIGHT_HAND) → see each other
 * - Yakuza team (YAKUZA, SHOGUN) → see each other
 * - Everyone else → null
 */
export const getVisible = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await getGameById(ctx.db, gameId);

    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();

    const isGameFinished = session?.isFinished ?? false;
    const isHost = game.hostId === userId;

    const allRoles = await ctx.db
      .query("gamePlayerRoles")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();

    const requestingRole =
      allRoles.find((r) => r.playerId === userId)?.role ?? null;

    const roles = allRoles.map((roleDoc) => {
      let canSeeRole = false;

      if (isGameFinished) {
        canSeeRole = true;
      } else if (roleDoc.playerId === userId) {
        canSeeRole = true;
      } else if (isHost) {
        canSeeRole = true;
      } else if (
        (MAFIA_TEAM_ROLES as readonly string[]).includes(requestingRole ?? "") &&
        (MAFIA_TEAM_ROLES as readonly string[]).includes(roleDoc.role)
      ) {
        canSeeRole = true;
      } else if (
        (YAKUZA_TEAM_ROLES as readonly string[]).includes(requestingRole ?? "") &&
        (YAKUZA_TEAM_ROLES as readonly string[]).includes(roleDoc.role)
      ) {
        canSeeRole = true;
      }

      return {
        playerId: roleDoc.playerId,
        role: canSeeRole ? roleDoc.role : null,
      };
    });

    return {
      viewerRole: requestingRole,
      roles,
    };
  },
});

export const assign = mutation({
  args: {
    gameId: v.id("games"),
    playerId: v.id("profiles"),
    role: v.string(),
  },
  handler: async (ctx, { gameId, playerId, role }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const existing = await ctx.db
      .query("gamePlayerRoles")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", gameId).eq("playerId", playerId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { role });
    } else {
      await ctx.db.insert("gamePlayerRoles", { gameId, playerId, role });
    }
  },
});
