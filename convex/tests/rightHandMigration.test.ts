// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";

/**
 * CONVEX-TEST INTEGRATION — `migrations:mergeRetiredRightHandRole`.
 *
 * SILENT FAILURE MODE: this migration rewrites production history, and every
 * mistake it can make is invisible. Miss the `gameLogs.players[]` array and the
 * expanded roster in match history still says "Mafia Right Hand" while the list
 * card says "Mafia". Overwrite `playerStats.roleStats` instead of MERGING and a
 * player's Right Hand games vanish from their record. Get the merge arithmetic
 * wrong and their totals stop matching their per-role rows. None of it throws.
 *
 * The legacy rows are seeded DIRECTLY rather than through `archiveGameLog`,
 * because the current code can no longer produce them: `roleToFaction` does not
 * know `MAFIA_RIGHT_HAND` any more, so archiving such a seat today would store
 * `faction: "citizens"` and not resemble the historical data at all. A migration
 * test has to seed the shape it will actually meet in production.
 */

const modules = import.meta.glob("../**/*.*s");

const RETIRED = "MAFIA_RIGHT_HAND";

type SeededLegacy = {
  playerId: Id<"profiles">;
  otherPlayerId: Id<"profiles">;
  gameLogId: Id<"gameLogs">;
};

/**
 * One finished Japanese game whose seat 2 was a promoted Right Hand, archived
 * the way the pre-removal code would have: `role` says the retired name and
 * `faction` already says "mafia".
 */
async function seedLegacyArchive(
  t: TestConvex<typeof schema>,
): Promise<SeededLegacy> {
  return await t.run(async (ctx) => {
    const playerId = await ctx.db.insert("profiles", {
      accountId: "acc-rh",
      nickname: "RightHand",
      verified: true,
      createdAt: 0,
      updatedAt: 0,
    });
    const otherPlayerId = await ctx.db.insert("profiles", {
      accountId: "acc-other",
      nickname: "Other",
      verified: true,
      createdAt: 0,
      updatedAt: 0,
    });
    const gameId = await ctx.db.insert("games", {
      code: "LEGACY",
      name: "Legacy Game",
      hostId: otherPlayerId,
      gameType: "japanese_mafia",
      gameStatus: "finished",
      maxPlayers: 12,
      isPrivate: false,
    });

    const gameLogId = await ctx.db.insert("gameLogs", {
      gameId,
      gameCode: "LEGACY",
      gameName: "Legacy Game",
      gameType: "japanese_mafia",
      hostId: otherPlayerId,
      hostNickname: "Other",
      startedAt: 0,
      finishedAt: 1_000,
      winner: "mafia",
      // The endgame headline role: a Right Hand who won the 1v1.
      winMethod: {
        faction: "mafia",
        aliveTotal: 2,
        mafiaAlive: 1,
        yakuzaAlive: false,
        shogunAlive: false,
        decidedRole: RETIRED,
      },
      players: [
        {
          playerId: otherPlayerId,
          nickname: "Other",
          seatNumber: 1,
          role: "DON",
          isAlive: false,
        },
        {
          playerId,
          nickname: "RightHand",
          seatNumber: 2,
          role: RETIRED,
          isAlive: true,
        },
      ],
    });

    await ctx.db.insert("gameLogPlayers", {
      gameLogId,
      gameId,
      playerId,
      nickname: "RightHand",
      role: RETIRED,
      seatNumber: 2,
      isAlive: true,
      startedAt: 0,
      finishedAt: 1_000,
      faction: "mafia", // already correct — the migration must not touch it
      outcome: "win",
      winner: "mafia",
      gameType: "japanese_mafia",
      gameName: "Legacy Game",
    });

    // A second game the same player held plain MAFIA in, so the merge has
    // something to merge INTO rather than just renaming a lone entry.
    await ctx.db.insert("gameLogPlayers", {
      gameLogId,
      gameId,
      playerId,
      nickname: "RightHand",
      role: "MAFIA",
      seatNumber: 2,
      isAlive: false,
      startedAt: 2_000,
      finishedAt: 3_000,
      faction: "mafia",
      outcome: "loss",
      winner: "citizens",
      gameType: "japanese_mafia",
      gameName: "Legacy Game 2",
    });

    // The stats row as the pre-removal incremental path would have left it:
    // two separate per-role entries.
    await ctx.db.insert("playerStats", {
      playerId,
      gameType: "japanese_mafia",
      totalMatches: 2,
      wins: 1,
      losses: 1,
      noContests: 0,
      currentStreak: 0,
      bestStreak: 1,
      roleStats: [
        { role: RETIRED, matches: 1, wins: 1, losses: 0 },
        { role: "MAFIA", matches: 1, wins: 0, losses: 1 },
      ],
    });

    // An unrelated player's row that must come out byte-identical.
    await ctx.db.insert("playerStats", {
      playerId: otherPlayerId,
      gameType: "japanese_mafia",
      totalMatches: 1,
      wins: 0,
      losses: 1,
      noContests: 0,
      currentStreak: 0,
      bestStreak: 0,
      roleStats: [{ role: "DON", matches: 1, wins: 0, losses: 1 }],
    });

    return { playerId, otherPlayerId, gameLogId };
  });
}

