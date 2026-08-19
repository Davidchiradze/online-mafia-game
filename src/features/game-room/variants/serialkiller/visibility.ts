/**
 * Serial Killer visibility ruleset (docs/variants/serial_killer/rules.md §8).
 *
 * Japanese's shape with the two yakuza phases replaced. Authored as real rules
 * rather than re-exporting Japanese's, because the shared `canSeeParticipant`
 * has no case for the Serial Killer's phases and its `default` arm is
 * `return true` — an unhandled night phase would reveal EVERY player to every
 * player, which is a role leak, not a cosmetic bug.
 *
 * The two new phases mirror the Japanese slots they occupy:
 *
 *   `serial_killer_meet`            — like `don_meet`: one player wakes alone
 *                                     with the host. There is no team to meet.
 *   `serial_killer_chooses_target`  — like `yakuza_and_shogun_chooses_target`:
 *                                     the actor and the host see the table.
 *
 * Directory name matches the backend's `convex/games/serialkiller/` so both
 * halves of the variant are findable under one spelling; that name is forced by
 * Convex's module-path rules, which reject hyphens.
 */

import {
  VisibilityState,
  createVisibilityHelpers,
  GamePhase,
  type Role,
} from "@/shared/lib/game/visibility";
import type { VisibilityRuleset } from "@/features/game-room/variants/core/types";

const MAFIA_ROLES: Role[] = ["DON", "MAFIA"];

/**
 * Who can see whom during each phase.
 *
 * Every phase this variant can reach is named explicitly. The `default` arm is
 * "everyone sees everyone", so a phase that falls through leaks roles — it is
 * the reason this file exists rather than re-exporting the shared chain.
 */
function canSeeParticipant(
  viewerRole: Role,
  _targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  _isTargetHost: boolean,
): boolean {
  // No session yet → everyone sees everyone.
  if (!gamePhase) return true;

  switch (gamePhase) {
    // Public phases: the whole table is awake.
    case GamePhase.GAME_SESSION_STARTED:
    case GamePhase.INTRODUCTION_PHASE:
    case GamePhase.DAY_PHASE:
    case GamePhase.NOMINATED_PLAYERS_SPEAK:
    case GamePhase.VOTING:
    case GamePhase.FAREWELL_SPEECH:
      return true;

    // Only the host sees during role pickup and the neutral sleep buffer.
    case GamePhase.PICKING_ROLES:
    case GamePhase.PHASE_TRANSITION:
      return isViewerHost;

    // Full darkness.
    case GamePhase.NIGHT_PHASE:
      return false;

    // Mafia meet and kill: the mafia team (and host) see the table.
    case GamePhase.MAFIA_MEET:
    case GamePhase.MAFIA_CHOOSES_TARGET:
      return isViewerHost || MAFIA_ROLES.includes(viewerRole);

    // The Don wakes alone with the host.
    case GamePhase.DON_MEET:
    case GamePhase.DON_CHECKS_FOR_DETECTIVE:
      return isViewerHost || viewerRole === "DON";

    // The Serial Killer wakes alone — they have no teammates to meet, so this
    // is structurally `don_meet`, not `mafia_meet`.
    case GamePhase.SERIAL_KILLER_MEET:
    case GamePhase.SERIAL_KILLER_CHOOSES_TARGET:
      return isViewerHost || viewerRole === "SERIAL_KILLER";

    case GamePhase.DETECTIVE_MEET:
    case GamePhase.DETECTIVE_CHECKS_FOR_MAFIA:
      return isViewerHost || viewerRole === "DETECTIVE";

    case GamePhase.DOCTOR_MEET:
    case GamePhase.DOCTOR_HEALS_PLAYER:
      return isViewerHost || viewerRole === "DOCTOR";

    default:
      return true;
  }
}

/**
 * Roles awake during each phase.
 *
 * Also the acting-role gate for the per-phase countdown (`PhaseCountdown`), so
 * SERIAL_KILLER must appear here for their own phases or the one player who
 * needs the clock is the one player who does not get it.
 */
function getAwakeRoles(gamePhase: GamePhase): Role[] {
  switch (gamePhase) {
    case GamePhase.MAFIA_MEET:
    case GamePhase.MAFIA_CHOOSES_TARGET:
      return ["DON", "MAFIA"];
    case GamePhase.DON_MEET:
    case GamePhase.DON_CHECKS_FOR_DETECTIVE:
      return ["DON"];
    case GamePhase.SERIAL_KILLER_MEET:
    case GamePhase.SERIAL_KILLER_CHOOSES_TARGET:
      return ["SERIAL_KILLER"];
    case GamePhase.DETECTIVE_MEET:
    case GamePhase.DETECTIVE_CHECKS_FOR_MAFIA:
      return ["DETECTIVE"];
    case GamePhase.DOCTOR_MEET:
    case GamePhase.DOCTOR_HEALS_PLAYER:
      return ["DOCTOR"];
    default:
      return [];
  }
}

/** Night/activity phases — Japanese's set with the two Serial Killer phases. */
function isNightActivityPhase(gamePhase: GamePhase): boolean {
  const nightPhases: GamePhase[] = [
    GamePhase.PICKING_ROLES,
    GamePhase.NIGHT_PHASE,
    GamePhase.PHASE_TRANSITION,
    GamePhase.MAFIA_MEET,
    GamePhase.DON_MEET,
    GamePhase.SERIAL_KILLER_MEET,
    GamePhase.DETECTIVE_MEET,
    GamePhase.DOCTOR_MEET,
    GamePhase.MAFIA_CHOOSES_TARGET,
    GamePhase.DON_CHECKS_FOR_DETECTIVE,
    GamePhase.SERIAL_KILLER_CHOOSES_TARGET,
    GamePhase.DETECTIVE_CHECKS_FOR_MAFIA,
    GamePhase.DOCTOR_HEALS_PLAYER,
  ];
  return nightPhases.includes(gamePhase);
}

const { getVisibilityState, getVisibilityStateWithDeath } =
  createVisibilityHelpers({
    canSeeParticipant,
    getAwakeRoles,
    isNightActivityPhase,
  });

export const SERIAL_KILLER_VISIBILITY: VisibilityRuleset = {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
};

// Re-export for direct unit testing.
export {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  VisibilityState,
};
