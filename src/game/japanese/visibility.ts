/**
 * Japanese visibility ruleset (docs/game-types.md §2.4).
 *
 * Phase-1 note: this WRAPS the current implementations in
 * `src/lib/game/visibility.ts` by reference — same functions, zero behavior
 * change (pinned by `tests/game/visibility.test.ts`). The literal phase+role
 * chains move verbatim into this file in a later phase; when they do, only the
 * imports change, never the behavior. The `VisibilityState` enum and the
 * `getVisibilityStateWithDeath` death-layering stay shared in `lib`.
 */

import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
} from "@/shared/lib/game/visibility";
import type { VisibilityRuleset } from "@/game/core/types";

export const JAPANESE_VISIBILITY: VisibilityRuleset = {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
};
