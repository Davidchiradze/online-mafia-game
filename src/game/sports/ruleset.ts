/**
 * The Sports frontend UI ruleset — the UI-side counterpart to
 * `convex/games/sports/definition.ts` (docs/game-types.md §2.2).
 *
 * Assembles the pieces the shared UI consults for a Sports game: the
 * host-advance flow (`sportsAdvanceUpdates`) and the phase → host-controls map.
 *
 * INTERIM (P4-T2): `visibility` reuses the Japanese ruleset. Sports visibility
 * is nearly identical to Japanese; the one real difference — mafia kill
 * selections being PRIVATE to each mafia (§5.4) — is authored in P4-T3, which
 * swaps this for a Sports-specific `VisibilityRuleset`. Sports stays
 * non-creatable until Phase 5, so the interim reuse has no live effect.
 */

import type { UiRuleset } from "../core/types";
import { JAPANESE_VISIBILITY } from "../japanese/visibility";
import { sportsAdvanceUpdates } from "./phaseFlow";
import { SPORTS_PHASE_CONTROLS } from "./phaseControls";

export const SPORTS_UI_RULESET: UiRuleset = {
  visibility: JAPANESE_VISIBILITY, // interim — replaced in P4-T3
  advanceUpdates: sportsAdvanceUpdates,
  phaseControls: SPORTS_PHASE_CONTROLS,
};
