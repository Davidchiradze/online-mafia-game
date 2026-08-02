/**
 * Frontend UI ruleset registry (docs/engine/variant-architecture.md §2.2) — the parallel of the
 * backend `getGameDefinition`. Maps `gameData.gameType` → its `UiRuleset`.
 * Resolved once in `gameRoomContext`; shared UI reads the ruleset instead of
 * branching on `gameType`.
 *
 * Phase 1 registered only Japanese. Phase 4 (P4-T2) registers Sports alongside
 * its host-advance flow + phase-controls map (Sports visibility + seat layout
 * follow in P4-T3/T5). Sports stays non-creatable in the UI until Phase 5.
 */

import type { UiRuleset } from "./core/types";
import { JAPANESE_UI_RULESET } from "./japanese/ruleset";
import { SPORTS_UI_RULESET } from "./sports/ruleset";

const UI_RULESETS: Record<string, UiRuleset> = {
  japanese_mafia: JAPANESE_UI_RULESET,
  sports_mafia: SPORTS_UI_RULESET,
};

/**
 * Resolve the UI ruleset for a game type.
 *
 * - `null`/`undefined` (game still loading) → Japanese, so the room renders
 *   without a flicker before `gameData` arrives.
 * - A known type → its ruleset.
 * - A genuinely unknown non-null type → falls back to Japanese with a dev-only
 *   warning rather than crashing the live room. Phase 4 makes dispatch strict
 *   once other variants ship their rulesets.
 */
export function getUiRuleset(gameType: string | null | undefined): UiRuleset {
  if (!gameType) return JAPANESE_UI_RULESET;
  const ruleset = UI_RULESETS[gameType];
  if (!ruleset) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[game/registry] No UI ruleset for game type "${gameType}"; falling back to Japanese.`,
      );
    }
    return JAPANESE_UI_RULESET;
  }
  return ruleset;
}
