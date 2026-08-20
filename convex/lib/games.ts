import { ConvexError } from "convex/values";
import {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
} from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";
import {
  type WinContext,
  type WinStateContext,
  type Winner,
  type GameOutcome,
} from "../games/core/winConditions";
import { isSerialKillerShotSpent } from "./nightSessions";
import { roleToFaction, type Faction } from "./roles";
import { getGameDefinition } from "../games/registry";
import {
  applyPlayerRating,
  getPlayerRating,
  loadRatingSnapshot,
} from "./playerRatings";
import { bumpPlayerStats, recomputePlayerStats } from "./playerStats";
import { RATING_CONFIG } from "./constants";

export async function getGameById(db: DatabaseReader, gameId: Id<"games">) {
  const game = await db.get(gameId);
  if (!game) {
    throw new ConvexError({ code: "GAME_NOT_FOUND", message: "Game not found" });
  }
  return game;
}

export async function assertIsHost(
  db: DatabaseReader,
  gameId: Id<"games">,
  userId: Id<"profiles">,
) {
  const game = await getGameById(db, gameId);
  if (game.hostId !== userId) {
    throw new ConvexError({ code: "HOST_ONLY", message: "Only the host can perform this action" });
  }
  return game;
}

export async function getPlayersByGameId(
  db: DatabaseReader,
  gameId: Id<"games">,
) {
  return await db
    .query("gamePlayers")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
}

