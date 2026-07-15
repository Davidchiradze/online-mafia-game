/**
 * Sports visibility ruleset (docs/game-types.md §2.4).
 *
 * Video-tile visibility (who sees whom, dimming, death layering) is IDENTICAL to
 * Japanese: the phase→awake-role logic is the same and Sports roles are a subset
 * of Japanese's, so it wraps the same shared `lib/game/visibility` functions by
 * reference (pinned by tests/game/visibility.test.ts). The Sports-specific night
 * privacy — each mafia seeing only their OWN kill selection (§5.4) — is NOT a
 * video-tile concern; it lives in the `MafiaTargetIndicator` gating + the
 * private `getMySelection` read, separate from this ruleset.
 */

import {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
} from "@/lib/game/visibility";
import type { VisibilityRuleset } from "../core/types";

export const SPORTS_VISIBILITY: VisibilityRuleset = {
  canSeeParticipant,
  getAwakeRoles,
  isNightActivityPhase,
  getVisibilityState,
  getVisibilityStateWithDeath,
};
