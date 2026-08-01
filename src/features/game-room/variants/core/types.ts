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
} from "@/shared/lib/game/visibility";
import type { PhaseAdvanceUpdates } from "@/features/game-room/variants/japanese/phaseFlow";
import type { GameSessionState } from "@/features/game-room/context/gameRoomContext";

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
 * Renders the host-only night-actions summary — the compact "who targeted whom"
 * strip shown above the host controls during night phases. Japanese shows the
 * single-authority scalars (M/Y/H); Sports shows one pill per living mafia's
 * private pick (resolved from the host-only `getHostSelections`). Each variant's
 * renderer reads what it needs from `useGameRoom()`, so it takes no props.
 */
export type NightActionsRenderer = () => ReactNode;

/**
 * A variant's phase id → host-controls renderer map (docs/game-types.md §2.2,
 * Phase 4). Replaces the positional `GAME_PHASES[n]` switch that
 * `GamePhaseControls` hardcoded — the shared component looks up the current
 * phase by NAME in the resolved ruleset instead of branching on a variant's
 * phase order (§8 "phases by name, never by index").
 */
export type PhaseControlsMap = Record<string, PhaseControlRenderer>;

/** A cell in the participant-circle CSS grid (1-based row/column). */
export type GridPosition = { gridRow: number; gridColumn: number };

/** A rectangular grid span (line numbers, end exclusive — CSS grid-line style). */
export type GridSpan = {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
};

/**
 * The participant-circle ring geometry for a variant (docs/game-types.md §6,
 * P4-T5). Replaces the hardcoded 4×4 switch in `useSeatShuffleAnimation` so a
 * 10-seat Sports ring and the 12-seat Japanese ring both come from the resolved
 * ruleset. `center` is the region the host + host-controls occupy; seats fill
 * the ring around it.
 *
 * Center layout has two modes:
 * - **Merged** (default, Japanese): host video + controls stack inside the one
 *   `center` panel.
 * - **Split** (Sports): host video and controls render in separate cells,
 *   `hostPanel` and `controlsPanel`. When both are set the renderer uses the
 *   split layout; otherwise it falls back to the merged `center` panel.
 */
export type SeatLayout = {
  /** Grid template size. */
  cols: number;
  rows: number;
  /** The center region host + controls occupy (used as the merged panel span). */
  center: GridSpan;
  /** Split-center: the host-video cell (paired with `controlsPanel`). */
  hostPanel?: GridSpan;
  /** Split-center: the host-controls / voting cell (paired with `hostPanel`). */
  controlsPanel?: GridSpan;
  /** Ring cell for a 1-based seat number. */
  positionForSeat: (seat: number) => GridPosition;
};

/** One player as the night-authority computation needs them (role via `roleOf`). */
export type NightAuthorityPlayer = { playerId: string; isAlive: boolean };

/** Everything a variant needs to decide who may act tonight (pure inputs). */
export type NightAuthorityInput = {
  phase: string | null;
  isHost: boolean;
  userId: string;
  viewerRole: string | null;
  players: readonly NightAuthorityPlayer[];
  roleOf: (playerId: string) => string | null;
};

/**
 * Whether the viewer may take each night action, and whether the current phase
 * is each night phase. The shape `useNightActionAuthority` returns; a variant's
 * `nightAuthority` computes it (Japanese: single kill authority DON>RH>MAFIA,
 * SHOGUN>YAKUZA, DOCTOR; Sports: EVERY living mafia acts, no yakuza/doctor §5).
 */
export type NightActionAuthority = {
  hasMafiaKillAuthority: boolean;
  isMafiaPhase: boolean;
  hasYakuzaKillAuthority: boolean;
  isYakuzaPhase: boolean;
  hasDoctorHealAuthority: boolean;
  isDoctorPhase: boolean;
};

/**
 * The per-`gameType` frontend UI ruleset, resolved once in `gameRoomContext`.
 * Grows through the refactor: Phase 4 adds `phaseControls` (phase→controls map),
 * `nightAuthority` (who may act tonight), and (P4-T5) `seatLayout`.
 */
export interface UiRuleset {
  visibility: VisibilityRuleset;
  /** Session `updates` for a host-advance from the given phase (see phaseFlow). */
  advanceUpdates: (phase: string) => PhaseAdvanceUpdates;
  /** Phase id → host-controls renderer (replaces the positional switch). */
  phaseControls: PhaseControlsMap;
  /** Host-only night-actions summary strip (variant kill model). */
  nightActionsDisplay: NightActionsRenderer;
  /** Pure: who may take a night action this phase (variant kill model). */
  nightAuthority: (input: NightAuthorityInput) => NightActionAuthority;
  /** Participant-circle ring geometry (12-ring Japanese, 10-ring Sports). */
  seatLayout: SeatLayout;
  /**
   * Whether nominated players get a self-justification phase before voting, and
   * therefore whether the host is asked at game start (Japanese: true, prompted
   * via `StartGameModal`; Sports §: false — no self-justification ever, so the
   * host starts directly with `withoutSelfJustification: true` and no modal).
   */
  hasSelfJustification: boolean;
  /**
   * How the mafia pick their night kill (mirrors the backend `night.kind`):
   * - `single-authority` (Japanese): one authority picks a SHARED target the
   *   whole team sees.
   * - `unanimous-vote` (Sports §5): every living mafia picks PRIVATELY inside a
   *   timed window; each sees only their own pick.
   * The shared mafia-kill UI (`useMafiaTargetSelection` / `MafiaKillButton`)
   * switches on this instead of branching on `gameType`.
   */
  mafiaNightModel: "single-authority" | "unanimous-vote";
}
