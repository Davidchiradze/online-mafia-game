import { describe, it, expect } from "vitest";
import {
  computeSpeakingOrder,
  getNextSpeaker,
} from "@convex/games/core/speakingOrder";

/**
 * CHARACTERIZATION TEST — day-phase speaking order (regression oracle).
 *
 * Seat indexes are 1-based, dead players are skipped, order is circular.
 * This logic is SHARED (variant-agnostic) per docs/game-types.md §4, so it
 * should survive the refactor untouched — these tests guard that.
 */

type Player = { seatNumber?: number; isAlive: boolean };

const alive = (...seats: number[]): Player[] =>
  seats.map((seatNumber) => ({ seatNumber, isAlive: true }));

describe("computeSpeakingOrder", () => {
  it("opens on the lowest alive seat when there is no previous opener", () => {
    expect(computeSpeakingOrder(alive(1, 2, 3, 4, 5), null, 12)).toEqual({
      speakingOrder: [1, 2, 3, 4, 5],
      openerIndex: 1,
    });
  });

  it("opens on the next alive seat after the previous opener", () => {
    expect(computeSpeakingOrder(alive(1, 2, 3, 4, 5), 2, 12)).toEqual({
      speakingOrder: [3, 4, 5, 1, 2],
      openerIndex: 3,
    });
  });

  it("wraps to the lowest seat when the previous opener was the highest", () => {
    expect(computeSpeakingOrder(alive(1, 2, 3, 4, 5), 5, 12)).toEqual({
      speakingOrder: [1, 2, 3, 4, 5],
      openerIndex: 1,
    });
  });

  it("skips dead players (no previous opener)", () => {
    const players: Player[] = [
      { seatNumber: 1, isAlive: true },
      { seatNumber: 2, isAlive: false },
      { seatNumber: 3, isAlive: true },
      { seatNumber: 4, isAlive: true },
      { seatNumber: 5, isAlive: true },
    ];
    expect(computeSpeakingOrder(players, null, 12)).toEqual({
      speakingOrder: [1, 3, 4, 5],
      openerIndex: 1,
    });
  });

  it("advances past a dead seat when choosing the next opener", () => {
    expect(computeSpeakingOrder(alive(1, 3, 4, 5), 1, 12)).toEqual({
      speakingOrder: [3, 4, 5, 1],
      openerIndex: 3,
    });
  });

  it("handles a single alive player (no previous opener)", () => {
    expect(computeSpeakingOrder(alive(3), null, 12)).toEqual({
      speakingOrder: [3],
      openerIndex: 3,
    });
  });

  it("handles a single alive player (with a previous opener)", () => {
    expect(computeSpeakingOrder(alive(3), 3, 12)).toEqual({
      speakingOrder: [3],
      openerIndex: 3,
    });
  });

  it("returns an empty order when nobody is alive", () => {
    expect(computeSpeakingOrder([], null, 12)).toEqual({
      speakingOrder: [],
      openerIndex: 0,
    });
  });

  it("ignores players without a seat number", () => {
    const players: Player[] = [
      { isAlive: true },
      { seatNumber: 2, isAlive: true },
    ];
    expect(computeSpeakingOrder(players, null, 12)).toEqual({
      speakingOrder: [2],
      openerIndex: 2,
    });
  });
});

describe("getNextSpeaker", () => {
  it("returns the next seat in order", () => {
    expect(getNextSpeaker(1, [1, 2, 3])).toBe(2);
  });

  it("returns null at the end of the round", () => {
    expect(getNextSpeaker(3, [1, 2, 3])).toBeNull();
  });

  it("skips seats not in the alive set", () => {
    expect(getNextSpeaker(1, [1, 2, 3, 4], new Set([1, 3, 4]))).toBe(3);
  });

  it("returns null when no later seat is still alive", () => {
    expect(getNextSpeaker(2, [1, 2, 3], new Set([1]))).toBeNull();
  });

  it("falls through to the first seat when the current seat is absent", () => {
    expect(getNextSpeaker(99, [1, 2, 3])).toBe(1);
  });

  it("falls through to the first alive seat when the current seat is absent", () => {
    expect(getNextSpeaker(99, [1, 2, 3], new Set([2, 3]))).toBe(2);
  });
});
