/**
 * Speaking-run derivation.
 *
 * SILENT FAILURE MODE: `currentSpeakerIndex` overloads one number with three
 * meanings — positive is the seat SPEAKING, negative is the seat that JUST
 * FINISHED, `-99` is "round over". Get the paused case wrong and the host's
 * panel offers "Start" to a speaker who is already talking, or counts the last
 * speaker twice. None of that throws; it just misleads the host mid-round.
 *
 * The off-by-one that matters: PAUSED already counts the last speaker as
 * spoken, ACTIVE does not.
 */

import { describe, expect, it } from "vitest";

import { SPEAKING_STATE } from "@/shared/lib/constants/game";
import {
  speakingRun,
  speakingRunChips,
} from "@/features/game-room/lib/speakingRun";

const ORDER = [4, 7, 1, 9];

describe("speakingRun", () => {
  it("previews the opener before the host has started", () => {
    // The order is precomputed on phase entry but the cursor stays unset until
    // the host clicks Start, so seat 1 of the order is "next", not "speaking".
    expect(speakingRun(ORDER, null)).toMatchObject({
      mode: "not-started",
      activeSeat: null,
      nextSeat: 4,
      spokenCount: 0,
      position: 0,
      isLastSpeaker: false,
    });
  });

  it("does not count the seat currently speaking as spoken", () => {
    expect(speakingRun(ORDER, 1)).toMatchObject({
      mode: "active",
      activeSeat: 1,
      nextSeat: 9,
      spokenCount: 2,
      position: 3,
      isLastSpeaker: false,
    });
  });

  it("counts the seat that just finished as spoken", () => {
    expect(speakingRun(ORDER, SPEAKING_STATE.toPausedValue(1))).toMatchObject({
      mode: "paused",
      activeSeat: null,
      nextSeat: 9,
      spokenCount: 3,
      position: 3,
      isLastSpeaker: false,
    });
  });

  it("flags the last speaker in both active and paused form", () => {
    expect(speakingRun(ORDER, 9).isLastSpeaker).toBe(true);
    expect(
      speakingRun(ORDER, SPEAKING_STATE.toPausedValue(9)),
    ).toMatchObject({ isLastSpeaker: true, nextSeat: null, spokenCount: 4 });
  });

  it("reports a completed round as everyone spoken", () => {
    expect(speakingRun(ORDER, SPEAKING_STATE.COMPLETED)).toMatchObject({
      mode: "completed",
      activeSeat: null,
      nextSeat: null,
      spokenCount: 4,
      isLastSpeaker: true,
    });
  });

  it("survives an empty order", () => {
    expect(speakingRun([], null)).toMatchObject({
      mode: "not-started",
      nextSeat: null,
      total: 0,
    });
  });
});

describe("speakingRunChips", () => {
  const tones = (value: number | null) =>
    speakingRunChips(speakingRun(ORDER, value)).map((c) => c.tone);

  it("marks exactly one seat active and one next while speaking", () => {
    expect(tones(7)).toEqual(["done", "active", "next", "idle"]);
  });

  it("promotes the follower to next while paused", () => {
    expect(tones(SPEAKING_STATE.toPausedValue(7))).toEqual([
      "done",
      "done",
      "next",
      "idle",
    ]);
  });

  it("previews the opener before the run starts", () => {
    expect(tones(null)).toEqual(["next", "idle", "idle", "idle"]);
  });

  it("greys the whole run once it completes", () => {
    expect(tones(SPEAKING_STATE.COMPLETED)).toEqual([
      "done",
      "done",
      "done",
      "done",
    ]);
  });
});
