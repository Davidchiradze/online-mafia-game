/**
 * Whole-game reads over `nightPhaseSessions`.
 *
 * A night row is normally fetched for ONE night (`by_gameId_nightNumber`). The
 * questions here span every night of the game instead, because they answer
 * "has this once-per-game ability been used yet".
 */

import type { DatabaseReader } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Whether the Serial Killer's single shot has already been fired
 * (docs/variants/serial_killer/rules.md §5.1).
 *
 * DERIVED, never stored: the shot is spent iff any night session in this game
 * recorded a `serialKillerTarget`. That is the same whole-game scan the Doctor's
 * heal-once-per-player rule already runs, and it means there is no "hasFired"
 * flag that could drift out of step with the night it came from.
 *
 * A shot the Doctor saved still counts as spent — the bullet was fired, it just
 * did not land. That falls out of reading the RECORDED TARGET rather than the
 * resulting death, which is the reason to key off this field and not the kill.
 *
 * Returns false for every variant that has no Serial Killer: they never write
 * the field, so the scan finds nothing.
 */
export async function isSerialKillerShotSpent(
  db: DatabaseReader,
  gameId: Id<"games">,
): Promise<boolean> {
  const sessions = await db
    .query("nightPhaseSessions")
    .withIndex("by_gameId", (q) => q.eq("gameId", gameId))
    .collect();

  return sessions.some((s) => s.serialKillerTarget !== undefined);
}
