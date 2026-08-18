/**
 * Serial Killer frontend ruleset — the UI half of the variant.
 *
 * Covers the four things the plan flagged as SILENT if wrong: an unhandled
 * phase in `canSeeParticipant` (which reveals every role, because the default
 * arm is `return true`), a role missing from `getAwakeRoles` (no countdown for
 * the one player who needs it), an unhandled host seat in `positionForSeat`
 * (stacks the host on a player tile), and a variant with a backend definition
 * but no UI ruleset (renders as Japanese in production).
 */

import { describe, it, expect } from "vitest";

import { getUiRuleset } from "@/features/game-room/variants/registry";
import { SERIAL_KILLER_UI_RULESET } from "@/features/game-room/variants/serialkiller/ruleset";
import { SERIAL_KILLER_SEAT_LAYOUT } from "@/features/game-room/variants/serialkiller/seatLayout";
import { JAPANESE_SEAT_LAYOUT } from "@/features/game-room/variants/japanese/seatLayout";
import { serialKillerNightAuthority } from "@/features/game-room/variants/serialkiller/nightAuthority";
import { serialKillerAdvanceUpdates } from "@/features/game-room/variants/serialkiller/phaseFlow";
import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
} from "@/features/game-room/variants/serialkiller/visibility";
import { SERIAL_KILLER_DEFINITION } from "@convex/games/serialkiller/definition";
import { GamePhase } from "@/shared/lib/constants/game";

describe("getUiRuleset — Serial Killer", () => {
  it("resolves its own ruleset, not Japanese's", () => {
    expect(getUiRuleset("serial_killer_mafia")).toBe(SERIAL_KILLER_UI_RULESET);
  });

  it("keeps the soft fallback for a type with no definition at all", () => {
    // `city_mafia` is reserved in the union and unbuilt on both sides, so the
    // dev-warn fallback stays — profile cards render legacy rows.
    //
    // The strict branch (registered variant, no ruleset) cannot be reached with
    // the real registry, so it is proved by mock in uiRulesetStrictness.test.ts.
    expect(() => getUiRuleset("city_mafia")).not.toThrow();
  });
});

describe("SERIAL_KILLER visibility", () => {
  it("covers every phase the definition can reach", () => {
    // The `default` arm returns TRUE — an unhandled phase reveals everyone to
    // everyone. This is the guard against adding a phase and forgetting it.
    const leaked = SERIAL_KILLER_DEFINITION.phases.filter((phase) => {
      const isPublic = (
        [
          GamePhase.GAME_SESSION_STARTED,
          GamePhase.INTRODUCTION_PHASE,
          GamePhase.DAY_PHASE,
          GamePhase.NOMINATED_PLAYERS_SPEAK,
          GamePhase.VOTING,
          GamePhase.FAREWELL_SPEECH,
          GamePhase.REPEAT,
          GamePhase.END_GAME,
        ] as string[]
      ).includes(phase);
      if (isPublic) return false;
      // A non-public phase must hide the table from an ordinary citizen.
      return canSeeParticipant("CITIZEN", "CITIZEN", phase as GamePhase, false, false);
    });
    expect(leaked, "these phases reveal every player to every player").toEqual([]);
  });

  it("wakes the Serial Killer alone in their phases", () => {
    for (const phase of [
      GamePhase.SERIAL_KILLER_MEET,
      GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
    ]) {
      expect(getAwakeRoles(phase)).toEqual(["SERIAL_KILLER"]);
      expect(canSeeParticipant("SERIAL_KILLER", "CITIZEN", phase, false, false)).toBe(true);
      expect(canSeeParticipant("DON", "CITIZEN", phase, false, false)).toBe(false);
      expect(canSeeParticipant("DOCTOR", "CITIZEN", phase, false, false)).toBe(false);
      // The host always monitors.
      expect(canSeeParticipant("CITIZEN", "CITIZEN", phase, true, false)).toBe(true);
    }
  });

  it("counts both Serial Killer phases as night activity", () => {
    expect(isNightActivityPhase(GamePhase.SERIAL_KILLER_MEET)).toBe(true);
    expect(isNightActivityPhase(GamePhase.SERIAL_KILLER_CHOOSES_TARGET)).toBe(true);
  });

  it("has no yakuza phases to handle", () => {
    expect(getAwakeRoles(GamePhase.YAKUDA_SHOGUN_MEET)).toEqual([]);
    expect(getAwakeRoles(GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET)).toEqual([]);
  });
});

