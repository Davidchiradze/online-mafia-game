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
