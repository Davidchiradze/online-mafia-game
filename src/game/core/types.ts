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

import type { ReactNode } from "react";
import type {
  GamePhase,
  Role,
  VisibilityState,
} from "@/lib/game/visibility";
import type { PhaseAdvanceUpdates } from "@/game/japanese/phaseFlow";
import type { GameSessionState } from "@/lib/context/gameRoomContext";

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
 * What a phase-controls renderer needs from the room to render the host's
 * controls for the current phase. Kept minimal so the map stays a pure lookup.
 */
export type PhaseControlsContext = {
  gameId: string;
  gameSessionState: GameSessionState;
};

/** Renders the host controls for one phase (a button, a controls cluster, …). */
export type PhaseControlRenderer = (ctx: PhaseControlsContext) => ReactNode;

/**
 * A variant's phase id → host-controls renderer map (docs/game-types.md §2.2,
 * Phase 4). Replaces the positional `GAME_PHASES[n]` switch that
 * `GamePhaseControls` hardcoded — the shared component looks up the current
 * phase by NAME in the resolved ruleset instead of branching on a variant's
 * phase order (§8 "phases by name, never by index").
 */
export type PhaseControlsMap = Record<string, PhaseControlRenderer>;

/**
 * The per-`gameType` frontend UI ruleset, resolved once in `gameRoomContext`.
 * Grows through the refactor: Phase 4 adds `phaseControls` (phase→controls map)
 * and (P4-T5) `seatLayout` (ring geometry) here.
 */
export interface UiRuleset {
  visibility: VisibilityRuleset;
  /** Session `updates` for a host-advance from the given phase (see phaseFlow). */
  advanceUpdates: (phase: string) => PhaseAdvanceUpdates;
  /** Phase id → host-controls renderer (replaces the positional switch). */
  phaseControls: PhaseControlsMap;
}