describe("SERIAL_KILLER_SEAT_LAYOUT — Japanese's ring, one seat short", () => {
  const { positionForSeat } = SERIAL_KILLER_SEAT_LAYOUT;

  it("is Japanese's 4×4 grid with the merged centre panel", () => {
    expect(SERIAL_KILLER_SEAT_LAYOUT.cols).toBe(4);
    expect(SERIAL_KILLER_SEAT_LAYOUT.rows).toBe(4);
    expect(SERIAL_KILLER_SEAT_LAYOUT.center).toEqual(
      JAPANESE_SEAT_LAYOUT.center,
    );
    // Merged, not split — no separate host/controls cells.
    expect(SERIAL_KILLER_SEAT_LAYOUT.hostPanel).toBeUndefined();
    expect(SERIAL_KILLER_SEAT_LAYOUT.controlsPanel).toBeUndefined();
  });

  it("reuses Japanese's cells for seats 1–11 verbatim", () => {
    for (let seat = 1; seat <= 11; seat++) {
      expect(positionForSeat(seat)).toEqual(
        JAPANESE_SEAT_LAYOUT.positionForSeat(seat),
      );
    }
  });

  it("puts the host (seat 12) in the centre, not on the ring", () => {
    // Sports fails to handle its own host seat and stacks it on a player tile.
    // Seat 12 here is `maxPlayers + 1`, so it must land in the centre panel.
    expect(positionForSeat(12)).toEqual({ gridRow: 2, gridColumn: 2 });
    // And it must NOT reuse Japanese's seat-12 ring cell, which stays empty.
    expect(positionForSeat(12)).not.toEqual(
      JAPANESE_SEAT_LAYOUT.positionForSeat(12),
    );
  });
});

describe("serialKillerNightAuthority", () => {
  const players = [
    { playerId: "don", seatNumber: 1, isAlive: true },
    { playerId: "sk", seatNumber: 2, isAlive: true },
    { playerId: "doc", seatNumber: 3, isAlive: true },
    { playerId: "dead-sk", seatNumber: 4, isAlive: false },
  ];
  const roles: Record<string, string> = {
    don: "DON",
    sk: "SERIAL_KILLER",
    doc: "DOCTOR",
    "dead-sk": "CITIZEN",
  };
  const roleOf = (id: string) => roles[id] ?? null;

  const call = (phase: string, userId: string, viewerRole: string | null) =>
    serialKillerNightAuthority({
      phase,
      isHost: false,
      userId,
      viewerRole,
      players,
      roleOf,
    });

  it("gives the living Serial Killer authority in their phase", () => {
    const a = call(GamePhase.SERIAL_KILLER_CHOOSES_TARGET, "sk", "SERIAL_KILLER");
    expect(a.isSerialKillerPhase).toBe(true);
    expect(a.hasSerialKillerAuthority).toBe(true);
  });

  it("gives it to nobody else", () => {
    expect(
      call(GamePhase.SERIAL_KILLER_CHOOSES_TARGET, "don", "DON")
        .hasSerialKillerAuthority,
    ).toBe(false);
    expect(
      call(GamePhase.SERIAL_KILLER_CHOOSES_TARGET, "doc", "DOCTOR")
        .hasSerialKillerAuthority,
    ).toBe(false);
  });

  it("never grants it outside the phase", () => {
    const a = call(GamePhase.MAFIA_CHOOSES_TARGET, "sk", "SERIAL_KILLER");
    expect(a.isSerialKillerPhase).toBe(false);
    expect(a.hasSerialKillerAuthority).toBe(false);
  });

  it("declares no yakuza authority — there is no clan", () => {
    const a = call(GamePhase.SERIAL_KILLER_CHOOSES_TARGET, "sk", "SERIAL_KILLER");
    expect(a.hasYakuzaKillAuthority).toBe(false);
    expect(a.isYakuzaPhase).toBe(false);
  });
});

describe("serialKillerAdvanceUpdates", () => {
  it("sleeps through the buffer whenever the awake set changes", () => {
    // Both Serial Killer phases qualify: they wake alone, so the table must be
    // asleep on both sides of them or the room sees who is acting.
    expect(serialKillerAdvanceUpdates(GamePhase.DON_MEET)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.SERIAL_KILLER_MEET,
    });
    expect(serialKillerAdvanceUpdates(GamePhase.SERIAL_KILLER_MEET)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.DETECTIVE_MEET,
    });
    expect(
      serialKillerAdvanceUpdates(GamePhase.SERIAL_KILLER_CHOOSES_TARGET),
    ).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
    });
  });

  it("jumps straight through when the awake set does not change", () => {
    expect(serialKillerAdvanceUpdates(GamePhase.NIGHT_PHASE)).toEqual({
      gamePhase: GamePhase.MAFIA_CHOOSES_TARGET,
    });
  });

  it("throws rather than guessing on a state-dependent edge", () => {
    expect(() => serialKillerAdvanceUpdates(GamePhase.DAY_PHASE)).toThrow();
  });
});

describe("SERIAL_KILLER_UI_RULESET — phase controls", () => {
  it("renders a control for every phase the definition declares", () => {
    const keys = new Set(Object.keys(SERIAL_KILLER_UI_RULESET.phaseControls));
    const missing = SERIAL_KILLER_DEFINITION.phases.filter((p) => !keys.has(p));
    expect(missing, "these phases would render no host controls").toEqual([]);
  });

  it("declares the single-authority night model", () => {
    expect(SERIAL_KILLER_UI_RULESET.mafiaNightModel).toBe("single-authority");
    expect(SERIAL_KILLER_UI_RULESET.hasSelfJustification).toBe(true);
  });
});