export async function getSpectatorsByGameId(
  db: DatabaseReader,
  gameId: Id<"games">,
) {
  return await db
    .query("gameSpectators")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export function generateGameCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function isCodeTaken(db: DatabaseReader, code: string) {
  const existing = await db
    .query("games")
    .withIndex("by_code", (q) => q.eq("code", code))
    .unique();
  return existing !== null;
}

export async function getJoinRequestByRequester(
  db: DatabaseReader,
  gameId: Id<"games">,
  requesterId: Id<"profiles">,
) {
  return await db
    .query("joinRequests")
    .withIndex("by_gameId_requesterId", (q) =>
      q.eq("gameId", gameId).eq("requesterId", requesterId),
    )
    .unique();
}

export async function getPlayerInGame(
  db: DatabaseReader,
  gameId: Id<"games">,
  playerId: Id<"profiles">,
) {
  return await db
    .query("gamePlayers")
    .withIndex("by_gameId_playerId", (q) =>
      q.eq("gameId", gameId).eq("playerId", playerId),
    )
    .unique();
}

/** A room PIN is exactly four digits — short enough to read out loud. */
export const PIN_PATTERN = /^\d{4}$/;

const MAX_PIN_ATTEMPTS = 5;
const PIN_ATTEMPT_WINDOW_MS = 5 * 60_000;

/**
 * Validates a host-supplied PIN and returns it trimmed.
 *
 * Called by `lobby/games:create` and `:update` — the only two places a PIN is
 * ever written.
 */
export function assertValidPin(pin: string): string {
  const trimmed = pin.trim();
  if (!PIN_PATTERN.test(trimmed)) {
    throw new ConvexError({
      code: "GAME_PIN_INVALID",
      message: "The room PIN must be exactly 4 digits",
    });
  }
  return trimmed;
}

export type PinVerdict = "ok" | "wrong" | "locked" | "unset";

/** The client-translatable error code each failed verdict maps to. */
export const PIN_VERDICT_CODE: Record<Exclude<PinVerdict, "ok">, string> = {
  wrong: "GAME_PIN_WRONG",
  locked: "PIN_TOO_MANY_ATTEMPTS",
  unset: "GAME_PIN_REQUIRED",
};

/**
 * Gate on a private room's PIN, with throttling. `"ok"` for any public room, so
 * callers can call it unconditionally.
 *
 * RETURNS A VERDICT, NEVER THROWS — and that is load-bearing. A Convex mutation
 * that throws rolls back every write it made, so throwing here would also
 * discard the failed-attempt row written moments earlier and the throttle would
 * count to one forever. Callers must therefore RETURN the failure to the client
 * (see `PIN_VERDICT_CODE`) instead of rethrowing it.
 */
export async function verifyGamePin(
  db: DatabaseWriter,
  game: Doc<"games">,
  profileId: Id<"profiles">,
  pin: string | undefined,
): Promise<PinVerdict> {
  if (!game.isPrivate) return "ok";

  // A private room with no stored PIN predates this feature — treat it as
  // locked rather than silently open, and let the host set one in Room Settings.
  if (!game.pin) return "unset";

  const attempt = await db
    .query("gamePinAttempts")
    .withIndex("by_gameId_profileId", (q) =>
      q.eq("gameId", game._id).eq("profileId", profileId),
    )
    .unique();

  const now = Date.now();
  const withinWindow =
    attempt !== null && now - attempt.lastFailedAt < PIN_ATTEMPT_WINDOW_MS;

  if (withinWindow && attempt.failedCount >= MAX_PIN_ATTEMPTS) return "locked";

  if (!pin || pin.trim() !== game.pin) {
    const failedCount = withinWindow ? attempt.failedCount + 1 : 1;
    if (attempt) {
      await db.patch(attempt._id, { failedCount, lastFailedAt: now });
    } else {
      await db.insert("gamePinAttempts", {
        gameId: game._id,
        profileId,
        failedCount,
        lastFailedAt: now,
      });
    }
    return "wrong";
  }

  if (attempt) await db.delete(attempt._id);
  return "ok";
}

const GAME_RELATED_TABLES = [
  "gamePlayers",
  "gameSpectators",
  "joinRequests",
  "gamePinAttempts",
  "gameSessions",
  "gamePlayerRoles",
  "nightPhaseSessions",
  "votingSessions",
  "cardPickingSessions",
  "gameBroadcasts",
] as const;

export async function deleteGameAndRelations(
  db: DatabaseWriter,
  gameId: Id<"games">,
) {
  for (const table of GAME_RELATED_TABLES) {
    const docs = await db
      .query(table)
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();

    for (const doc of docs) {
      // votes reference votingSessions, not games — cascade through them
      if (table === "votingSessions") {
        const votes = await db
          .query("votes")
          .withIndex("by_votingSessionId", (q) =>
            q.eq("votingSessionId", doc._id as Id<"votingSessions">),
          )
          .collect();
        for (const vote of votes) await db.delete(vote._id);
      }
      await db.delete(doc._id);
    }
  }

  await db.delete(gameId);
}

/**
 * Roles of every alive player who holds a role (excludes the host, who has no
 * `gamePlayerRoles` entry).
 */
async function getAliveRoles(
  db: DatabaseReader,
  gameId: Id<"games">,
): Promise<string[]> {
  const roleRows = await db
    .query("gamePlayerRoles")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
  const roleByPlayer = new Map<Id<"profiles">, string>();
  for (const r of roleRows) roleByPlayer.set(r.playerId, r.role);

  const players = await getPlayersByGameId(db, gameId);
  const aliveRoles: string[] = [];
  for (const p of players) {
    if (!p.isAlive) continue;
    const role = roleByPlayer.get(p.playerId);
    if (role) aliveRoles.push(role);
  }
  return aliveRoles;
}

/**
 * Run the auto win-detection check for the given transition context. If a
 * faction has won, **record** the pending winner on the session (`winner`) but
 * do NOT finish the game — the host confirms the end via the "Finish Game"
 * button (the existing `finishGame` mutation), which is what actually flips
 * `isFinished` / `gameStatus` and schedules cleanup. Returns the winner so the
 * caller can pause (skip the phase transition); `null` means continue.
 *
 * Idempotent: if a winner is already recorded, it is returned again (the game
 * stays paused). No-op once the game is finished.
 *
 * See docs/engine/win-check-seam.md. Called from `enterNightPhase` (beforeNight),
 * `enterDayPhase` (beforeDay), and the immediate `giveFoul` check (beforeNight).
 */
export async function recordWinnerIfDecided(
  ctx: MutationCtx,
  gameId: Id<"games">,
  context: WinContext,
): Promise<GameOutcome | null> {
  const session = await ctx.db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session || session.isFinished) return null;

  // Already decided on a previous transition — keep the game paused.
  if (session.winner) return session.winner;

  // Dispatch the win decision to the game's variant (variants/sports/win-conditions.md §9). The
  // Japanese definition reuses the exact `describeWin` this seam called before,
  // so Japanese behavior is unchanged; Sports gets its parity snapshot.
  const game = await getGameById(ctx.db, gameId);
  const definition = getGameDefinition(game.gameType);

  const aliveRoles = await getAliveRoles(ctx.db, gameId);

  // State the alive roster cannot express. Read unconditionally rather than
  // gated on the variant: the shared seam stays variant-blind, and the cost is
  // one indexed query over at most a handful of night rows, a few times a game.
  // A variant that ignores `state` is unaffected — Japanese and Sports both do.
  const state: WinStateContext = {
    serialKillerHasShot: !(await isSerialKillerShotSpent(ctx.db, gameId)),
  };

  const result = definition.describeWin(aliveRoles, context, state);
  if (!result) return null;

  // Total mutual elimination — nobody left alive. Pause on the banner as a
  // no-contest; no faction won, so there is no winMethod snapshot (the log
  // records it as no contest, just like an admin force-end).
  if (result === "no_contest") {
    await ctx.db.patch(session._id, { winner: "no_contest" });
    return "no_contest";
  }

  // Capture the structured endgame snapshot now — the game pauses once a winner
  // is recorded, so this is the authoritative state for the eventual game log.
  await ctx.db.patch(session._id, {
    winner: result.faction,
    winMethod: result,
  });

  return result.faction;
}

