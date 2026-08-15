/**
 * The farewell run — who is saying goodbye, and who is still owed a speech.
 *
 * SILENT FAILURE MODE: `currentSpeakerIndex` does not mean here what it means
 * in every other speaking phase. A day or self-justification round stores the
 * `SPEAKING_STATE`-encoded cursor that `speakingRun()` decodes (positive =
 * speaking, negative = just finished, `-99` = round over). The farewell stores
 * a bare SEAT while someone holds the floor and clears it to `undefined` the
 * moment they finish — progress is recorded by flipping the player to DEAD, not
 * by moving a cursor.
 *
 * So the two look interchangeable and are not: hand a farewell cursor to
 * `speakingRun()` and it reads correctly while a victim is speaking, then
 * reports "not started" after every completed speech. The host would see the
 * first victim queued up again after the second one was already marked dead.
 * Hence a separate derivation, with the aliveness input made explicit.
 */

import type { SeatChip } from "@/features/game-room/lib/hostPanel";

export type FarewellRunMode = "empty" | "waiting" | "speaking" | "completed";

export type FarewellRun = {
  mode: FarewellRunMode;
  order: readonly number[];
  /** The seat saying goodbye right now, or null. */
  activeSeat: number | null;
  /** The seat that speaks when the host grants time, or null if none is left. */
  nextSeat: number | null;
  /** Seats whose speech is over — they are dead now. */
  doneSeats: readonly number[];
  total: number;
};

export function farewellRun(
  order: readonly number[],
  currentSpeakerIndex: number | null | undefined,
  isSeatDead: (seat: number) => boolean,
): FarewellRun {
  const total = order.length;
  const activeSeat = currentSpeakerIndex ?? null;
  const doneSeats = order.filter((seat) => isSeatDead(seat));

  // Mirrors `grantFarewellTime`, which grants to the FIRST still-living seat in
  // the stored order. Deriving "next" any other way would name a different seat
  // than the mutation actually starts.
  const nextSeat =
    order.find((seat) => seat !== activeSeat && !isSeatDead(seat)) ?? null;

  const mode: FarewellRunMode =
    total === 0
      ? "empty"
      : activeSeat !== null
        ? "speaking"
        : nextSeat !== null
          ? "waiting"
          : "completed";

  return { mode, order, activeSeat, nextSeat, doneSeats, total };
}

/**
 * The whole run as seat chips. Farewell orders are short — one night victim,
 * two when both the mafia and the yakuza connect, or the pair from a
 * both-leave vote — so the full run always fits.
 */
export function farewellRunChips(run: FarewellRun): SeatChip[] {
  const done = new Set(run.doneSeats);
  return run.order.map((seat): SeatChip => {
    if (seat === run.activeSeat) return { seat, tone: "active" };
    if (seat === run.nextSeat) return { seat, tone: "next" };
    return { seat, tone: done.has(seat) ? "done" : "idle" };
  });
}

/**
 * Where the farewell lets out.
 *
 * The phase is entered from two completely different places — dawn, once the
 * night's kills resolve, and the day, once a vote (or a lone nominee) puts
 * someone out — and `advanceFromFarewell` tells them apart by exactly this:
 * standing nominations mean the day already happened, so the game owes a night.
 * The host panel names the destination on its button, so it has to read the
 * same signal or it will promise a phase the server does not deliver.
 */
export type FarewellExit = "night" | "day";

export function farewellExit(
  nominatedPlayers: readonly number[] | null | undefined,
): FarewellExit {
  return (nominatedPlayers?.length ?? 0) > 0 ? "night" : "day";
}
