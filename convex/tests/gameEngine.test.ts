// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api } from "../_generated/api";
import {
  enterNightPhase,
  enterDayPhase,
  enterVotingPhase,
} from "../lib/phaseTransitions";
import { recordWinnerIfDecided } from "../lib/games";
import { JAPANESE_MAFIA_ROLE_DISTRIBUTION } from "../lib/constants";

/**
 * CONVEX-TEST INTEGRATION — the DB-coupled game engine (regression oracle).
 *
 * Lives under convex/tests/ (Convex ignores *.test.ts — any basename with >1
 * dot is skipped by the bundler) and globs the whole convex/ tree via "../**"
 * so `import.meta.glob` maps to the real function graph. Runs in the
 * edge-runtime environment (see the docblock above), which convex-test requires.
 *
 * These pin the behavior that the game-types refactor makes variant-specific
 * (docs/game-types.md §2.3 night model, §1 win detection & phase transitions):
 * night kill authority, night kill resolution, and the enter*Phase transitions
 * with their embedded win check. As the logic moves into
 * convex/games/japanese/*, only imports/api paths change — not the assertions.
 */

// Glob the whole convex/ tree from this subdirectory. convex-test derives the
// module root from the "_generated" key, so the "../" prefix is stripped and
// api paths (e.g. api.game.nightPhase) resolve correctly.
const modules = import.meta.glob("../**/*.*s");

type SeatSpec = { seat: number; role: string; alive?: boolean };

type PlayerRef = {
  accountId: string;
  seat: number;
  role: string;
  playerId: import("../_generated/dataModel").Id<"profiles">;
};

type Seeded = {
  gameId: import("../_generated/dataModel").Id<"games">;
  hostAccountId: string;
  byRole: Record<string, PlayerRef>;
  bySeat: Record<number, PlayerRef>;
};

