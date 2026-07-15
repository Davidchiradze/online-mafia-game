/**
 * The Sports frontend UI ruleset — the UI-side counterpart to
 * `convex/games/sports/definition.ts` (docs/game-types.md §2.2).
 *
 * Assembles the pieces the shared UI consults for a Sports game: visibility,
 * the host-advance flow (`sportsAdvanceUpdates`), the phase → host-controls map,
 * and the night-action authority (every living mafia acts, §5).
 */

import type { UiRuleset } from "../core/types";
import { SPORTS_VISIBILITY } from "./visibility";
import { sportsAdvanceUpdates } from "./phaseFlow";
import { SPORTS_PHASE_CONTROLS } from "./phaseControls";
import { sportsNightAuthority } from "./nightAuthority";
import { SPORTS_SEAT_LAYOUT } from "./seatLayout";

export const SPORTS_UI_RULESET: UiRuleset = {
  visibility: SPORTS_VISIBILITY,
  advanceUpdates: sportsAdvanceUpdates,
  phaseControls: SPORTS_PHASE_CONTROLS,
  nightAuthority: sportsNightAuthority,
  seatLayout: SPORTS_SEAT_LAYOUT,
};
