// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { convexTest, type TestConvex } from "convex-test";
import { describe, it, expect } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import {
  enterNightPhase,
  enterDayPhase,
  enterVotingPhase,
} from "../lib/phaseTransitions";
import { recordWinnerIfDecided } from "../lib/games";
import { JAPANESE_MAFIA_ROLE_DISTRIBUTION } from "../lib/constants";
import { SPORTS_MAFIA_ROLE_DISTRIBUTION } from "../games/sports/roles";

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
    gameType?: "japanese_mafia" | "sports_mafia" | "city_mafia";
    players: SeatSpec[];
    night?: {
      mafiaTarget?: number;
      yakuzaTarget?: number;
      healedPlayer?: number;
      mafiaTargetSelections?: { mafiaSeat: number; targetSeat: number }[];
      mafiaTargetWindowActive?: boolean;
      mafiaTargetWindowStartedAt?: string;
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
      gameType: opts.gameType ?? "japanese_mafia",
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
    // Order is precomputed at day entry (the "plan"), opener set, but NOT yet
    // ignited — currentSpeakerIndex stays undefined until the host clicks Start.
    expect(session?.speakingOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(session?.dayRoundOpenerIndex).toBe(1);
    expect(session?.currentSpeakerIndex).toBeUndefined();
  });

  it("startDaySpeaking ignites the order precomputed by enterDayPhase", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "farewell_speech",
      players: WIN_SAFE_ROSTER,
    });

    await t.run((ctx) => enterDayPhase(ctx, s.gameId));
    await startDaySpeaking(t, s);

    const session = await getSession(t, s.gameId);
    // Same order, now ignited at the opener with a start timestamp.
    expect(session?.speakingOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(session?.currentSpeakerIndex).toBe(1);
    expect(session?.speakerStartedAt).toBeDefined();
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

// ===========================================================================
// G1 — Voting mechanics (SHARED engine; relocated to core/ in Phase 1).
// Pins the vote window, per-round casting, auto-vote on the last candidate,
// results tally, tie-break detection, and the both-leave threshold — the flow
// docs/game-types.md §4 keeps shared while Phase 3 layers the day-1
// single-nominee rule on top as a definition flag. Scheduler *timing*
// (endVoteWindowInternal firing after VOTE_WINDOW_MS) is infra, not game logic,
// and is out of scope; the window state changes are pinned directly.
// ===========================================================================

const VOTE_ROSTER: SeatSpec[] = [1, 2, 3, 4, 5].map((seat) => ({
  seat,
  role: "CITIZEN",
}));

function getVotingSession(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
) {
  return t.run(async (ctx) =>
    ctx.db
      .query("votingSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique(),
  );
}

function getVoteRows(
  t: TestConvex<typeof schema>,
  votingSessionId: import("../_generated/dataModel").Id<"votingSessions">,
) {
  return t.run(async (ctx) =>
    ctx.db
      .query("votes")
      .withIndex("by_votingSessionId", (q) =>
        q.eq("votingSessionId", votingSessionId),
      )
      .collect(),
  );
}

async function createVotingSession(
  t: TestConvex<typeof schema>,
  s: Seeded,
  candidates: number[],
) {
  return await t
    .withIdentity({ subject: s.hostAccountId })
    .mutation(api.game.voting.createSession, { gameId: s.gameId, candidates });
}

describe("voting — window state", () => {
  it("startVoteWindow activates voting; a second start is rejected", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);

    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.startVoteWindow, { gameId: s.gameId });

    const active = await getVotingSession(t, s.gameId);
    expect(active?.votingActive).toBe(true);
    expect(active?.votingStartedAt).toBeTruthy();

    await expect(
      t
        .withIdentity({ subject: s.hostAccountId })
        .mutation(api.game.voting.startVoteWindow, { gameId: s.gameId }),
    ).rejects.toThrow();
  });

  it("endVoteWindow deactivates; ending when inactive is rejected", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.startVoteWindow, { gameId: s.gameId });

    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.endVoteWindow, { gameId: s.gameId });
    expect((await getVotingSession(t, s.gameId))?.votingActive).toBe(false);

    await expect(
      t
        .withIdentity({ subject: s.hostAccountId })
        .mutation(api.game.voting.endVoteWindow, { gameId: s.gameId }),
    ).rejects.toThrow();
  });
});

describe("voting — casting votes", () => {
  it("records a vote for the current candidate", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    const vsId = await createVotingSession(t, s, [2, 5]); // currentCandidate = 2

    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.voting.castVote, { gameId: s.gameId });

    const votes = await getVoteRows(t, vsId);
    expect(votes).toHaveLength(1);
    expect(votes[0]).toMatchObject({
      voterSeat: 1,
      seatNumber: 2,
      isAutoVote: false,
      isBothLeave: false,
    });
  });

  it("rejects a duplicate vote from the same seat", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);
    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.voting.castVote, { gameId: s.gameId });

    await expect(
      t
        .withIdentity({ subject: s.bySeat[1].accountId })
        .mutation(api.game.voting.castVote, { gameId: s.gameId }),
    ).rejects.toThrow();
  });

  it("rejects a vote from a dead player", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "voting",
      players: [
        { seat: 1, role: "CITIZEN", alive: false },
        { seat: 2, role: "CITIZEN" },
        { seat: 5, role: "CITIZEN" },
      ],
    });
    await createVotingSession(t, s, [2, 5]);

    await expect(
      t
        .withIdentity({ subject: s.bySeat[1].accountId })
        .mutation(api.game.voting.castVote, { gameId: s.gameId }),
    ).rejects.toThrow();
  });
});