async function seedGame(
  t: TestConvex<typeof schema>,
  opts: {
    phase?: string;
    currentNightNumber?: number;
    players: SeatSpec[];
    night?: {
      mafiaTarget?: number;
      yakuzaTarget?: number;
      healedPlayer?: number;
    };
  },
): Promise<Seeded> {
  return await t.run(async (ctx) => {
    const hostAccountId = "host-acc";
    const hostId = await ctx.db.insert("profiles", {
      accountId: hostAccountId,
      nickname: "Host",
      verified: true,
      createdAt: 0,
      updatedAt: 0,
    });
    const gameId = await ctx.db.insert("games", {
      code: "TEST01",
      name: "Test Game",
      hostId,
      gameType: "japanese_mafia",
      gameStatus: "playing",
      maxPlayers: 12,
      isPrivate: false,
    });
    await ctx.db.insert("gameSessions", {
      gameId,
      gamePhase: opts.phase ?? "night_phase",
      isFinished: false,
      currentNightNumber: opts.currentNightNumber ?? 1,
      nominatedPlayers: [],
      speakingOrder: [],
    });

    const byRole: Seeded["byRole"] = {};
    const bySeat: Seeded["bySeat"] = {};
    for (const p of opts.players) {
      const accountId = `acc-${p.seat}`;
      const playerId = await ctx.db.insert("profiles", {
        accountId,
        nickname: `P${p.seat}`,
        verified: true,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert("gamePlayers", {
        gameId,
        playerId,
        nickname: `P${p.seat}`,
        seatNumber: p.seat,
        isAlive: p.alive ?? true,
        fouls: 0,
      });
      await ctx.db.insert("gamePlayerRoles", {
        gameId,
        playerId,
        role: p.role,
      });
      const ref: PlayerRef = {
        accountId,
        seat: p.seat,
        role: p.role,
        playerId,
      };
      byRole[p.role] = ref;
      bySeat[p.seat] = ref;
    }

    if (opts.night) {
      await ctx.db.insert("nightPhaseSessions", {
        gameId,
        nightNumber: opts.currentNightNumber ?? 1,
        ...opts.night,
      });
    }

    return { gameId, hostAccountId, byRole, bySeat };
  });
}

function getSession(t: TestConvex<typeof schema>, gameId: Seeded["gameId"]) {
  return t.run(async (ctx) =>
    ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique(),
  );
}

// A full, balanced roster (N=8 alive) for which the win check always returns
// null, so transitions actually proceed instead of pausing on a win.
const WIN_SAFE_ROSTER: SeatSpec[] = [
  { seat: 1, role: "DON" },
  { seat: 2, role: "MAFIA" },
  { seat: 3, role: "MAFIA_RIGHT_HAND" },
  { seat: 4, role: "YAKUZA" },
  { seat: 5, role: "SHOGUN" },
  { seat: 6, role: "DETECTIVE" },
  { seat: 7, role: "DOCTOR" },
  { seat: 8, role: "CITIZEN" },
];

// ===========================================================================
// Night kill authority (DON > RH > MAFIA; SHOGUN > YAKUZA; lone SHOGUN can't kill)
// ===========================================================================

describe("night kill authority", () => {
  it("mafia authority is DON when the DON is alive", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA_RIGHT_HAND" },
        { seat: 3, role: "MAFIA" },
      ],
    });
    const asDon = await t
      .withIdentity({ subject: s.byRole.DON.accountId })
      .query(api.game.nightPhase.checkMafiaAuthority, { gameId: s.gameId });
    expect(asDon).toEqual({ hasAuthority: true, role: "DON" });

    const asMafia = await t
      .withIdentity({ subject: s.byRole.MAFIA.accountId })
      .query(api.game.nightPhase.checkMafiaAuthority, { gameId: s.gameId });
    expect(asMafia).toEqual({ hasAuthority: false, role: "DON" });
  });

  it("mafia authority falls to the RIGHT_HAND when the DON is dead", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 1, role: "DON", alive: false },
        { seat: 2, role: "MAFIA_RIGHT_HAND" },
        { seat: 3, role: "MAFIA" },
      ],
    });
    const asRh = await t
      .withIdentity({ subject: s.byRole.MAFIA_RIGHT_HAND.accountId })
      .query(api.game.nightPhase.checkMafiaAuthority, { gameId: s.gameId });
    expect(asRh).toEqual({ hasAuthority: true, role: "MAFIA_RIGHT_HAND" });
  });

  it("mafia authority falls to a plain MAFIA when DON and RIGHT_HAND are dead", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 1, role: "DON", alive: false },
        { seat: 2, role: "MAFIA_RIGHT_HAND", alive: false },
        { seat: 3, role: "MAFIA" },
      ],
    });
    const asMafia = await t
      .withIdentity({ subject: s.byRole.MAFIA.accountId })
      .query(api.game.nightPhase.checkMafiaAuthority, { gameId: s.gameId });
    expect(asMafia).toEqual({ hasAuthority: true, role: "MAFIA" });
  });

  it("yakuza authority is the SHOGUN while the YAKUZA is alive", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 4, role: "YAKUZA" },
        { seat: 5, role: "SHOGUN" },
      ],
    });
    const asShogun = await t
      .withIdentity({ subject: s.byRole.SHOGUN.accountId })
      .query(api.game.nightPhase.checkYakuzaAuthority, { gameId: s.gameId });
    expect(asShogun).toEqual({ hasAuthority: true, role: "SHOGUN" });

    const asYakuza = await t
      .withIdentity({ subject: s.byRole.YAKUZA.accountId })
      .query(api.game.nightPhase.checkYakuzaAuthority, { gameId: s.gameId });
    expect(asYakuza).toEqual({ hasAuthority: false, role: "SHOGUN" });
  });

  it("yakuza authority falls to the YAKUZA when the SHOGUN is dead", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 4, role: "YAKUZA" },
        { seat: 5, role: "SHOGUN", alive: false },
      ],
    });
    const asYakuza = await t
      .withIdentity({ subject: s.byRole.YAKUZA.accountId })
      .query(api.game.nightPhase.checkYakuzaAuthority, { gameId: s.gameId });
    expect(asYakuza).toEqual({ hasAuthority: true, role: "YAKUZA" });
  });

  it("a lone SHOGUN (YAKUZA dead) has NO kill authority", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 4, role: "YAKUZA", alive: false },
        { seat: 5, role: "SHOGUN" },
      ],
    });
    const asShogun = await t
      .withIdentity({ subject: s.byRole.SHOGUN.accountId })
      .query(api.game.nightPhase.checkYakuzaAuthority, { gameId: s.gameId });
    expect(asShogun).toEqual({ hasAuthority: false, role: null });
  });

  it("doctor heal authority is the living DOCTOR", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      players: [
        { seat: 7, role: "DOCTOR" },
        { seat: 8, role: "CITIZEN" },
      ],
    });
    const asDoctor = await t
      .withIdentity({ subject: s.byRole.DOCTOR.accountId })
      .query(api.game.nightPhase.checkDoctorAuthority, { gameId: s.gameId });
    expect(asDoctor.hasAuthority).toBe(true);
    expect(asDoctor.role).toBe("DOCTOR");
  });
});

