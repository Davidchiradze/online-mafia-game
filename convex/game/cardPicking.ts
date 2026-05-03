import { v } from "convex/values";
import {
  query,
  mutation,
  internalMutation,
  type MutationCtx,
} from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { getAuthenticatedUser } from "../lib/auth";
import { assertIsHost, getPlayersByGameId } from "../lib/games";
import { cardPicking as cardPickingRefs } from "../refs/game";
import {
  CARD_PICK,
  GAME_PHASES,
  JAPANESE_MAFIA_ROLE_DISTRIBUTION,
} from "../lib/constants";

// ============================================================================
// HELPERS
// ============================================================================

/** Fisher-Yates shuffle (returns a new shuffled copy of the input). */
function shuffle<T>(input: readonly T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Server-issued ISO timestamp. Matches the format used elsewhere for timer
 * fields (e.g. `votingStartedAt`). */
function nowIso(): string {
  return new Date().toISOString();
}

type DeckCard = Doc<"cardPickingSessions">["deck"][number];

/**
 * Apply a single card claim to the session and (if not complete) schedule the
 * next turn's auto-pick watchdog.
 *
 * Used by both:
 *   - `pickCard`           — manual claim by the seated player.
 *   - `expireTurnInternal` — server auto-pick when a turn elapses past 15s.
 *
 * Validation (turn check, card-not-already-claimed, etc.) is the caller's
 * responsibility. This helper only does the writes.
 *
 * Writes:
 *   1. `cardPickingSessions.deck` — marks one card claimed.
 *   2. `cardPickingSessions.currentPickIndex` — incremented.
 *   3. `cardPickingSessions.currentTurnStartedAt` — set to now (or cleared on
 *      the final pick, when `isComplete` flips to true).
 *   4. `gamePlayerRoles` — insert (or patch if a row already exists for this
 *      player).
 *   5. `ctx.scheduler.runAfter(CARD_PICK.TIMEOUT_MS, expireTurnInternal, ...)`
 *      — only when the picking session is not yet complete. Stale schedules
 *      are harmless; the handler short-circuits on a mismatched
 *      `expectedPickIndex`.
 */
async function applyCardClaim(
  ctx: MutationCtx,
  args: {
    session: Doc<"cardPickingSessions">;
    cardIndex: number;
    claimerUserId: Id<"profiles">;
    claimerSeat: number;
  },
) {
  const { session, cardIndex, claimerUserId, claimerSeat } = args;
  const card = session.deck[cardIndex];

  const newDeck: DeckCard[] = session.deck.map((c, i) =>
    i === cardIndex
      ? {
          ...c,
          claimedByPlayerId: claimerUserId,
          claimedBySeat: claimerSeat,
          claimedAt: Date.now(),
        }
      : c,
  );

  const newPickIndex = session.currentPickIndex + 1;
  const isComplete = newPickIndex >= session.pickOrder.length;

  await ctx.db.patch(session._id, {
    deck: newDeck,
    currentPickIndex: newPickIndex,
    isComplete,
    currentTurnStartedAt: isComplete ? undefined : nowIso(),
  });

  const existingRole = await ctx.db
    .query("gamePlayerRoles")
    .withIndex("by_gameId_playerId", (q) =>
      q.eq("gameId", session.gameId).eq("playerId", claimerUserId),
    )
    .unique();
  if (existingRole) {
    await ctx.db.patch(existingRole._id, { role: card.role });
  } else {
    await ctx.db.insert("gamePlayerRoles", {
      gameId: session.gameId,
      playerId: claimerUserId,
      role: card.role,
    });
  }

  if (!isComplete) {
    await ctx.scheduler.runAfter(
      CARD_PICK.TIMEOUT_MS,
      cardPickingRefs.expireTurnInternal,
      { gameId: session.gameId, expectedPickIndex: newPickIndex },
    );
  }
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Start the card-picking phase.
 *
 * Host-only. Idempotent: returns the existing session id if one already
 * exists for this game (e.g. host accidentally double-clicks the button).
 *
 * Steps:
 *   1. Build pickOrder = seated non-host players, ascending by seat number.
 *      The host's gamePlayers row exists with seatNumber == maxPlayers + 1
 *      and is filtered out by the seat range check. Players without seats
 *      (joined after start) are also filtered out.
 *   2. Build a shuffled deck of N cards (N = pickOrder.length) drawn from
 *      JAPANESE_MAFIA_ROLE_DISTRIBUTION. For full lobbies (N == 12) every
 *      role is dealt; for smaller lobbies a random subset of size N is dealt
 *      (matches the legacy `assignRandomRoles` semantics).
 *   3. Insert the cardPickingSessions row with `currentTurnStartedAt = now`.
 *   4. Set gameSessions.gamePhase = "picking_roles".
 *   5. Schedule the first watchdog at T + CARD_PICK.TIMEOUT_MS.
 */
export const start = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const userId = await getAuthenticatedUser(ctx);
    const game = await assertIsHost(ctx.db, gameId, userId);

    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!session) throw new Error("Game session not found");

    const existing = await ctx.db
      .query("cardPickingSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (existing) return existing._id;

    const players = await getPlayersByGameId(ctx.db, gameId);
    // Host has seatNumber == maxPlayers + 1; players who joined post-start
    // have no seat at all. Both must be excluded from the pick order.
    const seatedPlayers = players
      .filter(
        (p): p is typeof p & { seatNumber: number } =>
          typeof p.seatNumber === "number" &&
          p.seatNumber >= 1 &&
          p.seatNumber <= game.maxPlayers,
      )
      .sort((a, b) => a.seatNumber - b.seatNumber);

    if (seatedPlayers.length === 0) {
      throw new Error("No seated players to deal cards to");
    }
    if (seatedPlayers.length > JAPANESE_MAFIA_ROLE_DISTRIBUTION.length) {
      throw new Error(
        `Too many seated players (${seatedPlayers.length}); deck only supports up to ${JAPANESE_MAFIA_ROLE_DISTRIBUTION.length}`,
      );
    }

    const pickOrder = seatedPlayers.map((p) => p.seatNumber);

    const shuffledRoles = shuffle(JAPANESE_MAFIA_ROLE_DISTRIBUTION).slice(
      0,
      pickOrder.length,
    );
    const deck = shuffledRoles.map((role, index) => ({
      cardId: `card_${index + 1}`,
      role,
    }));

    const sessionId = await ctx.db.insert("cardPickingSessions", {
      gameId,
      deck,
      pickOrder,
      currentPickIndex: 0,
      currentTurnStartedAt: nowIso(),
      isComplete: false,
    });

    await ctx.db.patch(session._id, { gamePhase: GAME_PHASES[1] });

    await ctx.scheduler.runAfter(
      CARD_PICK.TIMEOUT_MS,
      cardPickingRefs.expireTurnInternal,
      { gameId, expectedPickIndex: 0 },
    );

    return sessionId;
  },
});

