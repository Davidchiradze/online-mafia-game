import { describe, it, expect } from "vitest";
import { advanceUpdates } from "@/game/japanese/phaseFlow";

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
    ["picking_roles", "mafia_meet"], // ConfirmRolesButton
    ["mafia_meet", "don_chooses_right_hand"], // EndMafiaMeetButton
    ["night_phase", "mafia_chooses_target"], // StartMafiaTargetButton
    ["mafia_chooses_target", "don_checks_for_detective"], // EndMafiaTargetButton
    ["don_checks_for_detective", "right_hand_checks_for_yakuza"], // EndDonCheckButton
    ["voting", "repeat"], // EndVotingButton
  ];

  it.each(cases)("%s → { gamePhase: %s }", (from, to) => {
    expect(advanceUpdates(from)).toEqual({ gamePhase: to });
  });
});

describe("advanceUpdates — buffer-mediated transitions", () => {
  const cases: Array<[string, string]> = [
    ["don_chooses_right_hand", "yakuda_shogun_meet"], // EndDonChooseRightHandButton
    ["yakuda_shogun_meet", "detective_meet"], // EndYakuzaShogunMeetButton
    ["detective_meet", "doctor_meet"], // EndDetectiveMeetButton
    ["doctor_meet", "introduction_phase"], // EndDoctorMeetButton
    ["right_hand_checks_for_yakuza", "yakuza_and_shogun_chooses_target"], // EndRightHandCheckButton
    ["yakuza_and_shogun_chooses_target", "detective_checks_for_mafia"], // EndYakuzaTargetButton
    ["detective_checks_for_mafia", "doctor_heals_player"], // EndDetectiveCheckButton
    ["doctor_heals_player", "farewell_speech"], // EndDoctorHealButton (resolve-marker)
  ];

  it.each(cases)("%s → phase_transition, nextPhase %s", (from, to) => {
    expect(advanceUpdates(from)).toEqual({
      gamePhase: "phase_transition",
      nextPhase: to,
    });
  });
});

describe("advanceUpdates — guardrails", () => {
  it("throws for a phase with no deterministic host-advance edge", () => {
    // Branching / terminal phases are owned by server mutations, not buttons.
    for (const p of ["day_phase", "farewell_speech", "repeat", "end_game"]) {
      expect(() => advanceUpdates(p)).toThrow();
    }
  });
});