// ===========================================================================
// Kill resolution — startFarewellSpeech (the shared resolveKills seam)
// ===========================================================================

describe("night kill resolution (startFarewellSpeech)", () => {
  const callStart = (t: TestConvex<typeof schema>, s: Seeded) =>
    t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.farewellSpeech.startFarewellSpeech, {
        gameId: s.gameId,
      });

  it("kills a single mafia target and enters farewell_speech", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "doctor_heals_player",
      players: WIN_SAFE_ROSTER,
      night: { mafiaTarget: 8 },
    });
    const result = await callStart(t, s);
    expect(result).toEqual({ skipToDay: false });

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("farewell_speech");
    expect(session?.speakingOrder).toEqual([8]);
  });

  it("skips to day when the doctor healed the mafia's target", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "doctor_heals_player",
      players: WIN_SAFE_ROSTER,
      night: { mafiaTarget: 8, healedPlayer: 8 },
    });
    const result = await callStart(t, s);
    expect(result).toEqual({ skipToDay: true });

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("day_phase");
  });

  it("kills both the mafia and yakuza targets when distinct", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "doctor_heals_player",
      players: WIN_SAFE_ROSTER,
      night: { mafiaTarget: 6, yakuzaTarget: 8 },
    });
    const result = await callStart(t, s);
    expect(result).toEqual({ skipToDay: false });

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("farewell_speech");
    expect(new Set(session?.speakingOrder)).toEqual(new Set([6, 8]));
    expect(session?.speakingOrder).toHaveLength(2);
  });

  it("de-duplicates when mafia and yakuza pick the same target", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "doctor_heals_player",
      players: WIN_SAFE_ROSTER,
      night: { mafiaTarget: 8, yakuzaTarget: 8 },
    });
    const result = await callStart(t, s);
    expect(result).toEqual({ skipToDay: false });

    const session = await getSession(t, s.gameId);
    expect(session?.speakingOrder).toEqual([8]);
  });

  it("skips to day when there were no kills", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "doctor_heals_player",
      players: WIN_SAFE_ROSTER,
      night: {},
    });
    const result = await callStart(t, s);
    expect(result).toEqual({ skipToDay: true });

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("day_phase");
  });

  it("rejects a non-host caller", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "doctor_heals_player",
      players: WIN_SAFE_ROSTER,
      night: { mafiaTarget: 8 },
    });
    await expect(
      t
        .withIdentity({ subject: s.byRole.DON.accountId })
        .mutation(api.game.farewellSpeech.startFarewellSpeech, {
          gameId: s.gameId,
        }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// Phase transitions + embedded win check (enterNight / enterDay / enterVoting)
// ===========================================================================

describe("phase transitions + win check", () => {
  it("enterNightPhase resets state and increments the night number", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      currentNightNumber: 1,
      players: WIN_SAFE_ROSTER,
    });

    const winner = await t.run((ctx) => enterNightPhase(ctx, s.gameId));
    expect(winner).toBeNull();

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("night_phase");
    expect(session?.currentNightNumber).toBe(2);
    expect(session?.speakingOrder).toEqual([]);
    expect(session?.nominatedPlayers).toEqual([]);
    expect(session?.foulEliminationOccurred).toBe(false);

    const nightSession = await t.run((ctx) =>
      ctx.db
        .query("nightPhaseSessions")
        .withIndex("by_gameId_nightNumber", (q) =>
          q.eq("gameId", s.gameId).eq("nightNumber", 2),
        )
        .unique(),
    );
    expect(nightSession).not.toBeNull();
  });

  it("enterNightPhase pauses (records winner, no transition) when a faction has won", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      currentNightNumber: 1,
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "MAFIA_RIGHT_HAND" },
      ],
    });

    const winner = await t.run((ctx) => enterNightPhase(ctx, s.gameId));
    expect(winner).toBe("mafia");

    const session = await getSession(t, s.gameId);
    expect(session?.winner).toBe("mafia");
    expect(session?.gamePhase).toBe("day_phase"); // unchanged — paused on the win
    expect(session?.currentNightNumber).toBe(1); // not incremented
  });

  it("enterDayPhase transitions to day when the game continues", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "farewell_speech",
      players: WIN_SAFE_ROSTER,
    });

    const winner = await t.run((ctx) => enterDayPhase(ctx, s.gameId));
    expect(winner).toBeNull();

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("day_phase");
  });

  it("enterDayPhase pauses on a decided win", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "farewell_speech",
      players: [
        { seat: 1, role: "CITIZEN" },
        { seat: 2, role: "DETECTIVE" },
        { seat: 3, role: "DOCTOR" },
      ],
    });

    const winner = await t.run((ctx) => enterDayPhase(ctx, s.gameId));
    expect(winner).toBe("citizens");

    const session = await getSession(t, s.gameId);
    expect(session?.winner).toBe("citizens");
    expect(session?.gamePhase).toBe("farewell_speech"); // unchanged
  });

  it("enterVotingPhase creates a voting session with the given candidates", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "nominated_players_speak",
      players: WIN_SAFE_ROSTER,
    });

    await t.run((ctx) => enterVotingPhase(ctx, s.gameId, [2, 5]));

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("voting");

    const voting = await t.run((ctx) =>
      ctx.db
        .query("votingSessions")
        .withIndex("by_gameId", (q) => q.eq("gameId", s.gameId))
        .unique(),
    );
    expect(voting?.candidates).toEqual([2, 5]);
  });

  it("recordWinnerIfDecided records a no_contest when nobody is left alive", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON", alive: false },
        { seat: 2, role: "CITIZEN", alive: false },
      ],
    });

    const outcome = await t.run((ctx) =>
      recordWinnerIfDecided(ctx, s.gameId, "beforeDay"),
    );
    expect(outcome).toBe("no_contest");

    const session = await getSession(t, s.gameId);
    expect(session?.winner).toBe("no_contest");
  });

  it("recordWinnerIfDecided is idempotent once a winner is recorded", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "MAFIA_RIGHT_HAND" },
      ],
    });

    const first = await t.run((ctx) =>
      recordWinnerIfDecided(ctx, s.gameId, "beforeNight"),
    );
    const second = await t.run((ctx) =>
      recordWinnerIfDecided(ctx, s.gameId, "beforeNight"),
    );
    expect(first).toBe("mafia");
    expect(second).toBe("mafia");
  });
});

