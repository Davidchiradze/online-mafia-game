/**
 * The speaking run — who is on the clock, who is next, how far through we are.
 *
 * SILENT FAILURE MODE: `currentSpeakerIndex` is a single number carrying three
 * different meanings at once (`SPEAKING_STATE`): a positive value is the seat
 * SPEAKING, a negative value is the seat that JUST FINISHED (paused, waiting
 * for the host to advance), and `-99` means the round is over. Every consumer
 * that re-derives that by hand gets one of the three cases subtly wrong — the
 * pre-existing controls each had their own `indexOf` arithmetic, and only the
 * nominated one bothered with a position count.
 *
 * So it is derived once, here, as a pure function. Note that "paused" already
 * counts the last speaker as spoken, and "active" does not.
 */

import { SPEAKING_STATE } from "@/shared/lib/constants/game";
import type { SeatChip } from "@/features/game-room/lib/hostPanel";

export type SpeakingRunMode = "not-started" | "active" | "paused" | "completed";

export type SpeakingRun = {
  mode: SpeakingRunMode;
  order: readonly number[];
  /** The seat holding the floor right now, or null. */
  activeSeat: number | null;
  /** The seat that speaks when the host advances, or null if none is left. */
  nextSeat: number | null;
  /** How many seats have finished. Excludes the seat currently speaking. */
  spokenCount: number;
  total: number;
  /** 1-based position of the seat on the clock (or the one that just spoke). */
  position: number;
  /** The seat on the clock is the last in the order — advancing ends the run. */
  isLastSpeaker: boolean;
};

export function speakingRun(
  order: readonly number[],
  currentSpeakerIndex: number | null | undefined,
): SpeakingRun {
  const total = order.length;
  const value = currentSpeakerIndex ?? null;

  // Not started: the order is precomputed on phase entry but the cursor stays
  // unset until the host clicks Start, so seat 1 of the order is "next".
  if (total === 0 || value === null) {
    return {
      mode: "not-started",
      order,
      activeSeat: null,
      nextSeat: order[0] ?? null,
      spokenCount: 0,
      total,
      position: 0,
      isLastSpeaker: false,
    };
  }

  if (SPEAKING_STATE.isCompleted(value)) {
    return {
      mode: "completed",
      order,
      activeSeat: null,
      nextSeat: null,
      spokenCount: total,
      total,
      position: total,
      isLastSpeaker: true,
    };
  }

  if (SPEAKING_STATE.isPaused(value)) {
    const lastSeat = SPEAKING_STATE.getLastSpeakerFromPaused(value);
    const lastIndex = order.indexOf(lastSeat);
    const position = lastIndex + 1;
    return {
      mode: "paused",
      order,
      activeSeat: null,
      nextSeat: lastIndex >= 0 ? (order[lastIndex + 1] ?? null) : null,
      spokenCount: position,
      total,
      position,
      isLastSpeaker: position === total,
    };
  }

  const activeIndex = order.indexOf(value);
  const position = activeIndex + 1;
  return {
    mode: "active",
    order,
    activeSeat: value,
    nextSeat: activeIndex >= 0 ? (order[activeIndex + 1] ?? null) : null,
    spokenCount: Math.max(0, position - 1),
    total,
    position,
    isLastSpeaker: position === total,
  };
}

/**
 * The whole run as seat chips — used where the order is short enough to show
 * in full (self-justification is two or three seats). A day or introduction
 * run is ten to twelve seats and shows now/next pills instead.
 */
export function speakingRunChips(run: SpeakingRun): SeatChip[] {
  return run.order.map((seat, index) => {
    if (seat === run.activeSeat) return { seat, tone: "active" };
    if (seat === run.nextSeat) return { seat, tone: "next" };
    return { seat, tone: index < run.position ? "done" : "idle" };
  });
}
