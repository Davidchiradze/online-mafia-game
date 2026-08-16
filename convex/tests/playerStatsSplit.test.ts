// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import type { Doc, Id } from "../_generated/dataModel";
import { archiveGameLog, annulGameLog } from "../lib/games";

/**
 * CONVEX-TEST INTEGRATION — the per-variant player record
 * (/docs/ranking-system.md §12).
 *
 * SILENT FAILURE MODE: a player's record used to be ONE global row, so a Sports
 * result landed in the same wins/losses/streak/roleStats a Japanese leaderboard
 * reads. Nothing failed — the numbers were simply about a different game. The
 * split is invisible to `tsc` (the counters have the same shape either way) and
 * invisible to every pure test (this lives in `archiveGameLog`'s DB writes), so
 * this file is the only thing standing between the split and a silent
 * regression.
 *
 * It is also the repo's first test that ARCHIVES a game: `gameEngine.test.ts`
 * stops at `recordWinnerIfDecided`, so the whole archive path — log rows, stats,
 * rating, annulment — had no coverage at all.
 */

const modules = import.meta.glob("../**/*.*s");

type GameType = Doc<"games">["gameType"];

type Seat = { playerId: Id<"profiles">; seat: number; role: string };

/** A profile with no games, reusable across several seeded games. */
function createPlayer(t: TestConvex<typeof schema>, nickname: string) {
  return t.run((ctx) =>
    ctx.db.insert("profiles", {
      accountId: `acc-${nickname}`,
      nickname,
      verified: true,
      createdAt: 0,
      updatedAt: 0,
    }),
  );
}

/**
 * Seed a finished game and archive it, the way `finishGame` would. Returns the
 * log id so a test can annul it.
 */
async function seedAndArchive(
  t: TestConvex<typeof schema>,
  opts: {
    gameType: GameType;
    winner: "mafia" | "citizens" | "yakuza" | null;
    seats: Seat[];
    code?: string;
  },
): Promise<Id<"gameLogs">> {
  const gameId = await t.run(async (ctx) => {
    const hostId = await ctx.db.insert("profiles", {
      accountId: `host-${opts.code ?? "A"}`,
      nickname: "Host",
      verified: true,
      createdAt: 0,
      updatedAt: 0,
    });
    const gameId = await ctx.db.insert("games", {
      code: opts.code ?? "TEST01",
      name: "Test Game",
      hostId,
      gameType: opts.gameType,
      gameStatus: "playing",
      maxPlayers: 12,
      isPrivate: false,
    });
    await ctx.db.insert("gameSessions", {
      gameId,
      gamePhase: "day_phase",
      isFinished: false,
      currentNightNumber: 1,
      nominatedPlayers: [],
      speakingOrder: [],
      ...(opts.winner ? { winner: opts.winner } : {}),
    });
    for (const s of opts.seats) {
      await ctx.db.insert("gamePlayers", {
        gameId,
        playerId: s.playerId,
        nickname: `P${s.seat}`,
        seatNumber: s.seat,
        isAlive: true,
        fouls: 0,
      });
      await ctx.db.insert("gamePlayerRoles", {
        gameId,
        playerId: s.playerId,
        role: s.role,
      });
    }
    return gameId;
  });

  return t.run((ctx) => archiveGameLog(ctx, gameId));
}

function statsRows(t: TestConvex<typeof schema>, playerId: Id<"profiles">) {
  return t.run((ctx) =>
    ctx.db
      .query("playerStats")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect(),
  );
}

const rowFor = (rows: Doc<"playerStats">[], gameType: GameType) =>
  rows.find((r) => r.gameType === gameType);

describe("archiveGameLog — the record is per variant", () => {
  it("keeps one variant's result out of another's record", async () => {
    const t = convexTest(schema, modules);
    const player = await createPlayer(t, "both");

    // Wins a Japanese game as a citizen…
    await seedAndArchive(t, {
      gameType: "japanese_mafia",
      winner: "citizens",
      code: "JP0001",
      seats: [
        { playerId: player, seat: 1, role: "CITIZEN" },
        { playerId: await createPlayer(t, "jp-don"), seat: 2, role: "DON" },
      ],
    });

    // …then loses a Sports game as a citizen.
    await seedAndArchive(t, {
      gameType: "sports_mafia",
      winner: "mafia",
      code: "SP0001",
      seats: [
        { playerId: player, seat: 1, role: "CITIZEN" },
        { playerId: await createPlayer(t, "sp-don"), seat: 2, role: "DON" },
      ],
    });

    const rows = await statsRows(t, player);
    expect(rows).toHaveLength(2);

    const japanese = rowFor(rows, "japanese_mafia");
    const sports = rowFor(rows, "sports_mafia");

    expect(japanese).toMatchObject({ totalMatches: 1, wins: 1, losses: 0 });
    expect(sports).toMatchObject({ totalMatches: 1, wins: 0, losses: 1 });

    // The streak is the sharpest case: a Sports loss must not reset a Japanese
    // win streak, because they are not the same run of games.
    expect(japanese?.currentStreak).toBe(1);
    expect(sports?.currentStreak).toBe(0);

    // Roles are per variant too — CITIZEN exists in both decks and would
    // otherwise be summed into one meaningless entry.
    expect(japanese?.roleStats).toEqual([
      { role: "CITIZEN", matches: 1, wins: 1, losses: 0 },
    ]);
    expect(sports?.roleStats).toEqual([
      { role: "CITIZEN", matches: 1, wins: 0, losses: 1 },
    ]);
  });

  it("does not double-count when a game is archived twice", async () => {
    const t = convexTest(schema, modules);
    const player = await createPlayer(t, "twice");

    const seats = [
      { playerId: player, seat: 1, role: "CITIZEN" },
      { playerId: await createPlayer(t, "twice-don"), seat: 2, role: "DON" },
    ];
    const first = await seedAndArchive(t, {
      gameType: "japanese_mafia",
      winner: "citizens",
      code: "JP0002",
      seats,
    });

    // `finishGame` and an admin force-end can both reach the archive; the
    // idempotency guard is what keeps the second call a no-op.
    const gameId = await t.run(
      async (ctx) => (await ctx.db.get(first))!.gameId,
    );
    const second = await t.run((ctx) => archiveGameLog(ctx, gameId));

    expect(second).toEqual(first);
    const rows = await statsRows(t, player);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ totalMatches: 1, wins: 1 });
  });
});

