/**
 * Game Definition registry (docs/game-types.md §2.2).
 *
 * Maps `game.gameType` → its `GameDefinition`. The ONLY backend place (besides
 * the definitions themselves) allowed to name a variant by string literal
 * (docs/game-types.md §8). Shared engine code calls `getGameDefinition(...)`
 * and reads the definition instead of branching on `gameType`.
 *
 * Phase 1 registers only Japanese. `sports_mafia` is added in Phase 2 once its
 * definition exists; it stays non-creatable in the UI until Phase 5.
 */

import { ConvexError } from "convex/values";
import type { GameDefinition } from "./core/types";
import { JAPANESE_DEFINITION } from "./japanese/definition";

const DEFINITIONS: Record<string, GameDefinition> = {
  japanese_mafia: JAPANESE_DEFINITION,
};

export function getGameDefinition(gameType: string): GameDefinition {
  const def = DEFINITIONS[gameType];
  if (!def) throw new ConvexError(`No game definition for "${gameType}"`);
  return def;
}