/**
 * Write the permanent game-log snapshot for a finished game. Denormalizes all
 * data (game meta, host, roster + roles, winner, win method) into `gameLogs`
 * plus one `gameLogPlayers` row per participant, so the record survives the
 * cascade cleanup that deletes the live game.
 *
 * Idempotent: a no-op if a log already exists for this game. The host is
 * recorded as metadata (`hostId`/`hostNickname`) and excluded from the roster,
 * since the host holds no role. Games finished without a decided winner are
 * still logged with `winner: null` and no `winMethod`.
 *
 * Also applies ELO rating updates for rated game types — upserts
 * `playerRatings` and stamps the per-game snapshot on each `gameLogPlayers`
 * row (see /docs/ranking-system.md).
 *
 * Call this from `finishGame` BEFORE flipping status / scheduling cleanup.
 */
export async function archiveGameLog(ctx: MutationCtx, gameId: Id<"games">) {
  // Idempotency guard — never duplicate a log for the same game.
  const existing = await ctx.db
    .query("gameLogs")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (existing) return existing._id;

  const game = await getGameById(ctx.db, gameId);
  const session = await ctx.db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();

  const roleRows = await ctx.db
    .query("gamePlayerRoles")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();
  const roleByPlayer = new Map<Id<"profiles">, string>();
  for (const r of roleRows) roleByPlayer.set(r.playerId, r.role);

  const allPlayers = await getPlayersByGameId(ctx.db, gameId);

  // Roster excludes the host (no role). Use the role-row presence as the test
  // of "is a playing participant".
  const roster = allPlayers
    .filter((p) => p.playerId !== game.hostId)
    .map((p) => ({
      playerId: p.playerId,
      nickname: p.nickname,
      seatNumber: p.seatNumber,
      role: roleByPlayer.get(p.playerId) ?? "UNKNOWN",
      isAlive: p.isAlive,
    }));

  const hostPlayer = allPlayers.find((p) => p.playerId === game.hostId);
  const hostProfile = hostPlayer ? null : await ctx.db.get(game.hostId);
  const hostNickname =
    hostPlayer?.nickname ?? hostProfile?.nickname ?? "Unknown host";

  const finishedAt = Date.now();
  const startedAt = session?.startedAt ?? session?._creationTime ?? finishedAt;
  // A "no_contest" (mutual elimination) session outcome is logged like an admin
  // force-end: winner null, no ELO.
  const rawWinner = session?.winner ?? null;
  const winner: Winner | null = rawWinner === "no_contest" ? null : rawWinner;
  const winMethod = session?.winMethod;

  // ELO pass 1 — snapshot every player's pre-game rating (null for unrated
  // game types). See /docs/ranking-system.md §3.
  const ratingSnapshot = await loadRatingSnapshot(
    ctx.db,
    game.gameType,
    roster.map((p) => p.playerId),
  );

  // Faction comes from the VARIANT's mapping, not the shared one. The shared
  // `roleToFaction` answers "citizens" for every role it does not recognise, so
  // the moment a variant introduces a role it would archive that whole faction
  // as town — wrong outcome, wrong ELO, wrong stats, and no error anywhere.
  //
  // Falls back to the shared map for a game type with no registered definition
  // (`city_mafia`). This is the finish-game path: a throw here would leave the
  // game permanently unfinishable.
  let factionOf: (role: string) => Faction = roleToFaction;
  try {
    factionOf = getGameDefinition(game.gameType).roleToFaction;
  } catch {
    // No definition registered — keep the shared fallback.
  }

  const gameLogId = await ctx.db.insert("gameLogs", {
    gameId,
    gameCode: game.code,
    gameName: game.name,
    gameType: game.gameType,
    hostId: game.hostId,
    hostNickname,
    startedAt,
    finishedAt,
    winner,
    winMethod,
    players: roster,
  });

  for (const p of roster) {
    const faction = factionOf(p.role);
    const outcome: "win" | "loss" | "no_contest" =
      winner === null ? "no_contest" : faction === winner ? "win" : "loss";

    // ELO pass 2 — upsert this player's rating and get the fields to stamp on
    // their log row (empty for unrated game types).
    const ratingFields = await applyPlayerRating(
      ctx,
      ratingSnapshot,
      p.playerId,
      faction,
      outcome,
    );

    await ctx.db.insert("gameLogPlayers", {
      gameLogId,
      gameId,
      playerId: p.playerId,
      nickname: p.nickname,
      role: p.role,
      seatNumber: p.seatNumber,
      isAlive: p.isAlive,
      startedAt,
      finishedAt,
      faction,
      outcome,
      winner,
      gameType: game.gameType,
      gameName: game.name,
      winMethod,
      ...ratingFields,
    });

    await bumpPlayerStats(ctx, p.playerId, game.gameType, p.role, outcome);
  }

  return gameLogId;
}

