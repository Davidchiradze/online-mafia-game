/**
 * Frontend UI ruleset registry (docs/engine/variant-architecture.md §2.2) — the parallel of the
 * backend `getGameDefinition`. Maps `gameData.gameType` → its `UiRuleset`.
 * Resolved once in `gameRoomContext`; shared UI reads the ruleset instead of
 * branching on `gameType`.
 *
 * Registers Japanese, Sports and Serial Killer — every variant with a backend
 * definition. `city_mafia` is reserved in the `GameType` union with no
 * definition on either side.
 */

import { REGISTERED_GAME_TYPES } from "@convex/games/registry";
import type { UiRuleset } from "./core/types";
import { JAPANESE_UI_RULESET } from "./japanese/ruleset";
import { SPORTS_UI_RULESET } from "./sports/ruleset";
import { SERIAL_KILLER_UI_RULESET } from "./serialkiller/ruleset";

const UI_RULESETS: Record<string, UiRuleset> = {
  japanese_mafia: JAPANESE_UI_RULESET,
  sports_mafia: SPORTS_UI_RULESET,
  serial_killer_mafia: SERIAL_KILLER_UI_RULESET,
};

/**
 * Resolve the UI ruleset for a game type.
 *
 * - `null`/`undefined` (game still loading) → Japanese, so the room renders
 *   without a flicker before `gameData` arrives.
 * - A known type → its ruleset.
 * - A type with a BACKEND definition but no ruleset here → **throws**. This is
 *   the dangerous case and it used to fall back to Japanese with a dev-only
 *   console warning: a registered variant would then deal its own deck into
 *   Japanese's ring, phases and controls, in production, silently. A blank
 *   error boundary is a far better outcome than a game that looks playable and
 *   is not.
 * - An unregistered type (`city_mafia`) → Japanese with a dev warning, as
 *   before. Nothing can create one, and callers like profile cards must not
 *   crash on a legacy row.
 */
export function getUiRuleset(gameType: string | null | undefined): UiRuleset {
  if (!gameType) return JAPANESE_UI_RULESET;
  const ruleset = UI_RULESETS[gameType];
  if (ruleset) return ruleset;

  if (REGISTERED_GAME_TYPES.includes(gameType)) {
    throw new Error(
      `[game/registry] "${gameType}" has a backend definition but no UI ruleset. ` +
        `Register it in src/features/game-room/variants/registry.ts — falling back ` +
        `to Japanese would deal its deck into the wrong ring and phase controls.`,
    );
  }

  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[game/registry] No UI ruleset for game type "${gameType}"; falling back to Japanese.`,
    );
  }
  return JAPANESE_UI_RULESET;
}
