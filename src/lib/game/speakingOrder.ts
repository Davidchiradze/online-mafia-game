/**
 * Day Phase Speaking Order Logic
 *
 * This module contains pure, deterministic functions for computing the
 * speaking order during the Day Phase. All functions are designed to be
 * testable and independent of database or UI concerns.
 *
 * Key concepts:
 * - Seat indexes are 1-based (matching game_players.seat_number)
 * - Dead players are always skipped
 * - Speaking order is circular (wraps from max seat to seat 1)
 * - The opener of each Day Phase is persisted for next round calculation
 */

export type GamePlayer = {
  seat_number: number | null;
  is_alive: boolean;
  player_id: string;
};

export type SpeakingOrderResult = {
  /** Ordered array of seat numbers for speaking (1-based) */
  speakingOrder: number[];
  /** Seat index of the player who opens this round (1-based) */
  openerIndex: number;
};

/**
 * Finds the next alive player starting from a given seat index (exclusive).
 * Wraps around the player list circularly.
 *
 * @param startIndex - The seat index to start searching AFTER (1-based)
 * @param aliveSeatsSorted - Sorted array of alive player seat numbers (1-based)
 * @param maxSeats - Maximum number of seats in the game
 * @returns The seat index of the next alive player, or null if no alive players
 */
export function findNextAliveSeat(
  startIndex: number,
  aliveSeatsSorted: number[],
  maxSeats: number
): number | null {
  if (aliveSeatsSorted.length === 0) {
    return null;
  }

  if (aliveSeatsSorted.length === 1) {
    return aliveSeatsSorted[0];
  }

  // Normalize startIndex to be within valid range
  const normalizedStart = ((startIndex - 1) % maxSeats) + 1;

  // Find the first alive seat that comes after normalizedStart
  for (const seat of aliveSeatsSorted) {
    if (seat > normalizedStart) {
      return seat;
    }
  }

  // Wrap around: return the first alive seat (lowest number)
  return aliveSeatsSorted[0];
}

/**
 * Computes the speaking order for a Day Phase round.
 *
 * @param players - Array of game players with seat_number and is_alive
 * @param previousOpenerIndex - The seat index of the previous round's opener (1-based), or null for first round
 * @param maxSeats - Maximum number of seats in the game
 * @returns SpeakingOrderResult with the computed speaking order and opener index
 */
export function computeSpeakingOrder(
  players: GamePlayer[],
  previousOpenerIndex: number | null,
  maxSeats: number
): SpeakingOrderResult {
  // Get all alive players sorted by seat number
  const alivePlayers = players
    .filter((p) => p.is_alive && p.seat_number !== null)
    .sort((a, b) => (a.seat_number ?? 0) - (b.seat_number ?? 0));

  const aliveSeats = alivePlayers.map((p) => p.seat_number as number);

  if (aliveSeats.length === 0) {
    // Edge case: no alive players (should not normally happen)
    return { speakingOrder: [], openerIndex: 0 };
  }

  // Determine the opener for this round
  let openerIndex: number;

  if (previousOpenerIndex === null) {
    // First Day Phase: first alive player opens
    openerIndex = aliveSeats[0];
  } else {
    // Subsequent rounds: find next alive player after previous opener
    const nextOpener = findNextAliveSeat(
      previousOpenerIndex,
      aliveSeats,
      maxSeats
    );
    openerIndex = nextOpener ?? aliveSeats[0];
  }

  // Build the speaking order starting from the opener
  const speakingOrder: number[] = [];
  const openerPosition = aliveSeats.indexOf(openerIndex);

  // Add players from opener position to end
  for (let i = openerPosition; i < aliveSeats.length; i++) {
    speakingOrder.push(aliveSeats[i]);
  }

  // Add players from start to (but not including) opener position (wrap-around)
  for (let i = 0; i < openerPosition; i++) {
    speakingOrder.push(aliveSeats[i]);
  }

  return { speakingOrder, openerIndex };
}

/**
 * Gets the next speaker in the speaking order.
 *
 * @param currentSpeakerIndex - The seat index of the current speaker (1-based)
 * @param speakingOrder - The ordered array of seat numbers
 * @returns The seat index of the next speaker, or null if current speaker was the last
 */
export function getNextSpeaker(
  currentSpeakerIndex: number,
  speakingOrder: number[]
): number | null {
  const currentPosition = speakingOrder.indexOf(currentSpeakerIndex);

  if (currentPosition === -1) {
    // Current speaker not in the order (should not happen)
    return speakingOrder.length > 0 ? speakingOrder[0] : null;
  }

  const nextPosition = currentPosition + 1;

  if (nextPosition >= speakingOrder.length) {
    // All players have spoken
    return null;
  }

  return speakingOrder[nextPosition];
}

/**
 * Calculates the remaining speaking time in milliseconds.
 *
 * IMPORTANT: `currentServerTimeMs` MUST be a server-corrected timestamp
 * (e.g. from `useServerTime()` in `src/lib/time/serverTime.ts`). Passing
 * a raw `Date.now()` from the device clock will reintroduce the device
 * clock-skew bug — see `docs/server-time.md`.
 *
 * @param speakerStartedAt - Timestamp when the speaker started (ISO string or Date)
 * @param maxSpeakingTimeMs - Maximum speaking time in milliseconds
 * @param currentServerTimeMs - Server-corrected current time in milliseconds
 * @returns Remaining time in milliseconds (0 if time is up)
 */
export function calculateRemainingTime(
  speakerStartedAt: string | Date,
  maxSpeakingTimeMs: number,
  currentServerTimeMs: number
): number {
  const startTimeMs = new Date(speakerStartedAt).getTime();
  const elapsed = currentServerTimeMs - startTimeMs;
  const remaining = maxSpeakingTimeMs - elapsed;
  return Math.max(0, remaining);
}

/**
 * Calculates the progress percentage of speaking time elapsed.
 *
 * IMPORTANT: `currentServerTimeMs` MUST be a server-corrected timestamp
 * (e.g. from `useServerTime()` in `src/lib/time/serverTime.ts`). Passing
 * a raw `Date.now()` from the device clock will reintroduce the device
 * clock-skew bug — see `docs/server-time.md`.
 *
 * @param speakerStartedAt - Timestamp when the speaker started (ISO string or Date)
 * @param maxSpeakingTimeMs - Maximum speaking time in milliseconds
 * @param currentServerTimeMs - Server-corrected current time in milliseconds
 * @returns Progress as a percentage (0-100)
 */
export function calculateSpeakingProgress(
  speakerStartedAt: string | Date,
  maxSpeakingTimeMs: number,
  currentServerTimeMs: number
): number {
  const startTimeMs = new Date(speakerStartedAt).getTime();
  const elapsed = currentServerTimeMs - startTimeMs;
  const progress = (elapsed / maxSpeakingTimeMs) * 100;
  return Math.min(100, Math.max(0, progress));
}
