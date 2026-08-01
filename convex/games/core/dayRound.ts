/**
 * Shared "day round" derivation (docs/variants/sports.md §4.1 / §4.2).
 *
 * The game stores no separate day counter; the day round is DERIVED from the
 * monotonic `currentNightNumber` the session already tracks. The first day phase
 * runs before any night (`currentNightNumber === 0`) and is round 1; each
 * completed night advances the round by one:
 *
 *   currentNightNumber | day round | which day phase
 *   -------------------|-----------|-----------------
 *   0                  | 1         | first day (before any night)
 *   1                  | 2         | after night 1
 *   n                  | n + 1     | after night n
 *
 * Pure + variant-agnostic. Both the day-1 single-nominee rule (P3-T4) and the
 * 3rd-foul speaking ban (P3-T3) key off this instead of introducing a new
 * counter — the derivation is the single source of truth for "which day is it".
 */

/** The day-round index for a session at `currentNightNumber`. */
export function dayRoundFromNightNumber(currentNightNumber: number): number {
  return currentNightNumber + 1;
}

/** True for the first day phase (before any night has been played). */
export function isFirstDayRound(currentNightNumber: number): boolean {
  return currentNightNumber === 0;
}