describe("voting — advanceCandidate auto-votes on the last candidate", () => {
  it("auto-votes every non-voter for the last candidate", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    const vsId = await createVotingSession(t, s, [2, 5]);

    // Seat 1 votes for candidate 2 (the current candidate at index 0).
    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.voting.castVote, { gameId: s.gameId });

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.advanceCandidate, { gameId: s.gameId });
    expect(res).toEqual({ allDone: false });
    expect((await getVotingSession(t, s.gameId))?.currentCandidateIndex).toBe(1);

    const votes = await getVoteRows(t, vsId);
    // Seat 1 manual → candidate 2; seats 2..5 auto → candidate 5 (the last).
    const manual = votes.filter((v) => !v.isAutoVote);
    const auto = votes.filter((v) => v.isAutoVote);
    expect(manual).toHaveLength(1);
    expect(manual[0]).toMatchObject({ voterSeat: 1, seatNumber: 2 });
    expect(auto).toHaveLength(4);
    expect(new Set(auto.map((v) => v.voterSeat))).toEqual(new Set([2, 3, 4, 5]));
    expect(auto.every((v) => v.seatNumber === 5)).toBe(true);
  });

  it("returns allDone once past the final candidate", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);
    // Park on the last candidate so the next advance runs off the end.
    await t.run(async (ctx) => {
      const vs = await ctx.db
        .query("votingSessions")
        .withIndex("by_gameId", (q) => q.eq("gameId", s.gameId))
        .unique();
      await ctx.db.patch(vs!._id, { currentCandidateIndex: 1 });
    });

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.advanceCandidate, { gameId: s.gameId });
    expect(res).toEqual({ allDone: true });
  });

  it("rejects advancing while the vote window is active", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.startVoteWindow, { gameId: s.gameId });

    await expect(
      t
        .withIdentity({ subject: s.hostAccountId })
        .mutation(api.game.voting.advanceCandidate, { gameId: s.gameId }),
    ).rejects.toThrow();
  });
});

describe("voting — processResults tally", () => {
  const seedVotes = async (
    t: TestConvex<typeof schema>,
    vsId: import("../_generated/dataModel").Id<"votingSessions">,
    rows: Array<{
      voterSeat: number;
      seatNumber?: number;
      isBothLeave?: boolean;
      isAutoVote?: boolean;
    }>,
  ) => {
    await t.run(async (ctx) => {
      for (const r of rows) {
        await ctx.db.insert("votes", {
          votingSessionId: vsId,
          voterSeat: r.voterSeat,
          seatNumber: r.seatNumber,
          isBothLeave: r.isBothLeave ?? false,
          isAutoVote: r.isAutoVote ?? false,
        });
      }
    });
  };

  it("declares a unique winner", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    const vsId = await createVotingSession(t, s, [2, 5]);
    await seedVotes(t, vsId, [
      { voterSeat: 1, seatNumber: 2 },
      { voterSeat: 3, seatNumber: 2 },
      { voterSeat: 4, seatNumber: 5 },
    ]);

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.processResults, { gameId: s.gameId });
    expect(res).toEqual({ result: "winner", winner: 2 });
  });

  it("reports a tie when the top candidates are level", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    const vsId = await createVotingSession(t, s, [2, 5]);
    await seedVotes(t, vsId, [
      { voterSeat: 1, seatNumber: 2 },
      { voterSeat: 3, seatNumber: 5 },
    ]);

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.processResults, { gameId: s.gameId });
    expect(res.result).toBe("tie");
    expect(new Set((res as { tiedCandidates: number[] }).tiedCandidates)).toEqual(
      new Set([2, 5]),
    );
  });

  it("excludes both-leave votes from the tally", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    const vsId = await createVotingSession(t, s, [2, 5]);
    await seedVotes(t, vsId, [
      { voterSeat: 1, seatNumber: 2 },
      { voterSeat: 2, isBothLeave: true },
      { voterSeat: 3, isBothLeave: true },
    ]);

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.processResults, { gameId: s.gameId });
    // Both-leave rows don't count toward any candidate → 2 wins with 1 vote.
    expect(res).toEqual({ result: "winner", winner: 2 });
  });
});

describe("voting — tie-break vs both-leave", () => {
  it("first tie-break re-opens self-justification for the tied seats", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.startTieBreak, {
        gameId: s.gameId,
        tiedCandidates: [2, 5],
      });
    expect(res).toEqual({ bothLeaveVote: false });

    const vs = await getVotingSession(t, s.gameId);
    expect(vs?.isTieBreak).toBe(true);
    expect(vs?.tieBreakRound).toBe(1);
    expect(vs?.candidates).toEqual([2, 5]);
    expect(vs?.previousTiedCandidates).toEqual([2, 5]);

    const gs = await getSession(t, s.gameId);
    expect(gs?.gamePhase).toBe("nominated_players_speak");
    expect(gs?.speakingOrder).toEqual([2, 5]);
  });

  it("a repeated tie on the same seats escalates to a both-leave vote", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "voting", players: VOTE_ROSTER });
    await createVotingSession(t, s, [2, 5]);
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.startTieBreak, {
        gameId: s.gameId,
        tiedCandidates: [2, 5],
      });

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.startTieBreak, {
        gameId: s.gameId,
        tiedCandidates: [2, 5],
      });
    expect(res).toEqual({ bothLeaveVote: true });
    expect((await getVotingSession(t, s.gameId))?.bothLeaveVoteActive).toBe(true);
  });
});