// ===========================================================================
// Role deal (deck = def.roleDistribution) + right-hand promotion (Japanese)
// ===========================================================================

describe("role deal (assignRandomRoles)", () => {
  it("deals exactly the Japanese 12-card distribution, one role per seated player", async () => {
    const t = convexTest(schema, modules);
    // 12 seated players (placeholder roles get overwritten by the deal).
    const players: SeatSpec[] = Array.from({ length: 12 }, (_, i) => ({
      seat: i + 1,
      role: "CITIZEN",
    }));
    const s = await seedGame(t, { phase: "picking_roles", players });

    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.sessions.assignRandomRoles, { gameId: s.gameId });

    const dealt = await t.run(async (ctx) =>
      (
        await ctx.db
          .query("gamePlayerRoles")
          .withIndex("by_gameId", (q) => q.eq("gameId", s.gameId))
          .collect()
      ).map((r) => r.role),
    );

    expect(dealt.slice().sort()).toEqual(
      [...JAPANESE_MAFIA_ROLE_DISTRIBUTION].sort(),
    );
  });

  it("rejects a non-host caller", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "picking_roles",
      players: [{ seat: 1, role: "CITIZEN" }],
    });
    await expect(
      t
        .withIdentity({ subject: s.bySeat[1].accountId })
        .mutation(api.game.sessions.assignRandomRoles, { gameId: s.gameId }),
    ).rejects.toThrow();
  });
});

