/**
 * Core, variant-AGNOSTIC types for the FRONTEND UI ruleset registry
 * (docs/game-types.md §2.2 — the "parallel registry of UI rulesets" that mirrors
 * the backend `GameDefinition`). Resolved once per game in `gameRoomContext`
 * from `gameData.gameType` and passed down via context, so shared UI never
 * branches on a `gameType` literal.
 *
 * The backend rules (roles, deck, win detection, night resolution, phase graph)
 * live in `convex/games/*`. This is the UI half: visibility + host-advance flow
 * now, with the phase→controls map and seat-layout geometry added in Phase 4.
 */

import type {
  GamePhase,
  Role,
  VisibilityState,
} from "@/lib/game/visibility";
import type { PhaseAdvanceUpdates } from "@/game/japanese/phaseFlow";

/**
 * A variant's visibility rules (docs/game-types.md §2.4): the phase+role
 * questions the participant grid asks. The `VisibilityState` enum and the
 * `getVisibilityStateWithDeath` death-layering stay shared; each variant answers
 * "who is awake / who can see whom".
 */
export interface VisibilityRuleset {
  canSeeParticipant(
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
  ): boolean;
  getAwakeRoles(gamePhase: GamePhase): Role[];
  isNightActivityPhase(gamePhase: GamePhase): boolean;
  getVisibilityState(
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
  ): VisibilityState;
  getVisibilityStateWithDeath(
    viewerRole: Role,
    targetRole: Role,
    gamePhase: GamePhase | null,
    isViewerHost: boolean,
    isTargetHost: boolean,
    viewerIsAlive: boolean,
    targetIsAlive: boolean,
    isGameFinished?: boolean,
  ): VisibilityState;
}

/**
 * The per-`gameType` frontend UI ruleset, resolved once in `gameRoomContext`.
 * Grows through the refactor: Phase 4 adds `phaseControls` (phase→button map)
 * and `seatLayout` (ring geometry) here.
 */
export interface UiRuleset {
  visibility: VisibilityRuleset;
  /** Session `updates` for a host-advance from the given phase (see phaseFlow). */
  advanceUpdates: (phase: string) => PhaseAdvanceUpdates;
}