describe("voting — processBothLeaveResult threshold (>50%)", () => {
  const seedBothLeave = async (
    t: TestConvex<typeof schema>,
    vsId: import("../_generated/dataModel").Id<"votingSessions">,
    voterSeats: number[],
  ) => {
    await t.run(async (ctx) => {
      for (const voterSeat of voterSeats) {
        await ctx.db.insert("votes", {
          votingSessionId: vsId,
          voterSeat,
          isBothLeave: true,
          isAutoVote: false,
        });
      }
    });
  };

  it("passes when strictly more than half vote to leave", async () => {
    const t = convexTest(schema, modules);
    // 4 alive non-host seats.
    const s = await seedGame(t, {
      phase: "voting",
      players: [1, 2, 3, 4].map((seat) => ({ seat, role: "CITIZEN" })),
    });
    const vsId = await createVotingSession(t, s, [2, 3]);
    await seedBothLeave(t, vsId, [1, 2, 3]); // 3/4 = 0.75 > 0.5

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.processBothLeaveResult, { gameId: s.gameId });
    expect(res).toMatchObject({ allLeave: true, voteCount: 3, totalVoters: 4 });
  });

  it("does NOT pass at exactly half", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "voting",
      players: [1, 2, 3, 4].map((seat) => ({ seat, role: "CITIZEN" })),
    });
    const vsId = await createVotingSession(t, s, [2, 3]);
    await seedBothLeave(t, vsId, [1, 2]); // 2/4 = 0.5, not > 0.5

    const res = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.voting.processBothLeaveResult, { gameId: s.gameId });
    expect(res).toMatchObject({ allLeave: false, voteCount: 2, totalVoters: 4 });
  });
});

// ===========================================================================
// G3 — Card-picking flow (SHARED engine; relocated to core/ in Phase 1).
// Pins turn order, the claim → role write → advance contract, double-pick /
// out-of-turn / already-taken rejections, completion, the auto-pick watchdog
// (expireTurnInternal), its stale/complete/missing no-ops, and the role
// visibility in getState. The deck comes from JAPANESE_MAFIA_ROLE_DISTRIBUTION
// today; in the refactor it comes from `def.roleDistribution` (unchanged flow).
// ===========================================================================

const PICK_ROSTER: SeatSpec[] = [1, 2, 3].map((seat) => ({
  seat,
  role: "CITIZEN", // placeholder; overwritten by the deal
}));

function getCardSession(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
) {
  return t.run(async (ctx) =>
    ctx.db
      .query("cardPickingSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique(),
  );
}

function getDealtRole(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
  playerId: PlayerRef["playerId"],
) {
  return t.run(async (ctx) =>
    ctx.db
      .query("gamePlayerRoles")
      .withIndex("by_gameId_playerId", (q) =>
        q.eq("gameId", gameId).eq("playerId", playerId),
      )
      .unique(),
  );
}

describe("card-picking — start", () => {
  it("deals the full 12-card deck and orders picks by seat", async () => {
    const t = convexTest(schema, modules);
    const players: SeatSpec[] = Array.from({ length: 12 }, (_, i) => ({
      seat: i + 1,
      role: "CITIZEN",
    }));
    const s = await seedGame(t, { phase: "night_phase", players });

    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    const cs = await getCardSession(t, s.gameId);
    expect(cs?.pickOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(cs?.currentPickIndex).toBe(0);
    expect(cs?.isComplete).toBe(false);
    expect(cs?.currentTurnStartedAt).toBeTruthy();
    expect(cs?.deck.map((c) => c.role).sort()).toEqual(
      [...JAPANESE_MAFIA_ROLE_DISTRIBUTION].sort(),
    );

    const gs = await getSession(t, s.gameId);
    expect(gs?.gamePhase).toBe("picking_roles");
  });

  it("deals a subset deck for a partial lobby", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    const cs = await getCardSession(t, s.gameId);
    expect(cs?.deck).toHaveLength(3);
    expect(cs?.pickOrder).toEqual([1, 2, 3]);
    for (const card of cs!.deck) {
      expect(JAPANESE_MAFIA_ROLE_DISTRIBUTION).toContain(card.role);
    }
  });

  it("deals the SPORTS deck for a sports_mafia game (not the Japanese deck)", async () => {
    const t = convexTest(schema, modules);
    const players: SeatSpec[] = Array.from({ length: 10 }, (_, i) => ({
      seat: i + 1,
      role: "CITIZEN",
    }));
    const s = await seedGame(t, {
      phase: "night_phase",
      gameType: "sports_mafia",
      players,
    });

    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    const cs = await getCardSession(t, s.gameId);
    expect(cs?.pickOrder).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(cs?.deck.map((c) => c.role).sort()).toEqual(
      [...SPORTS_MAFIA_ROLE_DISTRIBUTION].sort(),
    );
    // No Japanese-only roles leak into a Sports deck.
    for (const card of cs!.deck) {
      expect(["SHOGUN", "YAKUZA", "DOCTOR", "MAFIA_RIGHT_HAND"]).not.toContain(
        card.role,
      );
    }
  });

  it("is idempotent — a second start returns the same session", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    const first = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });
    const second = await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });
    expect(second).toBe(first);
  });

  it("rejects a non-host caller", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await expect(
      t
        .withIdentity({ subject: s.bySeat[1].accountId })
        .mutation(api.game.cardPicking.start, { gameId: s.gameId }),
    ).rejects.toThrow();
  });
});