/**
 * Claim a card during the picking_roles phase.
 *
 * Atomic per-pick contract:
 *   - Caller must be a seated player in this game.
 *   - Caller's seat must match `pickOrder[currentPickIndex]` (turn check).
 *   - Target `cardId` must exist and be unclaimed.
 *
 * On success the call is delegated to `applyCardClaim`, which marks the card
 * claimed, advances `currentPickIndex`, stamps the next turn's start time
 * (or clears it on completion), writes the role row, and schedules the next
 * watchdog. Convex mutations are transactional: any thrown error rolls back
 * all of the above (including the scheduled job).
 */
export const pickCard = mutation({
  args: { gameId: v.id("games"), cardId: v.string() },
  handler: async (ctx, { gameId, cardId }) => {
    const userId = await getAuthenticatedUser(ctx);

    const session = await ctx.db
      .query("cardPickingSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!session) throw new Error("Card-picking session not found");
    if (session.isComplete) {
      throw new Error("Card-picking is already complete");
    }

    const player = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", gameId).eq("playerId", userId),
      )
      .unique();
    if (!player || player.seatNumber === undefined) {
      throw new Error("You are not a seated player in this game");
    }
    const seatNumber = player.seatNumber;

    const currentSeat = session.pickOrder[session.currentPickIndex];
    if (seatNumber !== currentSeat) {
      throw new Error("Not your turn");
    }

    const cardIndex = session.deck.findIndex((c) => c.cardId === cardId);
    if (cardIndex === -1) throw new Error("Card not found");
    if (session.deck[cardIndex].claimedByPlayerId !== undefined) {
      throw new Error("Card already taken");
    }

    await applyCardClaim(ctx, {
      session,
      cardIndex,
      claimerUserId: userId,
      claimerSeat: seatNumber,
    });
  },
});