describe("annulGameLog — scoped to the annulled game's variant", () => {
  it("rebuilds only that variant's record", async () => {
    const t = convexTest(schema, modules);
    const player = await createPlayer(t, "annul");

    await seedAndArchive(t, {
      gameType: "japanese_mafia",
      winner: "citizens",
      code: "JP0003",
      seats: [
        { playerId: player, seat: 1, role: "CITIZEN" },
        { playerId: await createPlayer(t, "an-don"), seat: 2, role: "DON" },
      ],
    });
    const sportsLog = await seedAndArchive(t, {
      gameType: "sports_mafia",
      winner: "citizens",
      code: "SP0003",
      seats: [
        { playerId: player, seat: 1, role: "CITIZEN" },
        { playerId: await createPlayer(t, "an-don2"), seat: 2, role: "DON" },
      ],
    });

    await t.run(async (ctx) => {
      const log = (await ctx.db.get(sportsLog))!;
      await annulGameLog(ctx, log);
    });

    const rows = await statsRows(t, player);
    expect(rows).toHaveLength(2);

    // The annulled Sports win becomes a no-contest…
    expect(rowFor(rows, "sports_mafia")).toMatchObject({
      totalMatches: 1,
      wins: 0,
      losses: 0,
      noContests: 1,
    });
    // …and the Japanese record is untouched. Before the split, this recompute
    // rewrote the player's ONE row and took the other variant's games with it.
    expect(rowFor(rows, "japanese_mafia")).toMatchObject({
      totalMatches: 1,
      wins: 1,
      noContests: 0,
    });
  });
});

describe("archiveGameLog — rating stays per variant", () => {
  it("rates a rated variant and skips an unrated one", async () => {
    const t = convexTest(schema, modules);
    const player = await createPlayer(t, "rated");

    await seedAndArchive(t, {
      gameType: "japanese_mafia",
      winner: "citizens",
      code: "JP0004",
      seats: [
        { playerId: player, seat: 1, role: "CITIZEN" },
        { playerId: await createPlayer(t, "r-don"), seat: 2, role: "DON" },
      ],
    });
    await seedAndArchive(t, {
      gameType: "sports_mafia",
      winner: "citizens",
      code: "SP0004",
      seats: [
        { playerId: player, seat: 1, role: "CITIZEN" },
        { playerId: await createPlayer(t, "r-don2"), seat: 2, role: "DON" },
      ],
    });

    const ratings = await t.run((ctx) =>
      ctx.db
        .query("playerRatings")
        .withIndex("by_playerId_gameType", (q) => q.eq("playerId", player))
        .collect(),
    );

    // Japanese is rated: a citizens win at a table sitting at the 1000 default
    // is the base payout with no table adjustment (/docs/variants/japanese/rating.md §2).
    expect(ratings).toHaveLength(1);
    expect(ratings[0]).toMatchObject({
      gameType: "japanese_mafia",
      rating: 1054,
    });

    // Sports has no RATING_CONFIG entry yet, so it is silently unrated — a
    // deliberate, valid state (/docs/ranking-system.md §13). This expectation
    // flips when the Sports config lands.
    expect(ratings.some((r) => r.gameType === "sports_mafia")).toBe(false);

    const logRows = await t.run((ctx) =>
      ctx.db
        .query("gameLogPlayers")
        .withIndex("by_playerId", (q) => q.eq("playerId", player))
        .collect(),
    );
    const japaneseRow = logRows.find((r) => r.gameType === "japanese_mafia");
    const sportsRow = logRows.find((r) => r.gameType === "sports_mafia");
    expect(japaneseRow?.ratingDelta).toBe(54);
    expect(sportsRow?.ratingDelta).toBeUndefined();
  });
});