describe("card-picking — pickCard turn contract", () => {
  it("claims a card in turn, writes the role, and advances the pick index", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    const before = await getCardSession(t, s.gameId);
    const card1Role = before!.deck.find((c) => c.cardId === "card_1")!.role;

    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.cardPicking.pickCard, {
        gameId: s.gameId,
        cardId: "card_1",
      });

    const after = await getCardSession(t, s.gameId);
    expect(after?.currentPickIndex).toBe(1);
    expect(after?.deck.find((c) => c.cardId === "card_1")?.claimedBySeat).toBe(1);

    const role = await getDealtRole(t, s.gameId, s.bySeat[1].playerId);
    expect(role?.role).toBe(card1Role);
  });

  it("rejects an out-of-turn pick, an already-taken card, and an unknown card", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    // Seat 2 is not first in the pick order.
    await expect(
      t
        .withIdentity({ subject: s.bySeat[2].accountId })
        .mutation(api.game.cardPicking.pickCard, {
          gameId: s.gameId,
          cardId: "card_1",
        }),
    ).rejects.toThrow();

    // Seat 1 claims card_1.
    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.cardPicking.pickCard, {
        gameId: s.gameId,
        cardId: "card_1",
      });

    // Seat 2 (now in turn) cannot take the already-claimed card_1.
    await expect(
      t
        .withIdentity({ subject: s.bySeat[2].accountId })
        .mutation(api.game.cardPicking.pickCard, {
          gameId: s.gameId,
          cardId: "card_1",
        }),
    ).rejects.toThrow();

    // Unknown card id.
    await expect(
      t
        .withIdentity({ subject: s.bySeat[2].accountId })
        .mutation(api.game.cardPicking.pickCard, {
          gameId: s.gameId,
          cardId: "card_999",
        }),
    ).rejects.toThrow();
  });

  it("marks the session complete after the last pick and rejects further picks", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    for (const seat of [1, 2, 3]) {
      await t
        .withIdentity({ subject: s.bySeat[seat].accountId })
        .mutation(api.game.cardPicking.pickCard, {
          gameId: s.gameId,
          cardId: `card_${seat}`,
        });
    }

    expect((await getCardSession(t, s.gameId))?.isComplete).toBe(true);

    await expect(
      t
        .withIdentity({ subject: s.bySeat[1].accountId })
        .mutation(api.game.cardPicking.pickCard, {
          gameId: s.gameId,
          cardId: "card_1",
        }),
    ).rejects.toThrow();
  });
});

describe("card-picking — expireTurnInternal watchdog", () => {
  it("auto-picks an unclaimed card for the stalled seat and advances", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });

    await t.mutation(internal.game.cardPicking.expireTurnInternal, {
      gameId: s.gameId,
      expectedPickIndex: 0,
    });

    const cs = await getCardSession(t, s.gameId);
    expect(cs?.currentPickIndex).toBe(1);
    // Seat 1 (the stalled seat) was auto-dealt exactly one role.
    const role = await getDealtRole(t, s.gameId, s.bySeat[1].playerId);
    expect(role).not.toBeNull();
    expect(cs?.deck.filter((c) => c.claimedBySeat === 1)).toHaveLength(1);
  });

  it("is a no-op on a stale pick index", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });
    // Seat 1 picks → index advances to 1.
    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.cardPicking.pickCard, {
        gameId: s.gameId,
        cardId: "card_1",
      });

    // A watchdog scheduled for index 0 fires late — must do nothing.
    await t.mutation(internal.game.cardPicking.expireTurnInternal, {
      gameId: s.gameId,
      expectedPickIndex: 0,
    });
    expect((await getCardSession(t, s.gameId))?.currentPickIndex).toBe(1);
  });

  it("is a no-op when no card-picking session exists", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await expect(
      t.mutation(internal.game.cardPicking.expireTurnInternal, {
        gameId: s.gameId,
        expectedPickIndex: 0,
      }),
    ).resolves.toBeNull();
  });
});

describe("card-picking — getState role visibility", () => {
  it("hides unclaimed/other roles from a non-host player but shows own + all to host", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: PICK_ROSTER });
    await t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.cardPicking.start, { gameId: s.gameId });
    await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .mutation(api.game.cardPicking.pickCard, {
        gameId: s.gameId,
        cardId: "card_1",
      });

    const asClaimer = await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .query(api.game.cardPicking.getState, { gameId: s.gameId });
    const claimerCard1 = asClaimer!.cards.find((c) => c.cardId === "card_1")!;
    expect(claimerCard1.claimed).toBe(true);
    expect(claimerCard1.role).not.toBeNull(); // claimer sees own role
    expect(asClaimer!.isMyTurn).toBe(false); // seat 2's turn now

    const asOther = await t
      .withIdentity({ subject: s.bySeat[2].accountId })
      .query(api.game.cardPicking.getState, { gameId: s.gameId });
    expect(
      asOther!.cards.find((c) => c.cardId === "card_1")!.role,
    ).toBeNull(); // non-claimer cannot see the claimed role
    expect(asOther!.isMyTurn).toBe(true); // seat 2 is up

    const asHost = await t
      .withIdentity({ subject: s.hostAccountId })
      .query(api.game.cardPicking.getState, { gameId: s.gameId });
    expect(asHost!.cards.every((c) => c.role !== null)).toBe(true); // host sees all
  });
});

// ===========================================================================
// G2 — Fouls (SHARED engine). Pins the server-observable foul behavior in
// `dayPhase.giveFoul`: phase gating, increment, the 4th-foul elimination
// (ELIMINATION_THRESHOLD = 4; the 3rd is a warning only), the
// `foulEliminationOccurred` flag, and the immediate `beforeNight` win check on
// elimination. This is the mechanic Phase 3 layers the Sports 3rd-foul speaking
// ban on top of (gated on `flags.thirdFoulSpeakingBan`); the 4th-foul
// elimination is retained across variants. The 5s foul-speak window itself is
// UI timing (`useFoulSpeak`) and is out of scope for this server oracle.
// ===========================================================================

