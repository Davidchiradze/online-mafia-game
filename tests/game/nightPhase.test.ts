/**
 * Night-phase titles.
 *
 * SILENT FAILURE MODE: the night is a chain of near-identical host states, each
 * on screen for seconds, and the phase name is the only thing telling them
 * apart. There is exactly one place the phase name lies — on the first night
 * the mafia do NOT kill, they meet and plan — and getting it wrong does not
 * throw. The host just waits for a target that is never coming.
 */

import { describe, expect, it } from "vitest";

import { nightPhaseLabelKey } from "@/features/game-room/lib/nightPhase";
import { GamePhase } from "@/shared/lib/constants/game";

describe("nightPhaseLabelKey", () => {
  it("labels the first night's mafia phase as a meeting, not a kill", () => {
    expect(nightPhaseLabelKey(GamePhase.MAFIA_CHOOSES_TARGET, 1)).toBe(
      "mafia_meets_first_night",
    );
  });

  it("labels every later night as a target pick", () => {
    expect(nightPhaseLabelKey(GamePhase.MAFIA_CHOOSES_TARGET, 2)).toBe(
      GamePhase.MAFIA_CHOOSES_TARGET,
    );
    expect(nightPhaseLabelKey(GamePhase.MAFIA_CHOOSES_TARGET, 7)).toBe(
      GamePhase.MAFIA_CHOOSES_TARGET,
    );
  });

  it("passes every other phase through untouched", () => {
    expect(nightPhaseLabelKey(GamePhase.DOCTOR_HEALS_PLAYER, 1)).toBe(
      GamePhase.DOCTOR_HEALS_PLAYER,
    );
  });
});
