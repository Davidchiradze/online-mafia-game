import { describe, it, expect } from "vitest";
import { GAME_PHASES } from "@/shared/lib/constants/game";

/**
 * CHARACTERIZATION SPEC — the deterministic host-advance transition graph.
 *
 * Today this graph does not exist as a function: each transition is a hardcoded
 * `GAME_PHASES[n]` literal inside a phase-button component under
 * `src/components/gameSession/phaseButtonsForHost/*` (docs/game-types.md §1:
 * "each button hardcodes the next GAME_PHASES[n] — the transition graph lives in
 * the buttons"). The refactor replaces those literals with
 * `definition.nextPhase(phase, ctx)` (§2.1).
 *
 * This file transcribes the CURRENT deterministic (state-independent) edges from
 * those buttons and:
 *   1. locks them as the spec `definition.nextPhase` must reproduce, and
 *   2. validates them against the real `GAME_PHASES` constant (so a phase
 *      rename/reorder can't silently break the graph).
 *
 * Scope: only the edges that are a fixed "click End/Start → this exact next
 * phase" with no game-state branch. The branching transitions
 * (introduction→night, farewell→day, repeat→night, day→nominated/voting) run
 * through server mutations (`enterNightPhase` / `enterDayPhase` /
 * `enterVotingPhase`) and are covered for real in the convex-test suite.
 *
 * NOTE: When `definition.nextPhase` lands, point these `.toBe(...)` assertions at
 * it — the expected values must not change.
 */

// source phase → next phase (transcribed from the End*/Start* buttons)
const JAPANESE_HOST_ADVANCE: Record<string, string> = {
  picking_roles: "mafia_meet", // ConfirmRolesButton
  mafia_meet: "don_chooses_right_hand", // EndMafiaMeetButton
  don_chooses_right_hand: "yakuda_shogun_meet", // EndDonChooseRightHandButton*
  yakuda_shogun_meet: "detective_meet", // EndYakuzaShogunMeetButton*
  detective_meet: "doctor_meet", // EndDetectiveMeetButton*
  doctor_meet: "introduction_phase", // EndDoctorMeetButton*
  night_phase: "mafia_chooses_target", // StartMafiaTargetButton
  mafia_chooses_target: "don_checks_for_detective", // EndMafiaTargetButton
  don_checks_for_detective: "right_hand_checks_for_yakuza", // EndDonCheckButton
  right_hand_checks_for_yakuza: "yakuza_and_shogun_chooses_target", // EndRightHandCheckButton*
  yakuza_and_shogun_chooses_target: "detective_checks_for_mafia", // EndYakuzaTargetButton*
  detective_checks_for_mafia: "doctor_heals_player", // EndDetectiveCheckButton*
  doctor_heals_player: "farewell_speech", // EndDoctorHealButton* (resolve-marker → startFarewellSpeech)
  voting: "repeat", // EndVotingButton
};

// Sources whose advance first parks the table in the neutral `phase_transition`
// sleep buffer (StartNextPhaseButton then wakes the next group). Marked with *
// above. Documented so the refactor preserves the buffer behavior.
const BUFFER_MEDIATED_SOURCES = new Set([
  "don_chooses_right_hand",
  "yakuda_shogun_meet",
  "detective_meet",
  "doctor_meet",
  "right_hand_checks_for_yakuza",
  "yakuza_and_shogun_chooses_target",
  "detective_checks_for_mafia",
  "doctor_heals_player",
]);

describe("Japanese host-advance transition graph (spec)", () => {
  it.each(Object.entries(JAPANESE_HOST_ADVANCE))(
    "%s advances to %s",
    (from, to) => {
      expect(JAPANESE_HOST_ADVANCE[from]).toBe(to);
    },
  );

  it("every edge endpoint is a real GAME_PHASES member", () => {
    const valid = new Set<string>(GAME_PHASES);
    for (const [from, to] of Object.entries(JAPANESE_HOST_ADVANCE)) {
      expect(valid.has(from), `source ${from}`).toBe(true);
      expect(valid.has(to), `target ${to}`).toBe(true);
    }
  });

  it("has no self-loops", () => {
    for (const [from, to] of Object.entries(JAPANESE_HOST_ADVANCE)) {
      expect(from).not.toBe(to);
    }
  });

  it("threads the full night meeting sequence in order", () => {
    // Walk from picking_roles through the meeting chain to introduction_phase.
    const walk: string[] = ["picking_roles"];
    let cur = "picking_roles";
    while (JAPANESE_HOST_ADVANCE[cur] && walk.length < 20) {
      cur = JAPANESE_HOST_ADVANCE[cur];
      walk.push(cur);
      if (cur === "introduction_phase") break;
    }
    expect(walk).toEqual([
      "picking_roles",
      "mafia_meet",
      "don_chooses_right_hand",
      "yakuda_shogun_meet",
      "detective_meet",
      "doctor_meet",
      "introduction_phase",
    ]);
  });

  it("buffer-mediated sources are a subset of the graph's sources", () => {
    for (const src of BUFFER_MEDIATED_SOURCES) {
      expect(Object.keys(JAPANESE_HOST_ADVANCE)).toContain(src);
    }
  });
});