function getPlayerBySeat(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
  seat: number,
) {
  return t.run(async (ctx) => {
    const players = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    return players.find((p) => p.seatNumber === seat) ?? null;
  });
}

async function setFouls(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
  seat: number,
  fouls: number,
) {
  await t.run(async (ctx) => {
    const players = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    const player = players.find((p) => p.seatNumber === seat);
    await ctx.db.patch(player!._id, { fouls });
  });
}

const giveFoul = (t: TestConvex<typeof schema>, s: Seeded, seatNumber: number) =>
  t
    .withIdentity({ subject: s.hostAccountId })
    .mutation(api.game.dayPhase.giveFoul, { gameId: s.gameId, seatNumber });

describe("fouls — giveFoul", () => {
  it("increments the count without eliminating for fouls 1–3", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "day_phase", players: WIN_SAFE_ROSTER });

    for (const expected of [1, 2, 3]) {
      const res = await giveFoul(t, s, 8);
      expect(res).toEqual({ playerEliminated: false });
      const p = await getPlayerBySeat(t, s.gameId, 8);
      expect(p?.fouls).toBe(expected);
      expect(p?.isAlive).toBe(true);
    }
  });

  it("eliminates on the 4th foul and sets foulEliminationOccurred", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "day_phase", players: WIN_SAFE_ROSTER });
    await setFouls(t, s.gameId, 8, 3);

    const res = await giveFoul(t, s, 8);
    expect(res).toMatchObject({ playerEliminated: true, winnerDecided: false });

    const p = await getPlayerBySeat(t, s.gameId, 8);
    expect(p?.fouls).toBe(4);
    expect(p?.isAlive).toBe(false);

    const session = await getSession(t, s.gameId);
    expect(session?.foulEliminationOccurred).toBe(true);
  });

  it("records the winner when a foul elimination decides the game", async () => {
    const t = convexTest(schema, modules);
    // Removing the lone citizen leaves only mafia alive (N=2, m=2 → mafia).
    const s = await seedGame(t, {
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "CITIZEN" },
      ],
    });
    await setFouls(t, s.gameId, 3, 3);

    const res = await giveFoul(t, s, 3);
    expect(res).toMatchObject({ playerEliminated: true, winnerDecided: true });

    const session = await getSession(t, s.gameId);
    expect(session?.winner).toBe("mafia");
  });

  it("rejects a foul outside the allowed phases", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "night_phase", players: WIN_SAFE_ROSTER });
    await expect(giveFoul(t, s, 8)).rejects.toThrow();
  });

  it("rejects fouling a dead player", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON" },
        { seat: 8, role: "CITIZEN", alive: false },
      ],
    });
    await expect(giveFoul(t, s, 8)).rejects.toThrow();
  });

  it("rejects fouling a player already at the elimination threshold", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "day_phase", players: WIN_SAFE_ROSTER });
    await setFouls(t, s.gameId, 8, 4);
    await expect(giveFoul(t, s, 8)).rejects.toThrow();
  });

  it("rejects a non-host caller", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, { phase: "day_phase", players: WIN_SAFE_ROSTER });
    await expect(
      t
        .withIdentity({ subject: s.bySeat[1].accountId })
        .mutation(api.game.dayPhase.giveFoul, { gameId: s.gameId, seatNumber: 8 }),
    ).rejects.toThrow();
  });
});

// ===========================================================================
// P3-T2 — Sports unanimous-vote night (docs/sports-mafia.md §5).
// The window lifecycle + per-mafia private selection (`sportsNightPhase.ts`),
// and the dawn resolution wired through the SHARED `startFarewellSpeech` (which
// branches on `definition.night.kind`). The Japanese single-authority path is
// unchanged — its kill-resolution tests above still pass.
// ===========================================================================

// DON + 2 MAFIA (living mafia) + Detective + citizens; a Sports roster.
const SPORTS_NIGHT_ROSTER: SeatSpec[] = [
  { seat: 1, role: "DON" },
  { seat: 2, role: "MAFIA" },
  { seat: 3, role: "MAFIA" },
  { seat: 4, role: "DETECTIVE" },
  { seat: 5, role: "CITIZEN" },
  { seat: 6, role: "CITIZEN" },
  { seat: 7, role: "CITIZEN" },
];

function getNightRow(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
  nightNumber = 1,
) {
  return t.run(async (ctx) =>
    ctx.db
      .query("nightPhaseSessions")
      .withIndex("by_gameId_nightNumber", (q) =>
        q.eq("gameId", gameId).eq("nightNumber", nightNumber),
      )
      .unique(),
  );
}

const openWindow = (t: TestConvex<typeof schema>, s: Seeded) =>
  t
    .withIdentity({ subject: s.hostAccountId })
    .mutation(api.game.sportsNightPhase.startMafiaTargetWindow, {
      gameId: s.gameId,
    });

const select = (t: TestConvex<typeof schema>, s: Seeded, seat: number, target: number) =>
  t
    .withIdentity({ subject: s.bySeat[seat].accountId })
    .mutation(api.game.sportsNightPhase.selectMafiaTarget, {
      gameId: s.gameId,
      targetSeatNumber: target,
    });

