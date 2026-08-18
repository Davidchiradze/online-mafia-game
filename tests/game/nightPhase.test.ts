/**
 * Night-phase titles.
 *
 * SILENT FAILURE MODE: the night is a chain of near-identical host states, each
 * on screen for seconds, and the phase name is the only thing telling them
 * apart. There is exactly one place the phase name can lie — a variant whose
 * mafia do NOT kill on the first night meets and plans instead — and getting it
 * wrong does not throw. The host just waits for a target that is never coming,
 * or is told to plan on a night that actually kills.
 *
 * The rule is keyed off `definition.flags.mafiaKillsOnFirstNight`, so the flag
 * is read from the definitions here rather than restated. A variant that flips
 * it moves these expectations, which is the point.
 */

import { describe, expect, it } from "vitest";

import { nightPhaseLabelKey } from "@/features/game-room/lib/nightPhase";
import { GamePhase } from "@/shared/lib/constants/game";
import { JAPANESE_DEFINITION } from "@convex/games/japanese/definition";
import { SPORTS_DEFINITION } from "@convex/games/sports/definition";

const JAPANESE_KILLS_NIGHT_1 =
  JAPANESE_DEFINITION.flags.mafiaKillsOnFirstNight;
const SPORTS_KILLS_NIGHT_1 = SPORTS_DEFINITION.flags.mafiaKillsOnFirstNight;

describe("nightPhaseLabelKey — a variant that does not kill on night 1", () => {
  it("is what Japanese declares", () => {
    expect(JAPANESE_KILLS_NIGHT_1).toBe(false);
  });

  it("labels the first night's mafia phase as a meeting, not a kill", () => {
    expect(
      nightPhaseLabelKey(
        GamePhase.MAFIA_CHOOSES_TARGET,
        1,
        JAPANESE_KILLS_NIGHT_1,
      ),
    ).toBe("mafia_meets_first_night");
  });

  it("labels every later night as a target pick", () => {
    for (const night of [2, 7]) {
      expect(
        nightPhaseLabelKey(
          GamePhase.MAFIA_CHOOSES_TARGET,
          night,
          JAPANESE_KILLS_NIGHT_1,
        ),
      ).toBe(GamePhase.MAFIA_CHOOSES_TARGET);
    }
  });

  it("passes every other phase through untouched", () => {
    expect(
      nightPhaseLabelKey(
        GamePhase.DOCTOR_HEALS_PLAYER,
        1,
        JAPANESE_KILLS_NIGHT_1,
      ),
    ).toBe(GamePhase.DOCTOR_HEALS_PLAYER);
  });
});

describe("nightPhaseLabelKey — a variant that DOES kill on night 1", () => {
  it("is what Sports declares", () => {
    expect(SPORTS_KILLS_NIGHT_1).toBe(true);
  });

  /**
   * BEHAVIOUR CHANGE. Sports read "Mafia Meets & Plans" on night 1 because the
   * rule was hardcoded to `nightNumber === 1`. Its first night genuinely kills
   * — `hasBestMove` exists to hand that victim their 3 suspects — so the label
   * was wrong on the one night Best Move depends on.
   */
  it("labels the first night as a target pick, like every other night", () => {
    for (const night of [1, 2, 7]) {
      expect(
        nightPhaseLabelKey(
          GamePhase.MAFIA_CHOOSES_TARGET,
          night,
          SPORTS_KILLS_NIGHT_1,
        ),
      ).toBe(GamePhase.MAFIA_CHOOSES_TARGET);
    }
  });
});
