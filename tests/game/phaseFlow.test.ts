import { describe, it, expect } from "vitest";
import { advanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";
import { GamePhase } from "@/shared/lib/constants/game";

/**
 * CHARACTERIZATION TEST — the Japanese host-advance `updates` payloads.
 *
 * Pins `advanceUpdates(phase)` to the EXACT `{ gamePhase, nextPhase? }` object
 * each phase-button component sent before P1-T6 replaced its positional
 * `GAME_PHASES[n]` literals with this helper. Transcribed from the buttons
 * under `src/components/gameSession/phaseButtonsForHost/`:
 *   - direct sources set `gamePhase` to the destination;
 *   - buffer-mediated sources set `gamePhase: "phase_transition"` and stash the
 *     destination in `nextPhase` (the neutral sleep buffer).
 *
 * These payloads must not change — a diff here is a real behavior change in the
 * host's phase flow, not a refactor.
 */

describe("advanceUpdates — direct transitions (no buffer)", () => {
  const cases: Array<[string, string]> = [
    [GamePhase.PICKING_ROLES, GamePhase.MAFIA_MEET], // ConfirmRolesButton
    [GamePhase.NIGHT_PHASE, GamePhase.MAFIA_CHOOSES_TARGET], // StartMafiaTargetButton
    [GamePhase.MAFIA_CHOOSES_TARGET, GamePhase.DON_CHECKS_FOR_DETECTIVE], // EndMafiaTargetButton
    [GamePhase.VOTING, GamePhase.REPEAT], // EndVotingButton
  ];

  it.each(cases)("%s → { gamePhase: %s }", (from, to) => {
    expect(advanceUpdates(from)).toEqual({ gamePhase: to });
  });
});

describe("advanceUpdates — buffer-mediated transitions", () => {
  const cases: Array<[string, string]> = [
    // mafia → yakuza: inherited the buffer when don_chooses_right_hand went away
    [GamePhase.MAFIA_MEET, GamePhase.YAKUDA_SHOGUN_MEET], // EndMafiaMeetButton
    [GamePhase.YAKUDA_SHOGUN_MEET, GamePhase.DETECTIVE_MEET], // EndYakuzaShogunMeetButton
    [GamePhase.DETECTIVE_MEET, GamePhase.DOCTOR_MEET], // EndDetectiveMeetButton
    [GamePhase.DOCTOR_MEET, GamePhase.INTRODUCTION_PHASE], // EndDoctorMeetButton
    // mafia → yakuza: inherited the buffer when right_hand_checks_for_yakuza went away
    [
      GamePhase.DON_CHECKS_FOR_DETECTIVE,
      GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
    ], // EndDonCheckButton
    [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET, GamePhase.DETECTIVE_CHECKS_FOR_MAFIA], // EndYakuzaTargetButton
    [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA, GamePhase.DOCTOR_HEALS_PLAYER], // EndDetectiveCheckButton
    [GamePhase.DOCTOR_HEALS_PLAYER, GamePhase.FAREWELL_SPEECH], // EndDoctorHealButton (resolve-marker)
  ];

  it.each(cases)("%s → phase_transition, nextPhase %s", (from, to) => {
    expect(advanceUpdates(from)).toEqual({
      gamePhase: GamePhase.PHASE_TRANSITION,
      nextPhase: to,
    });
  });
});

describe("advanceUpdates — guardrails", () => {
  it("throws for a phase with no deterministic host-advance edge", () => {
    // Branching / terminal phases are owned by server mutations, not buttons.
    for (const p of [GamePhase.DAY_PHASE, GamePhase.FAREWELL_SPEECH, GamePhase.REPEAT, GamePhase.END_GAME]) {
      expect(() => advanceUpdates(p)).toThrow();
    }
  });
});
