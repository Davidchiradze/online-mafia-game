import { ConvexError, v } from "convex/values";
import { query, mutation } from "../../_generated/server";
import { getAuthenticatedUser, getAuthenticatedProfile } from "../../lib/auth";
import { PERMISSIONS, roleHasPermission } from "../../lib/access";
import { getGameById, assertIsHost, getPlayerInGame } from "../../lib/games";
import { MAFIA_TEAM_ROLES, YAKUZA_TEAM_ROLES } from "../../lib/constants";

/**
 * Get player roles filtered by team visibility.
 * Reactive: auto-updates when roles change or game finishes.
 *
 * Visibility rules:
 * - Game finished → everyone sees all roles
 * - Own role → always visible
 * - Host → sees all roles
 * - Staff spectator (GAME_REVEAL_ROLES) with `revealAll` → sees all roles, but
 *   only if NOT a seated player in this game (no self-cheating)
 * - Mafia team (DON, MAFIA) → see each other
 * - Yakuza team (YAKUZA, SHOGUN) → see each other
 * - Everyone else → null
 */
export const getVisible = query({
  args: { gameId: v.id("games"), revealAll: v.optional(v.boolean()) },
  handler: async (ctx, { gameId, revealAll }) => {
    const profile = await getAuthenticatedProfile(ctx);
    const userId = profile._id;
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

    // A staff spectator may reveal all roles (host POV), but never if they are a
    // seated player in this game. Defense in depth — the UI also hides the tool
    // for players, but the server is the authoritative gate.
    const callerIsPlayer = (await getPlayerInGame(ctx.db, gameId, userId)) !== null;
    const canRevealAll =
      revealAll === true &&
      !callerIsPlayer &&
      roleHasPermission(profile.role, PERMISSIONS.GAME_REVEAL_ROLES);

    const roles = allRoles.map((roleDoc) => {
      let canSeeRole = false;

      if (isGameFinished) {
        canSeeRole = true;
      } else if (roleDoc.playerId === userId) {
        canSeeRole = true;
      } else if (isHost) {
        canSeeRole = true;
      } else if (canRevealAll) {
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