describe("sports night — kill-selection window & selections", () => {
  it("opens the window; a second open is rejected", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
    });

    await openWindow(t, s);
    const night = await getNightRow(t, s.gameId);
    expect(night?.mafiaTargetWindowActive).toBe(true);
    expect(night?.mafiaTargetWindowStartedAt).toBeTruthy();

    await expect(openWindow(t, s)).rejects.toThrow();
  });

  it("records a living mafia's pick and locks it one-shot (no change)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
    });
    await openWindow(t, s);

    await select(t, s, 1, 5);
    let night = await getNightRow(t, s.gameId);
    expect(night?.mafiaTargetSelections).toEqual([{ mafiaSeat: 1, targetSeat: 5 }]);

    // The pick is final (§5.3): a second call is rejected and the original stands.
    await expect(select(t, s, 1, 6)).rejects.toThrow();
    night = await getNightRow(t, s.gameId);
    expect(night?.mafiaTargetSelections).toEqual([{ mafiaSeat: 1, targetSeat: 5 }]);
  });

  it("rejects a non-mafia caller", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
    });
    await openWindow(t, s);
    await expect(select(t, s, 4, 5)).rejects.toThrow(); // seat 4 = DETECTIVE
  });

  it("rejects a selection when the window is closed", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
      night: { mafiaTargetWindowActive: false },
    });
    await expect(select(t, s, 1, 5)).rejects.toThrow();
  });

  it("rejects targeting a dead player", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: [...SPORTS_NIGHT_ROSTER, { seat: 8, role: "CITIZEN", alive: false }],
    });
    await openWindow(t, s);
    await expect(select(t, s, 1, 8)).rejects.toThrow();
  });

  it("getMySelection returns only the caller's own pick (privacy)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
    });
    await openWindow(t, s);
    await select(t, s, 1, 5); // DON → 5
    await select(t, s, 2, 6); // MAFIA(2) → 6

    const mineDon = await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .query(api.game.sportsNightPhase.getMySelection, { gameId: s.gameId });
    const mineMafia2 = await t
      .withIdentity({ subject: s.bySeat[2].accountId })
      .query(api.game.sportsNightPhase.getMySelection, { gameId: s.gameId });
    const mineMafia3 = await t
      .withIdentity({ subject: s.bySeat[3].accountId })
      .query(api.game.sportsNightPhase.getMySelection, { gameId: s.gameId });

    expect(mineDon).toBe(5); // sees own
    expect(mineMafia2).toBe(6); // sees own, NOT the Don's 5
    expect(mineMafia3).toBeNull(); // didn't pick
  });

  it("getHostSelections returns every living mafia's pick to the host only", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
    });
    await openWindow(t, s);
    await select(t, s, 1, 5); // DON → 5
    await select(t, s, 2, 6); // MAFIA(2) → 6, MAFIA(3) hasn't picked

    const hostView = await t
      .withIdentity({ subject: s.hostAccountId })
      .query(api.game.sportsNightPhase.getHostSelections, { gameId: s.gameId });

    // One row per living mafia, seat-ordered; pending mafia → targetSeat null.
    expect(hostView).toEqual([
      { mafiaSeat: 1, targetSeat: 5 },
      { mafiaSeat: 2, targetSeat: 6 },
      { mafiaSeat: 3, targetSeat: null },
    ]);

    // A non-host (even a mafia) gets nothing — the summary is host-only.
    const mafiaView = await t
      .withIdentity({ subject: s.bySeat[1].accountId })
      .query(api.game.sportsNightPhase.getHostSelections, { gameId: s.gameId });
    expect(mafiaView).toEqual([]);
  });

  it("closeMafiaTargetWindowInternal flips the window inactive", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "mafia_chooses_target",
      players: SPORTS_NIGHT_ROSTER,
    });
    await openWindow(t, s);

    await t.mutation(
      internal.game.sportsNightPhase.closeMafiaTargetWindowInternal,
      { gameId: s.gameId },
    );
    expect((await getNightRow(t, s.gameId))?.mafiaTargetWindowActive).toBe(false);
  });
});

describe("sports night — dawn resolution via startFarewellSpeech", () => {
  const startFarewell = (t: TestConvex<typeof schema>, s: Seeded) =>
    t
      .withIdentity({ subject: s.hostAccountId })
      .mutation(api.game.farewellSpeech.startFarewellSpeech, {
        gameId: s.gameId,
      });

  it("kills the target when all living mafia chose it unanimously", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "detective_checks_for_mafia",
      players: SPORTS_NIGHT_ROSTER,
      night: {
        mafiaTargetSelections: [
          { mafiaSeat: 1, targetSeat: 5 },
          { mafiaSeat: 2, targetSeat: 5 },
          { mafiaSeat: 3, targetSeat: 5 },
        ],
      },
    });

    const res = await startFarewell(t, s);
    expect(res).toEqual({ skipToDay: false });

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("farewell_speech");
    expect(session?.speakingOrder).toEqual([5]);
  });

  it("no kill (→ day) when the mafia disagree", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "detective_checks_for_mafia",
      players: SPORTS_NIGHT_ROSTER, // 7 alive → win check continues
      night: {
        mafiaTargetSelections: [
          { mafiaSeat: 1, targetSeat: 5 },
          { mafiaSeat: 2, targetSeat: 5 },
          { mafiaSeat: 3, targetSeat: 6 },
        ],
      },
    });

    const res = await startFarewell(t, s);
    expect(res).toEqual({ skipToDay: true });
    expect((await getSession(t, s.gameId))?.gamePhase).toBe("day_phase");
  });

  it("no kill (→ day) when a lone mafia abstains", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "detective_checks_for_mafia",
      players: [
        { seat: 1, role: "DON" }, // lone living mafia
        { seat: 2, role: "CITIZEN" },
        { seat: 3, role: "CITIZEN" },
        { seat: 4, role: "CITIZEN" },
        { seat: 5, role: "DETECTIVE" },
      ],
      night: { mafiaTargetSelections: [] },
    });

    const res = await startFarewell(t, s);
    expect(res).toEqual({ skipToDay: true });
    expect((await getSession(t, s.gameId))?.gamePhase).toBe("day_phase");
  });

  it("kills when a lone mafia selects (trivially unanimous)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "detective_checks_for_mafia",
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "CITIZEN" },
        { seat: 3, role: "CITIZEN" },
        { seat: 4, role: "CITIZEN" },
        { seat: 5, role: "DETECTIVE" },
      ],
      night: { mafiaTargetSelections: [{ mafiaSeat: 1, targetSeat: 5 }] },
    });

    const res = await startFarewell(t, s);
    expect(res).toEqual({ skipToDay: false });
    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("farewell_speech");
    expect(session?.speakingOrder).toEqual([5]);
  });
});

