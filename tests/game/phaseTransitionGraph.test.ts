import { describe, it, expect } from "vitest";
import { GAME_PHASES, GamePhase } from "@/shared/lib/constants/game";

/**
 * CHARACTERIZATION SPEC — the deterministic host-advance transition graph.
 *
 * Today this graph does not exist as a function: each transition is a hardcoded
 * `GAME_PHASES[n]` literal inside a phase-button component under
 * `src/components/gameSession/phaseButtonsForHost/*` (docs/engine/variant-architecture.md §1:
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
  [GamePhase.PICKING_ROLES]: GamePhase.MAFIA_MEET, // ConfirmRolesButton
  [GamePhase.MAFIA_MEET]: GamePhase.YAKUDA_SHOGUN_MEET, // EndMafiaMeetButton*
  [GamePhase.YAKUDA_SHOGUN_MEET]: GamePhase.DETECTIVE_MEET, // EndYakuzaShogunMeetButton*
  [GamePhase.DETECTIVE_MEET]: GamePhase.DOCTOR_MEET, // EndDetectiveMeetButton*
  [GamePhase.DOCTOR_MEET]: GamePhase.INTRODUCTION_PHASE, // EndDoctorMeetButton*
  [GamePhase.NIGHT_PHASE]: GamePhase.MAFIA_CHOOSES_TARGET, // StartMafiaTargetButton
  [GamePhase.MAFIA_CHOOSES_TARGET]: GamePhase.DON_CHECKS_FOR_DETECTIVE, // EndMafiaTargetButton
  [GamePhase.DON_CHECKS_FOR_DETECTIVE]:
    GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET, // EndDonCheckButton*
  [GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET]: GamePhase.DETECTIVE_CHECKS_FOR_MAFIA, // EndYakuzaTargetButton*
  [GamePhase.DETECTIVE_CHECKS_FOR_MAFIA]: GamePhase.DOCTOR_HEALS_PLAYER, // EndDetectiveCheckButton*
  [GamePhase.DOCTOR_HEALS_PLAYER]: GamePhase.FAREWELL_SPEECH, // EndDoctorHealButton* (resolve-marker → startFarewellSpeech)
  [GamePhase.VOTING]: GamePhase.REPEAT, // EndVotingButton
};

// Sources whose advance first parks the table in the neutral `phase_transition`
// sleep buffer (StartNextPhaseButton then wakes the next group). Marked with *
// above. Documented so the refactor preserves the buffer behavior.
const BUFFER_MEDIATED_SOURCES = new Set([
  GamePhase.MAFIA_MEET,
  GamePhase.YAKUDA_SHOGUN_MEET,
  GamePhase.DETECTIVE_MEET,
  GamePhase.DOCTOR_MEET,
  GamePhase.DON_CHECKS_FOR_DETECTIVE,
  GamePhase.YAKUZA_AND_SHOGUN_CHOOSES_TARGET,
  GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
  GamePhase.DOCTOR_HEALS_PLAYER,
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
    const walk: string[] = [GamePhase.PICKING_ROLES];
    let cur: string = GamePhase.PICKING_ROLES;
    while (JAPANESE_HOST_ADVANCE[cur] && walk.length < 20) {
      cur = JAPANESE_HOST_ADVANCE[cur];
      walk.push(cur);
      if (cur === GamePhase.INTRODUCTION_PHASE) break;
    }
    expect(walk).toEqual([
      GamePhase.PICKING_ROLES,
      GamePhase.MAFIA_MEET,
      GamePhase.YAKUDA_SHOGUN_MEET,
      GamePhase.DETECTIVE_MEET,
      GamePhase.DOCTOR_MEET,
      GamePhase.INTRODUCTION_PHASE,
    ]);
  });

  it("buffer-mediated sources are a subset of the graph's sources", () => {
    for (const src of BUFFER_MEDIATED_SOURCES) {
      expect(Object.keys(JAPANESE_HOST_ADVANCE)).toContain(src);
    }
  });
});
