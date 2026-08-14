/**
 * What the player's centre cell is allowed to say.
 *
 * SILENT FAILURE MODE: over-sharing here does not throw, it decides the game. A
 * countdown is pressure applied to whoever is acting, so a citizen who can see
 * the mafia's 20-second clock knows exactly when the kill is being chosen; a
 * spectator can be anyone, including a player on a second screen. Neither case
 * produces an error — the game just stops being playable, one table at a time.
 */

import { describe, expect, it } from "vitest";

import {
  canSeePhaseTimer,
  phaseClock,
} from "@/features/game-room/lib/playerPanel";

describe("phaseClock", () => {
  it("counts the night through every meeting, action and buffer", () => {
    expect(phaseClock("mafia_meet", 1)).toEqual({ kind: "night", value: 1 });
    expect(phaseClock("mafia_chooses_target", 3)).toEqual({
      kind: "night",
      value: 3,
    });
    expect(phaseClock("phase_transition", 2)).toEqual({
      kind: "night",
      value: 2,
    });
    expect(phaseClock("don_meet", 1)).toEqual({ kind: "night", value: 1 });
  });

  it("counts the day as a round, not as a night", () => {
    // The first day runs before any night, so night 0 is day 1.
    expect(phaseClock("day_phase", 0)).toEqual({ kind: "day", value: 1 });
    expect(phaseClock("voting", 2)).toEqual({ kind: "day", value: 3 });
    expect(phaseClock("introduction_phase", 0)).toEqual({
      kind: "day",
      value: 1,
    });
  });

  it("puts the night's goodbye at dawn and the vote's in the day", () => {
    // Same phase, two clocks. Standing nominations mean the day already voted
    // somebody out — the same signal `advanceFromFarewell` routes on.
    expect(phaseClock("farewell_speech", 2)).toEqual({
      kind: "dawn",
      value: 2,
    });
    expect(phaseClock("farewell_speech", 2, 1)).toEqual({
      kind: "day",
      value: 3,
    });
  });

  it("puts best move at dawn", () => {
    expect(phaseClock("best_move", 1)).toEqual({ kind: "dawn", value: 1 });
  });

  it("never shows night 0", () => {
    // `currentNightNumber` is 0 until the first night is entered, and a "Night
    // 0" kicker is nonsense on a phase that only runs during night 1.
    expect(phaseClock("mafia_meet", 0)).toEqual({ kind: "night", value: 1 });
  });

  it("has no clock to show before the game or after it", () => {
    expect(phaseClock("game_session_started", 0)).toBeNull();
    expect(phaseClock("picking_roles", 0)).toBeNull();
    expect(phaseClock("end_game", 4)).toBeNull();
  });
});

describe("canSeePhaseTimer", () => {
  const awakeRoles = ["DON", "MAFIA", "MAFIA_RIGHT_HAND"] as const;

  it("shows it to the acting role", () => {
    expect(
      canSeePhaseTimer({
        isHost: false,
        isSpectator: false,
        viewerRole: "MAFIA",
        awakeRoles,
      }),
    ).toBe(true);
  });

  it("hides it from everyone who is asleep", () => {
    expect(
      canSeePhaseTimer({
        isHost: false,
        isSpectator: false,
        viewerRole: "DOCTOR",
        awakeRoles,
      }),
    ).toBe(false);
    // No role yet (pre-reveal, or a phase before the deal).
    expect(
      canSeePhaseTimer({
        isHost: false,
        isSpectator: false,
        viewerRole: null,
        awakeRoles,
      }),
    ).toBe(false);
  });

  it("always shows it to the host", () => {
    expect(
      canSeePhaseTimer({
        isHost: true,
        isSpectator: false,
        viewerRole: null,
        awakeRoles: [],
      }),
    ).toBe(true);
  });

  it("never shows it to a spectator, whatever else is true", () => {
    // A spectator can be anyone — including a player watching on a second
    // screen — so the spectator check has to come before the host one.
    expect(
      canSeePhaseTimer({
        isHost: true,
        isSpectator: true,
        viewerRole: "MAFIA",
        awakeRoles,
      }),
    ).toBe(false);
  });

  it("shows nothing on a phase where nobody is awake", () => {
    // Day phases have no acting role, so there is nobody to pressure.
    expect(
      canSeePhaseTimer({
        isHost: false,
        isSpectator: false,
        viewerRole: "MAFIA",
        awakeRoles: [],
      }),
    ).toBe(false);
  });
});
