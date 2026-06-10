import {
  DatabaseReader,
  DatabaseWriter,
  MutationCtx,
} from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { decideWinner, type WinContext, type Winner } from "./winConditions";

export async function getGameById(db: DatabaseReader, gameId: Id<"games">) {
  const game = await db.get(gameId);
  if (!game) {
    throw new Error("Game not found");
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
    throw new Error("Only the host can perform this action");
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
  const winner = decideWinner(aliveRoles, context);
  if (!winner) return null;

  await ctx.db.patch(session._id, { winner });

  return winner;
}