// ===========================================================================
// P3-T5 — win-check seam dispatches to definition.decideWinner/describeWin.
// For a sports_mafia game, recordWinnerIfDecided must use the parity rule and a
// 2-faction snapshot (yakuza/shogun false), NOT the Japanese tables. (For the
// current 3-mafia deck the outcome happens to coincide with Japanese on every
// reachable roster; these tests pin that the SPORTS game resolves through its
// own definition and records the Sports-shaped snapshot.)
// ===========================================================================

describe("sports win detection (recordWinnerIfDecided → definition)", () => {
  it("records a parity mafia win (3 mafia vs 3 citizens)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "MAFIA" },
        { seat: 4, role: "CITIZEN" },
        { seat: 5, role: "CITIZEN" },
        { seat: 6, role: "CITIZEN" },
      ],
    });

    const outcome = await t.run((ctx) =>
      recordWinnerIfDecided(ctx, s.gameId, "beforeDay"),
    );
    expect(outcome).toBe("mafia");

    const session = await getSession(t, s.gameId);
    expect(session?.winner).toBe("mafia");
    expect(session?.winMethod).toMatchObject({
      faction: "mafia",
      yakuzaAlive: false,
      shogunAlive: false,
    });
  });

  it("records a citizens win once all mafia are gone", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON", alive: false },
        { seat: 4, role: "CITIZEN" },
        { seat: 5, role: "DETECTIVE" },
      ],
    });
    const outcome = await t.run((ctx) =>
      recordWinnerIfDecided(ctx, s.gameId, "beforeDay"),
    );
    expect(outcome).toBe("citizens");
  });

  it("continues when mafia are below parity (1 mafia vs 2 citizens)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      players: [
        { seat: 1, role: "DON" },
        { seat: 4, role: "CITIZEN" },
        { seat: 5, role: "CITIZEN" },
      ],
    });
    const outcome = await t.run((ctx) =>
      recordWinnerIfDecided(ctx, s.gameId, "beforeDay"),
    );
    expect(outcome).toBeNull();
  });
});

// ===========================================================================
// P3-T4 — Sports single-nominee day rule (docs/sports-mafia.md §4.1), gated on
// `flags.firstDaySingleNomineeSkipsToNight`:
//   • Day 1 (night 0), one nominee → NO elimination, skip voting → night.
//   • Day 2+ (night ≥ 1), one nominee → eliminated without a vote → farewell →
//     night.
//   • Two+ nominees → identical to Japanese (self-justification speaking).
// Japanese leaves the flag false → a single nominee still goes to voting.
// ===========================================================================

async function setNominated(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
  seats: number[],
) {
  await t.run(async (ctx) => {
    const session = await ctx.db
      .query("gameSessions")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .unique();
    await ctx.db.patch(session!._id, { nominatedPlayers: seats });
  });
}

const startNominated = (t: TestConvex<typeof schema>, s: Seeded) =>
  t
    .withIdentity({ subject: s.hostAccountId })
    .mutation(api.game.dayPhase.startNominatedPlayersSpeaking, {
      gameId: s.gameId,
    });

