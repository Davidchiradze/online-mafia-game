/**
 * Visibility Rules for the Mafia Game
 *
 * This module defines who can see whom during different game phases.
 * The visibility is based on the viewer's role and the current game phase.
 */

import type { GAME_PHASES, JAPANESE_MAFIA_ROLES } from "@/shared/lib/constants/game";

export type GamePhase = (typeof GAME_PHASES)[number];
export type Role = (typeof JAPANESE_MAFIA_ROLES)[number] | null;

/**
 * Visibility state for a participant — the single source of truth
 * for how a participant tile should be rendered.
 *
 * - VISIBLE: Full video shown normally
 * - DIMMED: Video shown with blur overlay (host or awake role sees sleeping players)
 * - MASKED: Video shown un-blurred with a crossed-eye marker (detective's mafia check)
 * - COVERED: Hidden behind a sleeping cover (💤)
 * - DEAD: Permanent dead overlay (💀)
 * - DISCONNECTED: No video track available (connection lost)
 */
export enum VisibilityState {
  VISIBLE = "visible",
  DIMMED = "dimmed",
  MASKED = "masked",
  COVERED = "covered",
  DEAD = "dead",
  DISCONNECTED = "disconnected",
}

/**
 * Determines if the viewer can see the target participant's video
 *
 * @param viewerRole - The role of the person viewing
 * @param _targetRole - The role of the person being viewed (unused: awake roles
 *   now see every player; target-specific dimming is handled in getVisibilityState)
 * @param gamePhase - Current phase of the game
 * @param isViewerHost - Whether the viewer is the host
 * @param isTargetHost - Whether the target is the host
 * @returns true if video should be visible, false if covered
 */