/**
 * Annul a finished game — convert it to a no-contest and undo its effect on
 * player ratings and aggregate stats. Admin moderation; see
 * `convex/admin/gameLogs.ts` → `annulGame` and /docs/ranking-system.md.
 *
 * What it does, per player in the log's roster:
 *   1. **Reverse ELO.** Subtract this game's stored, already-clipped
 *      `ratingDelta` back out of `playerRatings.rating` (re-clamped at the
 *      config floor). This is a FORWARD-ONLY reversal — games played *after*
 *      this one are not recomputed, matching the ranking system's
 *      "past deltas are never re-adjusted" policy (ranking-system.md §9).
 *      `peakRating` is left untouched (it was genuinely reached at the time).
 *   2. **Rewrite the per-game row** to a no-contest: `outcome: "no_contest"`,
 *      `winner: null`, no `winMethod`, `ratingDelta: 0`, and `ratingAfter`
 *      rolled back to the pre-game rating — identical to how a natural
 *      no-contest is archived. Zeroing `ratingDelta` also makes a re-run a
 *      no-op, so ELO can never be double-reversed.
 *   3. **Recompute `playerStats`** from the player's full `gameLogPlayers`
 *      history (cheap, per-player, order-independent). A full recompute avoids
 *      the underflow / drift risks of incremental decrements and self-heals any
 *      prior skew; it reproduces exactly what `bumpPlayerStats` would have built.
 *
 * Finally the `gameLogs` row itself is set to `winner: null` / no `winMethod`.
 *
 * Idempotency is the caller's responsibility: only annul a game whose `winner`
 * is non-null (a no-contest has no ELO to reverse — its deltas are already 0).
 */
export async function annulGameLog(ctx: MutationCtx, log: Doc<"gameLogs">) {
  const config = RATING_CONFIG[log.gameType]; // undefined for unrated game types

  const rows = await ctx.db
    .query("gameLogPlayers")
    .withIndex("by_gameLogId", (q) => q.eq("gameLogId", log._id))
    .collect();

  const affectedPlayerIds = new Set<Id<"profiles">>();

  for (const row of rows) {
    affectedPlayerIds.add(row.playerId);

    // 1) Reverse this game's rating delta on the player's ladder rating.
    if (config && typeof row.ratingDelta === "number" && row.ratingDelta !== 0) {
      const ratingRow = await getPlayerRating(
        ctx.db,
        row.playerId,
        log.gameType,
      );
      if (ratingRow) {
        const reverted = Math.max(
          config.floor,
          ratingRow.rating - row.ratingDelta,
        );
        await ctx.db.patch(ratingRow._id, { rating: reverted });
      }
    }

    // 2) Rewrite the per-game row as a no-contest.
    const patch: Partial<Doc<"gameLogPlayers">> = {
      outcome: "no_contest",
      winner: null,
      winMethod: undefined,
    };
    if (typeof row.ratingDelta === "number") {
      patch.ratingDelta = 0;
      if (typeof row.ratingAfter === "number") {
        patch.ratingAfter = row.ratingAfter - row.ratingDelta; // pre-game rating
      }
    }
    await ctx.db.patch(row._id, patch);
  }

  // 3) Recompute aggregate stats for each affected player from their history.
  for (const playerId of affectedPlayerIds) {
    await recomputePlayerStats(ctx, playerId, log.gameType);
  }

  // 4) The log itself becomes a no-contest.
  await ctx.db.patch(log._id, { winner: null, winMethod: undefined });
}