describe("right-hand promotion (promoteToRightHand)", () => {
  const baseRoster: SeatSpec[] = [
    { seat: 1, role: "DON" },
    { seat: 2, role: "MAFIA" },
    { seat: 3, role: "MAFIA" },
    { seat: 4, role: "DETECTIVE" },
  ];

  it("promotes a MAFIA to MAFIA_RIGHT_HAND when the Don chooses during the right phase", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "don_chooses_right_hand",
      players: baseRoster,
    });

    await t
      .withIdentity({ subject: s.byRole.DON.accountId })
      .mutation(api.game.roles.promoteToRightHand, {
        gameId: s.gameId,
        targetPlayerId: s.bySeat[2].playerId,
      });

    const role = await t.run(async (ctx) =>
      ctx.db
        .query("gamePlayerRoles")
        .withIndex("by_gameId_playerId", (q) =>
          q.eq("gameId", s.gameId).eq("playerId", s.bySeat[2].playerId),
        )
        .unique(),
    );
    expect(role?.role).toBe("MAFIA_RIGHT_HAND");
  });

  it("rejects a non-Don caller", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "don_chooses_right_hand",
      players: baseRoster,
    });
    await expect(
      t
        .withIdentity({ subject: s.bySeat[2].accountId })
        .mutation(api.game.roles.promoteToRightHand, {
          gameId: s.gameId,
          targetPlayerId: s.bySeat[3].playerId,
        }),
    ).rejects.toThrow();
  });

  it("rejects promoting a non-MAFIA target", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "don_chooses_right_hand",
      players: baseRoster,
    });
    await expect(
      t
        .withIdentity({ subject: s.byRole.DON.accountId })
        .mutation(api.game.roles.promoteToRightHand, {
          gameId: s.gameId,
          targetPlayerId: s.bySeat[4].playerId, // DETECTIVE
        }),
    ).rejects.toThrow();
  });

  it("rejects a second promotion once a RIGHT_HAND exists", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "don_chooses_right_hand",
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "MAFIA_RIGHT_HAND" },
      ],
    });
    await expect(
      t
        .withIdentity({ subject: s.byRole.DON.accountId })
        .mutation(api.game.roles.promoteToRightHand, {
          gameId: s.gameId,
          targetPlayerId: s.bySeat[2].playerId,
        }),
    ).rejects.toThrow();
  });

  it("rejects promotion outside the don_chooses_right_hand phase", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "mafia_meet",
      players: baseRoster,
    });
    await expect(
      t
        .withIdentity({ subject: s.byRole.DON.accountId })
        .mutation(api.game.roles.promoteToRightHand, {
          gameId: s.gameId,
          targetPlayerId: s.bySeat[2].playerId,
        }),
    ).rejects.toThrow();
  });
});