export function canSeeParticipant(
  viewerRole: Role,
  _targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  isTargetHost: boolean,
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

  // PHASE TRANSITION: Neutral sleep buffer between meetings. Players and
  // spectators are covered so the just-active role settles before the next one
  // wakes. The host, however, sees every player dimmed (blurred) so they can
  // keep monitoring the table during the buffer. Non-host must return false
  // here or the default `return true` below would reveal everyone and
  // re-introduce the cross-faction leak.
  if (gamePhase === "phase_transition") {
    return isViewerHost;
  }

  // INTRODUCTION PHASE: Everyone can see everyone (day time)
  if (gamePhase === "introduction_phase") {
    return true;
  }

  // DAY PHASE: Everyone can see everyone
  if (gamePhase === "day_phase") {
    return true;
  }

  // NOMINATED PLAYERS SPEAK: Everyone can see everyone (self-justification phase)
  if (gamePhase === "nominated_players_speak") {
    return true;
  }

  // VOTING: Everyone can see everyone
  if (gamePhase === "voting") {
    return true;
  }

  // MAFIA MEET: Mafia (Don, Mafia, Right Hand) are awake — they see every
  // player (teammates fully, everyone else dimmed). Non-mafia see no one.
  if (gamePhase === "mafia_meet") {
    const mafiaRoles: Role[] = ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    if (isViewerHost) return true; // Host sees everyone
    if (mafiaRoles.includes(viewerRole)) return true; // Awake mafia see everyone

    return false;
  }

  // DON CHOOSES RIGHT HAND: Mafia are awake — they see every player
  // (teammates fully, everyone else dimmed). Non-mafia see no one.
  if (gamePhase === "don_chooses_right_hand") {
    const mafiaRoles: Role[] = ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    if (isViewerHost) return true; // Host sees everyone
    if (mafiaRoles.includes(viewerRole)) return true; // Awake mafia see everyone

    return false;
  }

  // YAKUZA & SHOGUN MEET: Yakuza and Shogun are awake — they see every player
  // (teammates fully, everyone else dimmed). Others see no one.
  if (gamePhase === "yakuda_shogun_meet") {
    const yakuzaRoles: Role[] = ["YAKUZA", "SHOGUN"];

    if (isViewerHost) return true; // Host sees everyone
    if (yakuzaRoles.includes(viewerRole)) return true; // Awake yakuza see everyone

    return false;
  }

  // DETECTIVE MEET: Detective is awake — sees every player (self fully,
  // everyone else dimmed). Others see no one.
  if (gamePhase === "detective_meet") {
    if (isViewerHost) return true; // Host sees everyone
    if (viewerRole === "DETECTIVE") return true; // Awake detective sees everyone
    return false;
  }

  // DOCTOR MEET: Doctor is awake — sees every player (self fully, everyone
  // else dimmed). Others see no one.
  if (gamePhase === "doctor_meet") {
    if (isViewerHost) return true; // Host sees everyone
    if (viewerRole === "DOCTOR") return true; // Awake doctor sees everyone
    return false;
  }

  // MAFIA CHOOSES TARGET: Mafia are awake — they see every player (teammates
  // fully, everyone else dimmed) to pick a target. Non-mafia see no one.
  if (gamePhase === "mafia_chooses_target") {
    const mafiaRoles: Role[] = ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    if (isViewerHost) return true; // Host sees everyone
    if (mafiaRoles.includes(viewerRole)) return true; // Awake mafia see everyone

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

  // YAKUZA CHOOSES TARGET: Yakuza and Shogun are awake — they see every player
  // (teammates fully, everyone else dimmed) to pick a target. Others see no one.
  if (gamePhase === "yakuza_and_shogun_chooses_target") {
    const yakuzaRoles: Role[] = ["YAKUZA", "SHOGUN"];

    if (isViewerHost) return true; // Host sees everyone
    if (yakuzaRoles.includes(viewerRole)) return true; // Awake yakuza see everyone

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

  // FAREWELL SPEECH: Everyone can see everyone (dying player says goodbye publicly)
  if (gamePhase === "farewell_speech") {
    return true;
  }

  // Default: everyone can see everyone (for phases like game_session_started, repeat, end_game)
  return true;
}

/**
 * Determines which roles are "awake" (active) during a specific game phase.
 * Also used as the acting-role gate for the per-phase decision countdown
 * (only these roles + the host see the timer).
 */
export function getAwakeRoles(gamePhase: GamePhase): Role[] {
  switch (gamePhase) {
    case "mafia_meet":
    case "mafia_chooses_target":
      return ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];

    case "don_chooses_right_hand":
      return ["DON", "MAFIA", "MAFIA_RIGHT_HAND"];
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
export function isNightActivityPhase(gamePhase: GamePhase): boolean {
  const nightPhases: GamePhase[] = [
    "picking_roles",
    "night_phase",
    "phase_transition",
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
 * The variant-specific primitives the shared visibility-state layering is built
 * on: "who can see whom", "who is awake", and "is this a night phase". Japanese
 * and Sports each supply their own; the layering that consumes them (below) is
 * identical across variants.
 */
export type VisibilityPrimitives = {
  canSeeParticipant: (
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
  ) => boolean;
  getAwakeRoles: (gamePhase: GamePhase) => Role[];
  isNightActivityPhase: (gamePhase: GamePhase) => boolean;
};

/**
 * Optional hooks a variant can inject into the shared layering. Kept out of the
 * primitives so Japanese (which passes none) stays byte-for-byte identical.
 */
export type VisibilityOptions = {
  /**
   * Consulted at the TOP of `getVisibilityState` (so it also flows through
   * `getVisibilityStateWithDeath`, after the DEAD / dead-viewer rules). Return a
   * concrete `VisibilityState` to force it, or `null` to fall through to the
   * default layering. Sports uses this so the HOST sees every player clearly
   * while the mafia privately pick their target.
   */
  visibilityStateOverride?: (
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
  ) => VisibilityState | null;
};

/**
 * Builds the shared visibility-STATE layering (COVERED / DIMMED / VISIBLE / DEAD)
 * from a variant's phase+role primitives.
 *
 * Per docs/game-types.md §2.4 the layering — the `VisibilityState` enum and the
 * `getVisibilityStateWithDeath` death-layering — is IDENTICAL across variants;
 * only the injected `canSeeParticipant` / `getAwakeRoles` / `isNightActivityPhase`
 * differ. Japanese derives its module exports below from the Japanese primitives
 * defined in this file; Sports builds its own from `src/game/sports/visibility.ts`.
 */
export function createVisibilityHelpers(
  primitives: VisibilityPrimitives,
  options: VisibilityOptions = {},
) {
  const { canSeeParticipant, getAwakeRoles, isNightActivityPhase } = primitives;
  const { visibilityStateOverride } = options;

  /**
   * Determines the visibility state for a participant
   *
   * Enhanced version of canSeeParticipant that returns granular visibility states:
   * - VISIBLE: Full visibility
   * - DIMMED: Visible but blurred (host or awake role seeing sleeping players)
   * - COVERED: Completely hidden behind a sleeping cover
   */
  function getVisibilityState(
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
  ): VisibilityState {
    // Variant override (e.g. Sports host-monitoring) takes precedence over the
    // default layering. A null result falls through to the standard rules.
    if (visibilityStateOverride) {
      const forced = visibilityStateOverride(
        viewerRole,
        targetRole,
        gamePhase,
        isViewerHost,
        isTargetHost,
      );
      if (forced != null) return forced;
    }

    // Use existing logic to determine base visibility
    const isVisible = canSeeParticipant(
      viewerRole,
      targetRole,
      gamePhase,
      isViewerHost,
      isTargetHost,
    );

    // If not visible at all, return covered
    if (!isVisible) {
      return VisibilityState.COVERED;
    }

    // During night phases, dim sleeping players for both the host and the awake role
    if (gamePhase && isNightActivityPhase(gamePhase)) {
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
   * Determines the visibility state for a participant, accounting for dead players.
   *
   * Dead player rules:
   * - If game is finished: everyone is VISIBLE (reveal phase)
   * - If target is dead: always show DEAD state (regardless of phase)
   * - If viewer is dead during night phases: show COVERED (Zzz) for all targets
   * - Host always sees everything (dead overlay for dead, dimmed for sleeping)
   */
  function getVisibilityStateWithDeath(
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
    viewerIsAlive: boolean,
    targetIsAlive: boolean,
    isGameFinished: boolean = false,
  ): VisibilityState {
    // If game is finished, everyone is visible (reveal phase)
    if (isGameFinished) {
      return VisibilityState.VISIBLE;
    }

    // If target is dead, always show dead overlay (except for host tile)
    if (!targetIsAlive && !isTargetHost) {
      return VisibilityState.DEAD;
    }

    // If viewer is dead (not host) and it's a night phase, show Zzz for everyone
    if (
      !viewerIsAlive &&
      !isViewerHost &&
      gamePhase &&
      isNightActivityPhase(gamePhase)
    ) {
      return VisibilityState.COVERED;
    }

    // Otherwise, use the standard visibility logic
    return getVisibilityState(
      viewerRole,
      targetRole,
      gamePhase,
      isViewerHost,
      isTargetHost,
    );
  }

  return { getVisibilityState, getVisibilityStateWithDeath };
}

// The shared (Japanese) exports, derived from the Japanese primitives defined
// above. Behavior is byte-for-byte identical to the previous standalone
// functions (pinned by tests/game/visibility.test.ts).
const _sharedHelpers = createVisibilityHelpers({
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
});

export const getVisibilityState = _sharedHelpers.getVisibilityState;
export const getVisibilityStateWithDeath =
  _sharedHelpers.getVisibilityStateWithDeath;