const readStats = (t: TestConvex<typeof schema>, playerId: Id<"profiles">) =>
  t.run((ctx) =>
    ctx.db
      .query("playerStats")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .unique(),
  );

describe("mergeRetiredRightHandRole — dry run", () => {
  it("reports what it would do and writes nothing", async () => {
    const t = convexTest(schema, modules);
    const s = await seedLegacyArchive(t);

    const report = await t.mutation(
      internal.migrations.mergeRetiredRightHandRole,
      {},
    );

    expect(report).toMatchObject({
      mode: "dry-run",
      logPlayerRows: 1,
      rostersRewritten: 1,
      decidedRolesRewritten: 1,
      statsRowsAffected: 1,
      statsRowsMissing: 0,
      playersAffected: 1,
    });

    // Nothing moved.
    const rows = await t.run((ctx) => ctx.db.query("gameLogPlayers").collect());
    expect(rows.some((r) => r.role === RETIRED)).toBe(true);
    const stats = await readStats(t, s.playerId);
    expect(stats?.roleStats.some((r) => r.role === RETIRED)).toBe(true);
  });
});

describe("mergeRetiredRightHandRole — apply", () => {
  it("rewrites all four places and merges the per-role entry", async () => {
    const t = convexTest(schema, modules);
    const s = await seedLegacyArchive(t);

    await t.mutation(internal.migrations.mergeRetiredRightHandRole, {
      apply: true,
    });

    // 1. history rows
    const rows = await t.run((ctx) => ctx.db.query("gameLogPlayers").collect());
    expect(rows.some((r) => r.role === RETIRED)).toBe(false);
    expect(rows.filter((r) => r.role === "MAFIA")).toHaveLength(2);
    // faction/outcome are untouched — this is a relabel, not a recount.
    expect(rows.every((r) => r.faction === "mafia")).toBe(true);

    // 2 & 3. parent roster + endgame headline role
    const log = await t.run((ctx) => ctx.db.get(s.gameLogId));
    expect(log?.players.map((p) => p.role).sort()).toEqual(["DON", "MAFIA"]);
    expect(log?.winMethod?.decidedRole).toBe("MAFIA");
    // The counts the win method recorded are unchanged.
    expect(log?.winMethod?.mafiaAlive).toBe(1);

    // 4. the merge: 1 win as Right Hand + 1 loss as Mafia = one MAFIA entry.
    const stats = await readStats(t, s.playerId);
    expect(stats?.roleStats).toEqual([
      { role: "MAFIA", matches: 2, wins: 1, losses: 1 },
    ]);
    // Totals were never role-dependent and must not have drifted.
    expect(stats).toMatchObject({
      totalMatches: 2,
      wins: 1,
      losses: 1,
      noContests: 0,
    });
  });

  it("leaves an unrelated player's stats row untouched", async () => {
    const t = convexTest(schema, modules);
    const s = await seedLegacyArchive(t);
    const before = await readStats(t, s.otherPlayerId);

    await t.mutation(internal.migrations.mergeRetiredRightHandRole, {
      apply: true,
    });

    expect(await readStats(t, s.otherPlayerId)).toEqual(before);
  });

  it("is idempotent — a second run finds nothing to do", async () => {
    const t = convexTest(schema, modules);
    const s = await seedLegacyArchive(t);

    await t.mutation(internal.migrations.mergeRetiredRightHandRole, {
      apply: true,
    });
    const after = await readStats(t, s.playerId);

    const second = await t.mutation(
      internal.migrations.mergeRetiredRightHandRole,
      { apply: true },
    );

    expect(second).toMatchObject({
      logPlayerRows: 0,
      rostersRewritten: 0,
      decidedRolesRewritten: 0,
      statsRowsAffected: 0,
      playersAffected: 0,
    });
    expect(await readStats(t, s.playerId)).toEqual(after);
  });

  it("reports zeros on a deployment that never dealt the role", async () => {
    const t = convexTest(schema, modules);
    const report = await t.mutation(
      internal.migrations.mergeRetiredRightHandRole,
      { apply: true },
    );
    expect(report).toMatchObject({
      logPlayerRows: 0,
      rostersRewritten: 0,
      statsRowsAffected: 0,
      playersAffected: 0,
    });
  });
});