/**
 * Internal watchdog — scheduled via `ctx.scheduler.runAfter` from `start` and
 * from `applyCardClaim` after every successful pick. Auto-picks a random
 * unclaimed card on behalf of a stalled seat.
 *
 * Idempotency:
 *   - Stale schedule (current pick already advanced) → no-op.
 *   - Session already complete                       → no-op.
 *   - Session row missing (game cleaned up)          → no-op.
 *
 * No client ever calls this directly. Concurrency with a manual `pickCard`
 * is handled by Convex's per-document OCC: whichever mutation commits first
 * advances `currentPickIndex`, the loser sees the updated state on retry and
 * either throws ("Not your turn") or short-circuits (stale schedule).
 */
export const expireTurnInternal = internalMutation({
  args: {
    gameId: v.id("games"),
    expectedPickIndex: v.number(),
  },
  handler: async (ctx, { gameId, expectedPickIndex }) => {
    const session = await ctx.db
      .query("cardPickingSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!session) return null;
    if (session.isComplete) return null;
    if (session.currentPickIndex !== expectedPickIndex) return null;

    const currentSeat = session.pickOrder[session.currentPickIndex];

    const players = await getPlayersByGameId(ctx.db, gameId);
    const stalledPlayer = players.find((p) => p.seatNumber === currentSeat);
    if (!stalledPlayer) {
      // Player at this seat has left the game between scheduling and firing.
      // Nothing safe to assign; let the host intervene manually.
      console.warn(
        `[cardPicking.expireTurnInternal] No player at seat ${currentSeat} for game ${gameId}; skipping auto-pick`,
      );
      return null;
    }

    const unclaimedIndices: number[] = [];
    for (let i = 0; i < session.deck.length; i++) {
      if (session.deck[i].claimedByPlayerId === undefined) {
        unclaimedIndices.push(i);
      }
    }
    if (unclaimedIndices.length === 0) {
      // Shouldn't happen unless deck/pickOrder lengths drifted. Be defensive.
      console.warn(
        `[cardPicking.expireTurnInternal] No unclaimed cards left for game ${gameId} at index ${expectedPickIndex}`,
      );
      return null;
    }

    const randomCardIndex =
      unclaimedIndices[Math.floor(Math.random() * unclaimedIndices.length)];

    await applyCardClaim(ctx, {
      session,
      cardIndex: randomCardIndex,
      claimerUserId: stalledPlayer.playerId,
      claimerSeat: currentSeat,
    });

    return null;
  },
});

// ============================================================================
// QUERIES
// ============================================================================

type CardView = {
  cardId: string;
  claimed: boolean;
  claimedBySeat: number | null;
  /** Hidden until the viewer is the claimer, the host, or the game is finished. */
  role: string | null;
};

type CardPickingState = {
  pickOrder: number[];
  currentPickIndex: number;
  currentSeat: number | null;
  viewerSeat: number | null;
  isMyTurn: boolean;
  currentTurnStartedAt: string | null;
  isComplete: boolean;
  cards: CardView[];
};

/**
 * Reactive read for the picking_roles UI.
 *
 * Returns null when no card-picking session exists for this game (e.g. the
 * host hasn't started picking yet, or the session has been cleaned up).
 *
 * Role visibility per card:
 *   - viewer is the claimer of that card  → role visible
 *   - viewer is the host                  → all roles visible
 *   - game is finished                    → all roles visible
 *   - otherwise                           → role: null
 */
export const getState = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }): Promise<CardPickingState | null> => {
    const userId = await getAuthenticatedUser(ctx);

    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const session = await ctx.db
      .query("cardPickingSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    if (!session) return null;

    const gameSession = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    const isGameFinished = gameSession?.isFinished ?? false;

    const isHost = game.hostId === userId;

    const viewerPlayer = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", gameId).eq("playerId", userId),
      )
      .unique();
    const viewerSeat = viewerPlayer?.seatNumber ?? null;

    const currentSeat =
      session.currentPickIndex < session.pickOrder.length
        ? session.pickOrder[session.currentPickIndex]
        : null;

    const isMyTurn = viewerSeat !== null && currentSeat === viewerSeat;

    const cards: CardView[] = session.deck.map((card) => {
      const isClaimer = card.claimedByPlayerId === userId;
      const canSeeRole = isClaimer || isHost || isGameFinished;
      return {
        cardId: card.cardId,
        claimed: card.claimedByPlayerId !== undefined,
        claimedBySeat: card.claimedBySeat ?? null,
        role: canSeeRole ? card.role : null,
      };
    });

    return {
      pickOrder: session.pickOrder,
      currentPickIndex: session.currentPickIndex,
      currentSeat,
      viewerSeat,
      isMyTurn,
      currentTurnStartedAt: session.currentTurnStartedAt ?? null,
      isComplete: session.isComplete,
      cards,
    };
  },
});
