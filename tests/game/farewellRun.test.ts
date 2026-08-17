/**
 * The farewell run.
 *
 * SILENT FAILURE MODE: this phase stores its cursor differently from every
 * other speaking phase — a bare seat while someone holds the floor, cleared to
 * `undefined` after, with progress recorded by the player flipping to DEAD.
 * Nothing throws when that is decoded with the `SPEAKING_STATE` rules the day
 * round uses; the run simply looks un-started after each completed speech and
 * the host is offered the first victim again. So the mapping from
 * (order, cursor, aliveness) to mode is pinned here.
 */

import { describe, expect, it } from "vitest";

import {
  farewellExit,
  farewellRun,
  farewellRunChips,
} from "@/features/game-room/lib/farewellRun";

/** `isSeatDead` for a set of seats that have already had their goodbye. */
const dead = (...seats: number[]) => {
  const set = new Set(seats);
  return (seat: number) => set.has(seat);
};

describe("farewellRun", () => {
  it("queues the first victim when the phase is entered", () => {
    const run = farewellRun([7, 3], undefined, dead());
    expect(run.mode).toBe("waiting");
    expect(run.activeSeat).toBeNull();
    expect(run.nextSeat).toBe(7);
    expect(run.doneSeats).toEqual([]);
  });

  it("reports the seat holding the floor", () => {
    const run = farewellRun([7, 3], 7, dead());
    expect(run.mode).toBe("speaking");
    expect(run.activeSeat).toBe(7);
    // The speaker is not their own successor.
    expect(run.nextSeat).toBe(3);
  });

  it("moves on after a speech instead of restarting the run", () => {
    // THE regression the separate derivation exists for. Seat 7 has spoken and
    // is dead; the cursor is back to `undefined`, which the day-phase decoder
    // reads as "not started" — it would offer seat 7 all over again.
    const run = farewellRun([7, 3], undefined, dead(7));
    expect(run.mode).toBe("waiting");
    expect(run.nextSeat).toBe(3);
    expect(run.doneSeats).toEqual([7]);
  });

  it("completes only once every seat in the order is dead", () => {
    const run = farewellRun([7, 3], undefined, dead(7, 3));
    expect(run.mode).toBe("completed");
    expect(run.activeSeat).toBeNull();
    expect(run.nextSeat).toBeNull();
    expect(run.doneSeats).toEqual([7, 3]);
  });

  it("grants time in the stored order, exactly like the mutation does", () => {
    // `grantFarewellTime` takes the FIRST still-living seat in `speakingOrder`.
    // The order is shuffled so a mafia kill cannot be told from a yakuza one;
    // re-sorting it here would name a different seat than the server starts.
    expect(farewellRun([9, 2, 5], undefined, dead()).nextSeat).toBe(9);
    expect(farewellRun([9, 2, 5], undefined, dead(9)).nextSeat).toBe(2);
  });

  it("has a way out of an empty run", () => {
    // Unreachable in theory — the server skips the phase when nobody dies —
    // but "no speakers" must never mean "no button", or the game is stuck.
    const run = farewellRun([], undefined, dead());
    expect(run.mode).toBe("empty");
    expect(run.total).toBe(0);
  });
});

describe("farewellRunChips", () => {
  it("tones the run by what has already happened", () => {
    const run = farewellRun([7, 3, 5], 3, dead(7));
    expect(farewellRunChips(run)).toEqual([
      { seat: 7, tone: "done" },
      { seat: 3, tone: "active" },
      { seat: 5, tone: "next" },
    ]);
  });

  it("leaves the queue idle before the first speech starts", () => {
    const run = farewellRun([7, 3, 5], undefined, dead());
    expect(farewellRunChips(run)).toEqual([
      { seat: 7, tone: "next" },
      { seat: 3, tone: "idle" },
      { seat: 5, tone: "idle" },
    ]);
  });
});

describe("farewellExit", () => {
  it("owes a night when nominations are standing", () => {
    // Someone was voted out, so the day is spent — matches the branch in
    // `advanceFromFarewell`.
    expect(farewellExit([4])).toBe("night");
  });

  it("owes a day when the night's kills brought us here", () => {
    expect(farewellExit([])).toBe("day");
    expect(farewellExit(undefined)).toBe("day");
    expect(farewellExit(null)).toBe("day");
  });
});
