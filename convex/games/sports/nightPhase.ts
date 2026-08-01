import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { getAuthenticatedUser } from "../../lib/auth";
import { assertIsHost, getPlayerInGame, getPlayersByGameId } from "../../lib/games";
import { getGameDefinition } from "../registry";
import { SPORTS } from "../../lib/constants";
import type { Id } from "../../_generated/dataModel";
import type { DatabaseReader } from "../../_generated/server";

/**
 * Sports Mafia night — the `unanimous-vote` kill model (docs/variants/sports.md §5).
 *
 * Distinct from the Japanese `nightPhase.ts` single-authority model: every
 * living mafia PRIVATELY picks one target during a 5s window; the kill resolves
 * at dawn (in `farewellSpeech.startFarewellSpeech`) via the Sports
 * `resolveKills` (unanimity). This file owns the window lifecycle + per-mafia
 * selection recording; the pure resolution lives in
 * `convex/games/sports/nightModel.ts`.
 *
 * Server-only for now — the Sports night UI (kill buttons, countdown) is wired
 * in Phase 4. Selections are private: `getMySelection` returns only the
 * caller's own pick (§5.4).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getGameSession(db: DatabaseReader, gameId: Id<"games">) {
  const session = await db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session) throw new ConvexError("Game session not found");
  return session;
}

async function getNightSession(
  db: DatabaseReader,
  gameId: Id<"games">,
  nightNumber: number,
) {
  return await db
    .query("nightPhaseSessions")
    .withIndex("by_gameId_nightNumber", (q) =>
      q.eq("gameId", gameId).eq("nightNumber", nightNumber),
    )
    .unique();
}

// ---------------------------------------------------------------------------
// Window lifecycle (mirrors voting.startVoteWindow / endVoteWindowInternal —
// but only opens/closes the window; the host advances the phase manually)
// ---------------------------------------------------------------------------

/**
 * Open the 5s mafia kill-selection window. Host-only, during
 * `mafia_chooses_target`. Stamps the window and arms a scheduler that closes it
 * (disables selecting) after `SPORTS.MAFIA_TARGET_WINDOW_MS`.
 */
export const startMafiaTargetWindow = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    await assertIsHost(ctx.db, gameId, userId);

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== "mafia_chooses_target") {
      throw new ConvexError("Not in mafia target selection phase");
    }
    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");

    let nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) {
      const id = await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber,
      });
      nightSession = (await ctx.db.get(id))!;
    }
    if (nightSession.mafiaTargetWindowActive) {
      throw new ConvexError("Selection window is already open");
    }

    await ctx.db.patch(nightSession._id, {
      mafiaTargetWindowStartedAt: new Date().toISOString(),
      mafiaTargetWindowActive: true,
    });

    await ctx.scheduler.runAfter(
      SPORTS.MAFIA_TARGET_WINDOW_MS,
      internal.games.sports.nightPhase.closeMafiaTargetWindowInternal,
      { gameId },
    );
  },
});

export const closeMafiaTargetWindowInternal = internalMutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!session?.currentNightNumber) return;

    const nightSession = await getNightSession(
      ctx.db,
      gameId,
      session.currentNightNumber,
    );
    if (nightSession?.mafiaTargetWindowActive) {
      await ctx.db.patch(nightSession._id, { mafiaTargetWindowActive: false });
    }
  },
});

// ---------------------------------------------------------------------------
// Per-mafia selection (private; last-write-wins within the open window)
// ---------------------------------------------------------------------------

