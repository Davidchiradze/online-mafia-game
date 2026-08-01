/**
 * Sports visibility ruleset (docs/game-types.md §2.4, docs/sports-mafia.md §5.4).
 *
 * Authored as REAL Sports rules rather than the Phase-1 Japanese re-export. The
 * VisibilityState layering (COVERED/DIMMED/VISIBLE/DEAD) stays shared — built by
 * `createVisibilityHelpers` from the Sports primitives below — but the phase+role
 * primitives are Sports-specific. The key divergence from Japanese:
 *
 *   `mafia_chooses_target` — mafia see **no video** (not each other, not
 *   themselves): every tile is COVERED for non-host viewers, leaving only the
 *   kill buttons (rendered above the cover). Each mafia picks PRIVATELY (§5.4),
 *   so revealing teammates here would leak the mafia set. Mafia meet
 *   face-to-face only at `mafia_meet`.
 *
 *   `best_move` (§6) reuses that exact shape: everyone sleeps — INCLUDING the
 *   killed player doing the picking — and only the host sees the players. The
 *   victim's check buttons render above the covers, just like the kill buttons.
 *
 * Sports has no yakuza, doctor, right-hand, or introduction phases, so those
 * Japanese phase branches are dropped. The two kept info-checks
 * (`don_checks_for_detective`, `detective_checks_for_mafia`) match Japanese.
 */

import {
  VisibilityState,
  createVisibilityHelpers,
  type GamePhase,
  type Role,
} from "@/shared/lib/game/visibility";
import type { VisibilityRuleset } from "@/features/game-room/variants/core/types";

const SPORTS_MAFIA_ROLES: Role[] = ["DON", "MAFIA"];

/**
 * Who can see whom during each Sports phase. Awake roles + host may see; everyone
 * else is covered — EXCEPT `mafia_chooses_target`, where even the acting mafia
 * see nothing (only the host monitors), because selections are private.
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
    // Pre-role / daytime / public phases: everyone sees everyone.
    case "game_session_started":
    case "day_phase":
    case "nominated_players_speak":
    case "voting":
    case "farewell_speech":
      return true;

    // Only the host sees during role pickup and the neutral sleep buffer.
    case "picking_roles":
    case "phase_transition":
      return isViewerHost;

    // Full darkness.
    case "night_phase":
      return false;

    // Mafia meet: DON + MAFIA (and host) see everyone; others see no one.
    case "mafia_meet":
      return isViewerHost || SPORTS_MAFIA_ROLES.includes(viewerRole);

    // Don meet: only the Don (and host) — the Don wakes alone so host and Don
    // see each other. Others see no one.
    case "don_meet":
      return isViewerHost || viewerRole === "DON";

    // Mafia choose target: PRIVATE. Only the host monitors — the acting mafia
    // see no video at all (all tiles covered), just the kill buttons on top.
    //
    // Best move (§6) works the same way: the table is still asleep, and so is the
    // killed player who is picking. Only the host sees the players. The victim
    // gets their check buttons rendered above the covers, exactly as the mafia get
    // kill buttons here.
    case "mafia_chooses_target":
    case "best_move":
      return isViewerHost;

    // Detective meet: only the detective (and host).
    case "detective_meet":
      return isViewerHost || viewerRole === "DETECTIVE";

    // Don's night check: only the Don (and host).
    case "don_checks_for_detective":
      return isViewerHost || viewerRole === "DON";

    // Detective's night check: only the detective (and host).
    case "detective_checks_for_mafia":
      return isViewerHost || viewerRole === "DETECTIVE";

    default:
      return true;
  }
}

/**
 * Roles awake during each phase. Also the acting-role gate for the per-phase
 * decision countdown (`PhaseCountdown`), so mafia must appear here for
 * `mafia_chooses_target` to see the 5s window timer — even though they see no
 * video (the countdown badge and the covered tiles are independent).
 */
function getAwakeRoles(gamePhase: GamePhase): Role[] {
  switch (gamePhase) {
    case "mafia_meet":
    case "mafia_chooses_target":
      return ["DON", "MAFIA"];
    case "don_meet":
    case "don_checks_for_detective":
      return ["DON"];
    case "detective_meet":
    case "detective_checks_for_mafia":
      return ["DETECTIVE"];
    // `best_move` is deliberately ABSENT — during it EVERYONE sleeps, including
    // the killed player who is picking (§6.6). Only the host sees the players.
    default:
      return [];
  }
}

/** Sports night/activity phases (subset of Japanese — no yakuza/doctor phases). */
function isNightActivityPhase(gamePhase: GamePhase): boolean {
  const nightPhases: GamePhase[] = [
    "picking_roles",
    "night_phase",
    "phase_transition",
    "mafia_meet",
    "don_meet",
    "detective_meet",
    "mafia_chooses_target",
    "don_checks_for_detective",
    "detective_checks_for_mafia",
    // Best move (§6): everyone is still asleep, so it behaves like any other
    // night phase — the host sees the table dimmed, everyone else is covered.
    "best_move",
  ];
  return nightPhases.includes(gamePhase);
}

/**
 * Host-monitoring override (docs/sports-mafia.md §5): during `mafia_chooses_target`
 * the mafia see nothing (their tiles are covered via `canSeeParticipant`), but
 * the HOST watches the whole table — every player is shown CLEARLY (not dimmed),
 * so the moderator can observe the mafia making their private picks. Returns null
 * for every other case so the default layering applies. Dead targets are still
 * handled first in `getVisibilityStateWithDeath` (this only runs for the alive
 * visibility layer).
 */
function visibilityStateOverride(
  _viewerRole: Role,
  _targetRole: Role,
  gamePhase: GamePhase | null,
  isViewerHost: boolean,
  _isTargetHost: boolean,
): VisibilityState | null {
  if (isViewerHost && gamePhase === "mafia_chooses_target") {
    return VisibilityState.DIMMED;
  }
  return null;
}

const { getVisibilityState, getVisibilityStateWithDeath } =
  createVisibilityHelpers(
    {
      canSeeParticipant,
      getAwakeRoles,
      isNightActivityPhase,
    },
    { visibilityStateOverride },
  );

export const SPORTS_VISIBILITY: VisibilityRuleset = {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
};

// Re-export for direct unit testing of the covered-tile behavior.
export {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  VisibilityState,
};
