/**
 * Core, variant-AGNOSTIC types for the Game Definition registry.
 *
 * See docs/game-types.md §2.1. A `GameDefinition` declares everything
 * variant-specific behind stable interfaces so the shared engine can consult it
 * once per game (keyed by `game.gameType`) instead of threading `gameType`
 * literals through the codebase.
 *
 * GUARDRAIL (docs/game-types.md §8): definitions are **pure** — no `ctx.db`,
 * no React, no server coupling — so the same module is safe on client and
 * server and is unit-testable in isolation.
 *
 * SCOPE: this file covers the BACKEND (pure rules) side of a definition —
 * roles, deck, factions, phases + transitions, the night resolution seam, win
 * detection, and engine flags. UI-only concerns (per-phase timers, the
 * `VisibilityRuleset`, the phase→controls map, seat-layout geometry) live in a
 * PARALLEL frontend registry under `src/game/*` (docs/game-types.md §2.2) so
 * that `convex/` never imports from `src/`. Those are introduced in P1-T8.
 */

import type { Faction } from "../../lib/roles";
import type { WinContext, GameOutcome } from "../../lib/winConditions";

export type { Faction, WinContext };

/** Roles and phases are string ids across the engine — never referenced by index. */
export type Role = string;
export type Phase = string;

/** A finished-game outcome: a faction win or a `"no_contest"`. */
export type Outcome = GameOutcome;

/** The game variants the registry can resolve (mirrors the schema validator). */
export type GameType = "japanese_mafia" | "sports_mafia" | "city_mafia";

/**
 * State the host-advance graph may branch on. Deterministic edges ignore it;
 * state-dependent transitions (day→nominated/voting, farewell→day/night, …)
 * read it. Kept optional and additive as variants need more context.
 */
export type PhaseContext = {
  hasNominatedPlayers?: boolean;
  aliveCount?: number;
  nightNumber?: number;
};

/**
 * The recorded night, as a superset covering every variant's shape
 * (docs/game-types.md §2.3, option 1: additive optional fields). Japanese
 * uses the single-authority scalars; Sports (Phase 3) uses the per-mafia
 * `mafiaTargetSelections` array. A variant's `resolveKills` reads only the
 * fields its model records and ignores the rest.
 */
export type NightState = {
  // Japanese `single-authority` scalars.
  mafiaTarget?: number;
  yakuzaTarget?: number;
  healedPlayer?: number;
  // Sports `unanimous-vote` selections (added in Phase 3).
  mafiaTargetSelections?: { voterSeat: number; targetSeat: number }[];
};

export type NightKind = "single-authority" | "unanimous-vote";

/**
 * How a variant chooses AND resolves night kills — the deepest divergence
 * (docs/game-types.md §2.3). Only `resolveKills` is pure/shared here; the
 * DB-coupled "who has authority / record a selection" logic stays in the
 * night-phase mutations (a definition may not touch `ctx.db`).
 */
export interface NightModel {
  kind: NightKind;
  /** Roles that take a night action (kill/heal/check) in this variant. */
  actingRoles: readonly Role[];
  /**
   * Pure resolution of a recorded night into the seats that die this night.
   * The shared `startFarewellSpeech` will call this instead of reading the
   * night-session scalars directly (wired later in Phase 1).
   */
  resolveKills: (state: NightState) => number[];
}

/** Variant switches the shared engine reads (docs/game-types.md §2.1). */
export type GameFlags = {
  hasIntroductionPhase: boolean;
  hasFarewellSpeech: boolean;
  hasRightHandPromotion: boolean;
  /** Sports day-1 rule: a single nominee on the first day skips to night. */
  firstDaySingleNomineeSkipsToNight: boolean;
  /** Sports: the 3rd foul bans the player from speaking. */
  thirdFoulSpeakingBan: boolean;
};

/**
 * The single source of truth for one game variant's rules (backend side).
 * Resolved once per game via `getGameDefinition(game.gameType)`.
 */
export interface GameDefinition {
  id: GameType;
  /** Seated non-host players (Japanese 12, Sports 10). */
  seatCount: number;

  roles: readonly Role[];
  /** The deck dealt at card-picking time (length === seatCount). */
  roleDistribution: readonly Role[];
  factions: readonly Faction[];
  roleToFaction: (role: Role) => Faction;
  /** Who meets/sees together (mafia team, yakuza team, …). */
  teams: Record<string, readonly Role[]>;

  /** Ordered phase ids for THIS variant. */
  phases: readonly Phase[];
  /**
   * Given the current phase (+ optional state), the phase the host's advance
   * action moves to — or `null` when the transition is state-dependent and
   * owned by a server mutation. Replaces the positional `GAME_PHASES[n]`
   * literals hardcoded in the phase buttons (docs/game-types.md §2.1).
   */
  nextPhase: (phase: Phase, ctx?: PhaseContext) => Phase | null;

  night: NightModel;

  /** Generalizes `decideWinner`; each variant ships its own tables. */
  decideWinner: (aliveRoles: Role[], context: WinContext) => Outcome | null;

  flags: GameFlags;
}
