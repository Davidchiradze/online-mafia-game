import { ConvexError, v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { action, mutation, query } from "../_generated/server";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { requirePermission } from "../lib/auth";
import { writeAudit } from "../lib/admin";
import { PERMISSIONS } from "../lib/access";
import {
  getGameById,
  archiveGameLog,
  deleteGameAndRelations,
} from "../lib/games";
import { GAME_CLEANUP } from "../lib/constants";

const removeGameInternal = makeFunctionReference<
  "mutation",
  { gameId: Id<"games"> },
  null
>("lobby/games:removeInternal");

/** List all games for the admin panel. Requires GAME_VIEW_ALL. */
export const listGames = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.GAME_VIEW_ALL);
    const games = await ctx.db.query("games").collect();

    const rows = await Promise.all(
      games.map(async (g) => {
        const host = await ctx.db.get(g.hostId);
        const players = await ctx.db
          .query("gamePlayers")
          .withIndex("by_gameId", (q) => q.eq("gameId", g._id))
          .collect();
        return {
          _id: g._id,
          code: g.code,
          name: g.name,
          gameType: g.gameType,
          gameStatus: g.gameStatus,
          isPrivate: g.isPrivate,
          maxPlayers: g.maxPlayers,
          playerCount: players.length,
          hostNickname: host?.nickname ?? "—",
        };
      }),
    );

    // Active games first (playing → not_started → finished), newest within.
    const order = { playing: 0, not_started: 1, finished: 2 } as const;
    return rows.sort((a, b) => order[a.gameStatus] - order[b.gameStatus]);
  },
});

/**
 * Force-end / cancel a game (admin moderation). Requires GAME_FORCE_END.
 * Mirrors `finishGame` for in-progress games (archive log → mark finished →
 * schedule cleanup); for not-yet-started games it cancels by deleting them.
 */
export const forceEndGame = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const actor = await requirePermission(ctx, PERMISSIONS.GAME_FORCE_END);
    const game = await getGameById(ctx.db, gameId);

    if (game.gameStatus === "playing") {
      const session = await ctx.db
        .query("gameSessions")
        .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
        .unique();

      // Persist the permanent game-log snapshot BEFORE cleanup deletes the game.
      await archiveGameLog(ctx, gameId);
      await ctx.db.patch(gameId, { gameStatus: "finished" });
      if (session && !session.isFinished) {
        await ctx.db.patch(session._id, { isFinished: true });
      }
      await ctx.scheduler.runAfter(GAME_CLEANUP.DELAY_MS, removeGameInternal, {
        gameId,
      });
    } else {
      // not_started (no gameplay to log) or already finished — just remove it.
      await deleteGameAndRelations(ctx.db, gameId);
    }

    await writeAudit(ctx, actor._id, "game.force_end", gameId, {
      gameCode: game.code,
      previousStatus: game.gameStatus,
    });
  },
});

/**
 * Refund a game's buy-in (admin, money-sensitive). Requires GAME_REFUND.
 *
 * This is an `action` because it must call the external PHP refund endpoint
 * (see docs/payments-php-contract.ka.md). The PHP endpoint is built but its
 * trigger ships later, so this action is intentionally inert for now: it
 * authorizes the caller (so the permission wiring is real and tested) and then
 * stops short of any money movement. Wire the signed HTTP call where marked.
 */
export const refundGame = action({
  args: { gameId: v.id("games"), reason: v.string() },
  handler: async (ctx, { gameId, reason }) => {
    // Actions can't read the DB directly; authorize via a query that runs the
    // authoritative `requirePermission` check with the caller's identity.
    const access = await ctx.runQuery(api.admin.users.myAccess, {});
    if (!access.permissions.includes(PERMISSIONS.GAME_REFUND)) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "You do not have permission to issue refunds.",
      });
    }

    // TODO(payments): POST the HMAC-signed refund to the PHP endpoint
    // (refundId, batchId, gameId, accountIds, amount, reason, adminAccountId),
    // then record the result via an internal mutation + writeAudit("game.refund").
    void gameId;
    void reason;
    throw new ConvexError({
      code: "NOT_IMPLEMENTED",
      message: "Refunds are not enabled yet (PHP refund endpoint pending).",
    });
  },
});
