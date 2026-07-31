/**
 * Day Phase Speaking Order Logic (pure functions, no DB dependency).
 *
 * Seat indexes are 1-based. Dead players are skipped.
 * Speaking order is circular (wraps from max seat to seat 1).
 */

type PlayerForSpeaking = {
  seatNumber?: number;
  isAlive: boolean;
};

type SpeakingOrderResult = {
  speakingOrder: number[];
  openerIndex: number;
};

function findNextAliveSeat(
  startIndex: number,
  aliveSeatsSorted: number[],
  maxSeats: number,
): number | null {
  if (aliveSeatsSorted.length === 0) return null;
  if (aliveSeatsSorted.length === 1) return aliveSeatsSorted[0];

  const normalizedStart = ((startIndex - 1) % maxSeats) + 1;

  for (const seat of aliveSeatsSorted) {
    if (seat > normalizedStart) return seat;
  }

  return aliveSeatsSorted[0];
}

export function computeSpeakingOrder(
  players: PlayerForSpeaking[],
  previousOpenerIndex: number | null,
  maxSeats: number,
): SpeakingOrderResult {
  const aliveSeats = players
    .filter((p) => p.isAlive && p.seatNumber !== undefined)
    .map((p) => p.seatNumber as number)
    .sort((a, b) => a - b);

  if (aliveSeats.length === 0) {
    return { speakingOrder: [], openerIndex: 0 };
  }

  let openerIndex: number;
  if (previousOpenerIndex === null) {
    openerIndex = aliveSeats[0];
  } else {
    openerIndex =
      findNextAliveSeat(previousOpenerIndex, aliveSeats, maxSeats) ??
      aliveSeats[0];
  }

  const speakingOrder: number[] = [];
  const openerPosition = aliveSeats.indexOf(openerIndex);

  for (let i = openerPosition; i < aliveSeats.length; i++) {
    speakingOrder.push(aliveSeats[i]);
  }
  for (let i = 0; i < openerPosition; i++) {
    speakingOrder.push(aliveSeats[i]);
  }

  return { speakingOrder, openerIndex };
}

/**
 * Returns the next speaker after the current one, skipping any seat not in
 * `aliveSeats` (e.g. eliminated by fouls mid-round). Returns null when no alive
 * speaker remains — i.e. the round is complete. Omit `aliveSeats` to advance by
 * position only.
 */
export function getNextSpeaker(
  currentSpeakerIndex: number,
  speakingOrder: number[],
  aliveSeats?: ReadonlySet<number | undefined>,
): number | null {
  const pos = speakingOrder.indexOf(currentSpeakerIndex);
  for (let i = pos + 1; i < speakingOrder.length; i++) {
    if (!aliveSeats || aliveSeats.has(speakingOrder[i])) return speakingOrder[i];
  }
  return null;
}
