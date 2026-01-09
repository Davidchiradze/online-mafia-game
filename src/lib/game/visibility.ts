/**
 * Visibility Rules for the Mafia Game
 *
 * This module defines who can see whom during different game phases.
 * The visibility is based on the viewer's role and the current game phase.
 */

import type { GAME_PHASES, JAPANESE_MAFIA_ROLES } from "@/lib/constants/game";

export type GamePhase = (typeof GAME_PHASES)[number];
export type Role = (typeof JAPANESE_MAFIA_ROLES)[number] | null;

/**
 * Visibility state for a participant
 * - VISIBLE: Full visibility (video shown normally)
 * - DIMMED: Visible but blurred/dimmed (for host seeing sleeping players)
 * - COVERED: Completely hidden behind a cover
 */
export enum VisibilityState {
  VISIBLE = "visible",
  DIMMED = "dimmed",
  COVERED = "covered",
}

/**
 * Determines if the viewer can see the target participant's video
 *
 * @param viewerRole - The role of the person viewing
 * @param targetRole - The role of the person being viewed (or null if host)
 * @param gamePhase - Current phase of the game
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target is the host
 * @returns true if video should be visible, false if covered
 */
export function canSeeParticipant(
  viewerRole: Role,
  targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  isTargetHost: boolean
): boolean {
  // If no game session has started yet, everyone can see everyone
  if (!gamePhase) {
    return true;
  }

  // GAME SESSION STARTED: Everyone can see everyone (pre-role assignment)
  // Note: Players don't have roles yet during this phase
  if (gamePhase === "game_session_started") {
    return true;
  }

  // PICKING ROLES: Only host can see everyone, others see no one
  // Note: Players don't have roles yet during this phase
  if (gamePhase === "picking_roles") {
    return isViewerHost;
  }

  // NIGHT PHASE: No one sees anyone (complete darkness)
  if (gamePhase === "night_phase") {
    return false;
  }

  // INTRODUCTION PHASE: Everyone can see everyone (day time)
  if (gamePhase === "introduction_phase") {
    return true;
  }

  // DAY PHASE: Everyone can see everyone
  if (gamePhase === "day_phase") {
    return true;
  }

  // VOTING: Everyone can see everyone
  if (gamePhase === "voting") {
    return true;
  }

  // MAFIA MEET: Only Don, Mafia, and Right Hand can see each other
  // Host can see them, they can see host
  if (gamePhase === "mafia_meet") {
    const mafiaRoles: Role[] = ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && mafiaRoles.includes(viewerRole)) return true; // Mafia see host

    // Mafia members see each other
    if (mafiaRoles.includes(viewerRole) && mafiaRoles.includes(targetRole)) {
      return true;
    }

    return false;
  }

  // DON CHOOSES RIGHT HAND: Only Don can see everyone, others see no one (except host)
  if (gamePhase === "don_chooses_right_hand") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "DON") return true; // Don sees host
    if (viewerRole === "DON") return true; // Don sees everyone
    return false;
  }

  // YAKUZA & SHOGUN MEET: Only Yakuza and Shogun can see each other
  if (gamePhase === "yakuda_shogun_meet") {
    const yakuzaRoles: Role[] = ["YAKUZA", "SHOGUN"];

    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && yakuzaRoles.includes(viewerRole)) return true; // Yakuza see host

    // Yakuza members see each other
    if (yakuzaRoles.includes(viewerRole) && yakuzaRoles.includes(targetRole)) {
      return true;
    }

    return false;
  }

  // DETECTIVE MEET: Only Detective can see (themselves and host)
  if (gamePhase === "detective_meet") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "DETECTIVE") return true; // Detective sees host
    if (viewerRole === "DETECTIVE" && targetRole === "DETECTIVE") return true; // Detective sees self
    return false;
  }

  // DOCTOR MEET: Only Doctor can see (themselves and host)
  if (gamePhase === "doctor_meet") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "DOCTOR") return true; // Doctor sees host
    if (viewerRole === "DOCTOR" && targetRole === "DOCTOR") return true; // Doctor sees self
    return false;
  }

  // MAFIA CHOOSES TARGET: Only mafia members can see each other
  if (gamePhase === "mafia_chooses_target") {
    const mafiaRoles: Role[] = ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && mafiaRoles.includes(viewerRole)) return true; // Mafia see host

    if (mafiaRoles.includes(viewerRole) && mafiaRoles.includes(targetRole)) {
      return true;
    }

    return false;
  }

  // DON CHECKS FOR DETECTIVE: Only Don can see
  if (gamePhase === "don_checks_for_detective") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "DON") return true; // Don sees host
    if (viewerRole === "DON") return true; // Don sees everyone (to check)
    return false;
  }

  // RIGHT HAND CHECKS FOR YAKUZA: Only Right Hand can see
  if (gamePhase === "right_hand_checks_for_yakuza") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "MAFIA_RIGHT_HAND") return true; // Right hand sees host
    if (viewerRole === "MAFIA_RIGHT_HAND") return true; // Right hand sees everyone (to check)
    return false;
  }

  // YAKUZA CHOOSES TARGET: Only Yakuza and Shogun can see each other
  if (gamePhase === "yakuza_and_shogun_chooses_target") {
    const yakuzaRoles: Role[] = ["YAKUZA", "SHOGUN"];

    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && yakuzaRoles.includes(viewerRole)) return true; // Yakuza see host

    if (yakuzaRoles.includes(viewerRole) && yakuzaRoles.includes(targetRole)) {
      return true;
    }

    return false;
  }

  // DETECTIVE CHECKS FOR MAFIA: Only Detective can see
  if (gamePhase === "detective_checks_for_mafia") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "DETECTIVE") return true; // Detective sees host
    if (viewerRole === "DETECTIVE") return true; // Detective sees everyone (to check)
    return false;
  }

  // DOCTOR HEALS PLAYER: Only Doctor can see
  if (gamePhase === "doctor_heals_player") {
    if (isViewerHost) return true; // Host sees everyone
    if (isTargetHost && viewerRole === "DOCTOR") return true; // Doctor sees host
    if (viewerRole === "DOCTOR") return true; // Doctor sees everyone (to heal)
    return false;
  }

  // Default: everyone can see everyone (for phases like game_session_started, repeat, end_game)
  return true;
}