describe("sports single-nominee day rule (startNominatedPlayersSpeaking)", () => {
  it("day 1: a lone nominee skips voting straight to night (no elimination)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 0, // first day
      players: SPORTS_NIGHT_ROSTER,
    });
    await setNominated(t, s.gameId, [5]);

    await startNominated(t, s);

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("night_phase");
    expect(session?.currentNightNumber).toBe(1); // night entered
    expect(session?.nominatedPlayers).toEqual([]); // cleared on night entry
    // The nominee is untouched — no elimination on day 1.
    expect((await getPlayerBySeat(t, s.gameId, 5))?.isAlive).toBe(true);
  });

  it("day 2+: a lone nominee is eliminated without a vote → farewell → night", async () => {
    const t = convexTest(schema, modules);
    // A 10-alive roster so eliminating one citizen (→ 3 mafia vs 6 citizens)
    // does not decide the game — the win check would otherwise pause on night.
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 1, // second day
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "MAFIA" },
        { seat: 4, role: "DETECTIVE" },
        { seat: 5, role: "CITIZEN" },
        { seat: 6, role: "CITIZEN" },
        { seat: 7, role: "CITIZEN" },
        { seat: 8, role: "CITIZEN" },
        { seat: 9, role: "CITIZEN" },
        { seat: 10, role: "CITIZEN" },
      ],
    });
    await setNominated(t, s.gameId, [5]);

    await startNominated(t, s);

    let session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("farewell_speech");
    expect(session?.speakingOrder).toEqual([5]);
    // The nominee is not dead yet — farewell kills them on markDeadAndAdvance.
    expect((await getPlayerBySeat(t, s.gameId, 5))?.isAlive).toBe(true);

    // Drive the farewell to completion: the eliminated player speaks, dies, and
    // (nominatedPlayers non-empty) the game advances to night.
    const asHost = t.withIdentity({ subject: s.hostAccountId });
    await asHost.mutation(api.game.farewellSpeech.grantFarewellTime, {
      gameId: s.gameId,
    });
    await asHost.mutation(api.game.farewellSpeech.markDeadAndAdvance, {
      gameId: s.gameId,
    });
    await asHost.mutation(api.game.farewellSpeech.advanceFromFarewell, {
      gameId: s.gameId,
    });

    session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("night_phase");
    expect((await getPlayerBySeat(t, s.gameId, 5))?.isAlive).toBe(false);
  });

  it("two+ nominees behave like Japanese (self-justification speaking)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 0,
      players: SPORTS_NIGHT_ROSTER,
    });
    await setNominated(t, s.gameId, [4, 5]);

    await startNominated(t, s);

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("nominated_players_speak");
    expect(session?.speakingOrder).toEqual([4, 5]);
    expect(session?.currentSpeakerIndex).toBe(4);
  });

  it("Japanese: a single nominee still goes to voting (flag off, unchanged)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      currentNightNumber: 0,
      players: WIN_SAFE_ROSTER,
    });
    await setNominated(t, s.gameId, [8]);

    await startNominated(t, s);

    const session = await getSession(t, s.gameId);
    expect(session?.gamePhase).toBe("voting");
  });
});

// ===========================================================================
// P3-T3 — Sports 3rd-foul speaking ban (docs/sports-mafia.md §4.2), gated on
// `flags.thirdFoulSpeakingBan`. `giveFoul` stamps `foulSpeakingBanRound` on the
// 3rd foul; `startDaySpeaking` drops a player muted for the current round from
// the day speaking order — unless it is the final day phase (≤ 4 alive), where
// the ban is lifted. Japanese (flag off) never stamps the field and its order
// is unchanged. The 4th-foul elimination is retained across variants (above).
// ===========================================================================

async function setBanRound(
  t: TestConvex<typeof schema>,
  gameId: Seeded["gameId"],
  seat: number,
  round: number,
) {
  await t.run(async (ctx) => {
    const players = await ctx.db
      .query("gamePlayers")
      .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
      .collect();
    const player = players.find((p) => p.seatNumber === seat);
    await ctx.db.patch(player!._id, { foulSpeakingBanRound: round });
  });
}

const startDaySpeaking = (t: TestConvex<typeof schema>, s: Seeded) =>
  t
    .withIdentity({ subject: s.hostAccountId })
    .mutation(api.game.dayPhase.startDaySpeaking, { gameId: s.gameId });

describe("sports 3rd-foul speaking ban", () => {
  it("stamps foulSpeakingBanRound on the 3rd foul (next day round)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 0, // day round 1 → ban applies to round 2
      players: SPORTS_NIGHT_ROSTER,
    });
    await setFouls(t, s.gameId, 5, 2);

    const res = await giveFoul(t, s, 5);
    expect(res).toEqual({ playerEliminated: false });

    const p = await getPlayerBySeat(t, s.gameId, 5);
    expect(p?.fouls).toBe(3);
    expect(p?.isAlive).toBe(true);
    expect(p?.foulSpeakingBanRound).toBe(2);
  });

  it("Japanese: the 3rd foul does NOT stamp a ban (flag off)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      phase: "day_phase",
      currentNightNumber: 0,
      players: WIN_SAFE_ROSTER,
    });
    await setFouls(t, s.gameId, 8, 2);

    await giveFoul(t, s, 8);

    const p = await getPlayerBySeat(t, s.gameId, 8);
    expect(p?.fouls).toBe(3);
    expect(p?.foulSpeakingBanRound).toBeUndefined();
  });

  it("keeps a muted player in the order as a visible stop (>4 alive)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 1, // day round 2
      players: SPORTS_NIGHT_ROSTER, // 7 alive
    });
    await setBanRound(t, s.gameId, 5, 2); // banned for the current round

    await startDaySpeaking(t, s);

    // The ban is a UI concern now: seat 5 stays in the order (rendered
    // muted client-side); the host clicks Next past them.
    const session = await getSession(t, s.gameId);
    expect(session?.speakingOrder).toContain(5);
    expect(session?.speakingOrder).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("a ban for another round does not affect the order", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 1, // day round 2
      players: SPORTS_NIGHT_ROSTER,
    });
    await setBanRound(t, s.gameId, 5, 3); // banned for a LATER round

    await startDaySpeaking(t, s);

    const session = await getSession(t, s.gameId);
    expect(session?.speakingOrder).toContain(5);
  });

  it("lifts the ban on the final day phase (≤ 4 alive → still speaks)", async () => {
    const t = convexTest(schema, modules);
    const s = await seedGame(t, {
      gameType: "sports_mafia",
      phase: "day_phase",
      currentNightNumber: 1, // day round 2
      players: [
        { seat: 1, role: "DON" },
        { seat: 2, role: "MAFIA" },
        { seat: 3, role: "CITIZEN" },
        { seat: 4, role: "CITIZEN" },
      ], // 4 alive → final day phase
    });
    await setBanRound(t, s.gameId, 3, 2); // banned for the current round

    await startDaySpeaking(t, s);

    const session = await getSession(t, s.gameId);
    expect(session?.speakingOrder).toContain(3);
    expect(session?.speakingOrder).toHaveLength(4);
  });
});
