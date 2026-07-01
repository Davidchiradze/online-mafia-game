import { ConvexError } from "convex/values";
import {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { describeWin, type WinContext, type Winner } from "./winConditions";
import { roleToFaction } from "./roles";

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

const GAME_RELATED_TABLES = [
  "gamePlayers",
  "gameSpectators",
  "joinRequests",
  "gameSessions",
  "gamePlayerRoles",
  "nightPhaseSessions",
  "votingSessions",
  "cardPickingSessions",
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
 * See docs/game-end-conditions.md. Called from `enterNightPhase` (beforeNight),
 * `enterDayPhase` (beforeDay), and the immediate `giveFoul` check (beforeNight).
 */
export async function recordWinnerIfDecided(
  ctx: MutationCtx,
  gameId: Id<"games">,
  context: WinContext,
): Promise<Winner | null> {
  const session = await ctx.db
    .query("gameSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .unique();
  if (!session || session.isFinished) return null;

  // Already decided on a previous transition — keep the game paused.
  if (session.winner) return session.winner;

  const aliveRoles = await getAliveRoles(ctx.db, gameId);
  const method = describeWin(aliveRoles, context);
  if (!method) return null;

  // Capture the structured endgame snapshot now — the game pauses once a winner
  // is recorded, so this is the authoritative state for the eventual game log.
  await ctx.db.patch(session._id, {
    winner: method.faction,
    winMethod: method,
  });

  return method.faction;
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
  const winner: Winner | null = session?.winner ?? null;
  const winMethod = session?.winMethod;

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
    const faction = roleToFaction(p.role);
    const outcome: "win" | "loss" | "no_contest" =
      winner === null ? "no_contest" : faction === winner ? "win" : "loss";

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
    });

    await bumpPlayerStats(ctx, p.playerId, p.role, outcome);
  }

  return gameLogId;
}

/**
 * Incrementally fold one finished-game result into a player's aggregate stats.
 * Creates the row on first game; otherwise increments the overall counters and
 * the per-role entry. Win rates are derived on read, not stored.
 */
async function bumpPlayerStats(
  ctx: MutationCtx,
  playerId: Id<"profiles">,
  role: string,
  outcome: "win" | "loss" | "no_contest",
) {
  const existing = await ctx.db
    .query("playerStats")
    .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
    .unique();

  const w = outcome === "win" ? 1 : 0;
  const l = outcome === "loss" ? 1 : 0;
  const nc = outcome === "no_contest" ? 1 : 0;

  if (!existing) {
    await ctx.db.insert("playerStats", {
      playerId,
      totalMatches: 1,
      wins: w,
      losses: l,
      noContests: nc,
      currentStreak: w,
      bestStreak: w,
      roleStats: [{ role, matches: 1, wins: w, losses: l }],
    });
    return;
  }

  // Win → extend streak, loss → reset, no-contest → leave unchanged.
  const prevStreak = existing.currentStreak ?? 0;
  const currentStreak =
    outcome === "win" ? prevStreak + 1 : outcome === "loss" ? 0 : prevStreak;
  const bestStreak = Math.max(existing.bestStreak ?? 0, currentStreak);

  const roleStats = [...existing.roleStats];
  const idx = roleStats.findIndex((r) => r.role === role);
  if (idx === -1) {
    roleStats.push({ role, matches: 1, wins: w, losses: l });
  } else {
    const cur = roleStats[idx];
    roleStats[idx] = {
      role,
      matches: cur.matches + 1,
      wins: cur.wins + w,
      losses: cur.losses + l,
    };
  }

  await ctx.db.patch(existing._id, {
    totalMatches: existing.totalMatches + 1,
    wins: existing.wins + w,
    losses: existing.losses + l,
    noContests: existing.noContests + nc,
    currentStreak,
    bestStreak,
    roleStats,
  });
}