/**
 * Determines which roles are "awake" (active) during a specific game phase
 */
function getAwakeRoles(gamePhase: GamePhase): Role[] {
  switch (gamePhase) {
    case "mafia_meet":
    case "mafia_chooses_target":
      return ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    case "don_chooses_right_hand":
    case "don_checks_for_detective":
      return ["DON"];

    case "yakuda_shogun_meet":
    case "yakuza_and_shogun_chooses_target":
      return ["YAKUZA", "SHOGUN"];

    case "detective_meet":
    case "detective_checks_for_mafia":
      return ["DETECTIVE"];

    case "doctor_meet":
    case "doctor_heals_player":
      return ["DOCTOR"];

    case "right_hand_checks_for_yakuza":
      return ["MAFIA_RIGHT_HAND"];

    default:
      return [];
  }
}

/**
 * Checks if a phase is a "night" phase where some players are asleep
 */
function isNightActivityPhase(gamePhase: GamePhase): boolean {
  const nightPhases: GamePhase[] = [
    "picking_roles",
    "night_phase",
    "mafia_meet",
    "don_chooses_right_hand",
    "yakuda_shogun_meet",
    "detective_meet",
    "doctor_meet",
    "mafia_chooses_target",
    "don_checks_for_detective",
    "right_hand_checks_for_yakuza",
    "yakuza_and_shogun_chooses_target",
    "detective_checks_for_mafia",
    "doctor_heals_player",
  ];
  return nightPhases.includes(gamePhase);
}

/**
 * Determines the visibility state for a participant
 *
 * This is an enhanced version of canSeeParticipant that returns three states:
 * - VISIBLE: Full visibility
 * - DIMMED: Visible but blurred (for host seeing sleeping players during night phases)
 * - COVERED: Completely hidden
 *
 * @param viewerRole - The role of the person viewing
 * @param targetRole - The role of the person being viewed (or null if host)
 * @param gamePhase - Current phase of the game
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target is the host
 * @returns VisibilityState indicating how the participant should be displayed
 */
export function getVisibilityState(
  viewerRole: Role,
  targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  isTargetHost: boolean
): VisibilityState {
  // Use existing logic to determine base visibility
  const isVisible = canSeeParticipant(
    viewerRole,
    targetRole,
    gamePhase,
    isViewerHost,
    isTargetHost
  );

  // If not visible at all, return covered
  if (!isVisible) {
    return VisibilityState.COVERED;
  }

  // If viewer is host and we're in a night activity phase, check if target is "awake"
  if (isViewerHost && gamePhase && isNightActivityPhase(gamePhase)) {
    // Host always sees host tile as visible
    if (isTargetHost) {
      return VisibilityState.VISIBLE;
    }

    // During picking_roles and night_phase, everyone is "asleep"
    if (gamePhase === "picking_roles" || gamePhase === "night_phase") {
      return VisibilityState.DIMMED;
    }

    // Get which roles are awake during this phase
    const awakeRoles = getAwakeRoles(gamePhase);

    // If target's role is in the awake list, they're visible; otherwise dimmed
    if (awakeRoles.length > 0 && awakeRoles.includes(targetRole)) {
      return VisibilityState.VISIBLE;
    }

    // Target is sleeping during this phase
    return VisibilityState.DIMMED;
  }

  // Default: fully visible
  return VisibilityState.VISIBLE;
}

/**
 * Gets a user-friendly message to show when a participant is covered
 */
export function getCoverMessage(gamePhase: GamePhase | null): string {
  if (gamePhase === "game_session_started") {
    return "⏳"; // Waiting/loading
  }

  if (gamePhase === "picking_roles") {
    return "🎭"; // Role mask
  }

  if (gamePhase === "night_phase") {
    return "💤"; // Sleeping
  }

  // For specific role phases, just show sleep
  const nightPhases = [
    "mafia_meet",
    "don_chooses_right_hand",
    "yakuda_shogun_meet",
    "detective_meet",
    "doctor_meet",
    "mafia_chooses_target",
    "don_checks_for_detective",
    "right_hand_checks_for_yakuza",
    "yakuza_and_shogun_chooses_target",
    "detective_checks_for_mafia",
    "doctor_heals_player",
  ];

  if (nightPhases.includes(gamePhase as string)) {
    return "💤";
  }

  return "";
}
