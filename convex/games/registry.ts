/**
 * Game Definition registry (docs/engine/variant-architecture.md §2.2).
 *
 * Maps `game.gameType` → its `GameDefinition`. The ONLY backend place (besides
 * the definitions themselves) allowed to name a variant by string literal
 * (docs/engine/variant-architecture.md §8). Shared engine code calls `getGameDefinition(...)`
 * and reads the definition instead of branching on `gameType`.
 *
 * Registers Japanese, Sports and Serial Killer. A variant registered here is
 * playable; whether it is RATED is a separate answer given by `RATING_CONFIG`
 * in lib/constants.ts, and Serial Killer deliberately has no entry there
 * (docs/variants/serial_killer/rating.md).
 */

import { ConvexError } from "convex/values";
import type { GameDefinition } from "./core/types";
import { JAPANESE_DEFINITION } from "./japanese/definition";
import { SPORTS_DEFINITION } from "./sports/definition";
import { SERIAL_KILLER_DEFINITION } from "./serialkiller/definition";

const DEFINITIONS: Record<string, GameDefinition> = {
  japanese_mafia: JAPANESE_DEFINITION,
  sports_mafia: SPORTS_DEFINITION,
  serial_killer_mafia: SERIAL_KILLER_DEFINITION,
};

/**
 * Registered variants, in registration order — the canonical ordering for any
 * surface that enumerates variants (ladder tabs, filters). Reading it from the
 * registry keeps that ordering from becoming a second list to maintain.
 */
export const REGISTERED_GAME_TYPES: readonly string[] = Object.keys(DEFINITIONS);

export function getGameDefinition(gameType: string): GameDefinition {
  const def = DEFINITIONS[gameType];
  if (!def) throw new ConvexError(`No game definition for "${gameType}"`);
  return def;
}