export const selectMafiaTarget = mutation({
  args: {
    gameId: v.id("games"),
    targetSeatNumber: v.number(),
  },
  handler: async (ctx, { gameId, targetSeatNumber }) => {
    const userId = await getAuthenticatedUser(ctx);

    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player || player.seatNumber === undefined) {
      throw new ConvexError("Player not found in game");
    }
    if (!player.isAlive) throw new ConvexError("Dead players cannot select");

    const game = await ctx.db.get(gameId);
    if (!game) throw new ConvexError("Game not found");
    const definition = getGameDefinition(game.gameType);

    // Caller must be a living mafia (by the variant's faction mapping).
    const roleRow = await ctx.db
      .query("gamePlayerRoles")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", gameId).eq("playerId", userId),
      )
      .unique();
    if (!roleRow || definition.roleToFaction(roleRow.role) !== "mafia") {
      throw new ConvexError("Only living mafia can select a kill target");
    }

    const session = await getGameSession(ctx.db, gameId);
    if (session.gamePhase !== "mafia_chooses_target") {
      throw new ConvexError("Not in mafia target selection phase");
    }
    const nightNumber = session.currentNightNumber;
    if (!nightNumber) throw new ConvexError("No active night");

    const nightSession = await getNightSession(ctx.db, gameId, nightNumber);
    if (!nightSession) throw new ConvexError("Night phase session not found");
    if (!nightSession.mafiaTargetWindowActive) {
      throw new ConvexError("Selection window is closed");
    }

    // Target must be a living player.
    const players = await getPlayersByGameId(ctx.db, gameId);
    const target = players.find((p) => p.seatNumber === targetSeatNumber);
    if (!target) throw new ConvexError("Target player not found");
    if (!target.isAlive) throw new ConvexError("Cannot target a dead player");

    // One-shot lock (§5.3): a mafia's pick is FINAL. Reject any second call —
    // no changing the target, no clearing it. Abstaining is simply never
    // calling this. (The client also hides all kill buttons once a pick lands.)
    const existing = nightSession.mafiaTargetSelections ?? [];
    if (existing.some((s) => s.mafiaSeat === player.seatNumber)) {
      throw new ConvexError("You have already chosen a target");
    }
    const updated = [
      ...existing,
      { mafiaSeat: player.seatNumber, targetSeat: targetSeatNumber },
    ];
    await ctx.db.patch(nightSession._id, { mafiaTargetSelections: updated });
  },
});

// ---------------------------------------------------------------------------
// Private read: the caller's OWN selection only (never other mafia's) — §5.4
// ---------------------------------------------------------------------------

export const getMySelection = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }): Promise<number | null> => {
    const userId = await getAuthenticatedUser(ctx);
    const player = await getPlayerInGame(ctx.db, gameId, userId);
    if (!player || player.seatNumber === undefined) return null;

    const session = await getGameSession(ctx.db, gameId);
    if (!session.currentNightNumber) return null;

    const nightSession = await getNightSession(
      ctx.db,
      gameId,
      session.currentNightNumber,
    );
    const mine = nightSession?.mafiaTargetSelections?.find(
      (s) => s.mafiaSeat === player.seatNumber,
    );
    return mine?.targetSeat ?? null;
  },
});

// ---------------------------------------------------------------------------
// Host-only read: EVERY living mafia's pick (the night-actions summary the host
// sees). Distinct from getMySelection (§5.4 privacy) — only the host may see
// who each mafia targeted. Returns a row per living mafia so the host can also
// see who has NOT yet picked (`targetSeat: null`).
// ---------------------------------------------------------------------------

type HostMafiaSelection = { mafiaSeat: number; targetSeat: number | null };

export const getHostSelections = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }): Promise<HostMafiaSelection[]> => {
    const userId = await getAuthenticatedUser(ctx);

    const game = await ctx.db.get(gameId);
    if (!game || game.hostId !== userId) return [];
    const definition = getGameDefinition(game.gameType);

    const session = await getGameSession(ctx.db, gameId);
    if (!session.currentNightNumber) return [];

    const nightSession = await getNightSession(
      ctx.db,
      gameId,
      session.currentNightNumber,
    );
    const selections = nightSession?.mafiaTargetSelections ?? [];

    // Resolve living mafia seats (by the variant's faction mapping) so the host
    // sees a row for every mafia, including those who have not yet chosen.
    const players = await getPlayersByGameId(ctx.db, gameId);
    const roleRows = await ctx.db
      .query("gamePlayerRoles")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    const roleByPlayerId = new Map(roleRows.map((r) => [r.playerId, r.role]));

    return players
      .filter((p): p is typeof p & { seatNumber: number } => {
        if (typeof p.seatNumber !== "number" || !p.isAlive) return false;
        const role = roleByPlayerId.get(p.playerId);
        return role !== undefined && definition.roleToFaction(role) === "mafia";
      })
      .sort((a, b) => a.seatNumber - b.seatNumber)
      .map((p) => ({
        mafiaSeat: p.seatNumber,
        targetSeat:
          selections.find((s) => s.mafiaSeat === p.seatNumber)?.targetSeat ??
          null,
      }));
  },
});
