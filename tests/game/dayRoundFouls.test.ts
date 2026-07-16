import { describe, it, expect } from "vitest";
import {
  dayRoundFromNightNumber,
  isFirstDayRound,
} from "@convex/games/core/dayRound";
import {
  THIRD_FOUL_BAN_COUNT,
  LAST_DAY_ALIVE_MAX,
  foulSpeakingBanRound,
  isSpeakingBanned,
} from "@convex/games/core/fouls";

/**
 * CHARACTERIZATION TEST — the shared day-round derivation + 3rd-foul speaking
 * ban logic (docs/sports-mafia.md §4.1 / §4.2). Pure functions consumed by
 * `dayPhase.ts` under the Sports flags; these pin the arithmetic so the
 * DB-coupled behavior in gameEngine.test.ts can trust it.
 */

describe("day round derivation", () => {
  it("maps the pre-night session (night 0) to day round 1", () => {
    expect(dayRoundFromNightNumber(0)).toBe(1);
    expect(isFirstDayRound(0)).toBe(true);
  });

  it("advances one day round per completed night", () => {
    expect(dayRoundFromNightNumber(1)).toBe(2);
    expect(dayRoundFromNightNumber(2)).toBe(3);
    expect(dayRoundFromNightNumber(5)).toBe(6);
  });

  it("is the first round only before any night", () => {
    expect(isFirstDayRound(1)).toBe(false);
    expect(isFirstDayRound(2)).toBe(false);
  });
});

describe("foul speaking ban — round arithmetic", () => {
  it("bans the 3rd foul (MAX_FOULS), retains 4 as the elimination threshold", () => {
    expect(THIRD_FOUL_BAN_COUNT).toBe(3);
    expect(LAST_DAY_ALIVE_MAX).toBe(4);
  });

  it("mutes the day phase immediately after the one where the foul landed", () => {
    // 3rd foul during day 1 (night 0) → banned round 2.
    expect(foulSpeakingBanRound(0)).toBe(2);
    // 3rd foul during day 2 (night 1) → banned round 3.
    expect(foulSpeakingBanRound(1)).toBe(3);
  });
});

describe("isSpeakingBanned", () => {
  const banned = { foulSpeakingBanRound: 2 };
  const clean = {};

  it("mutes a player whose ban round is the current round (many alive)", () => {
    expect(isSpeakingBanned(banned, 2, 8)).toBe(true);
  });

  it("does not mute on other rounds — the ban lasts a single day phase", () => {
    expect(isSpeakingBanned(banned, 1, 8)).toBe(false);
    expect(isSpeakingBanned(banned, 3, 8)).toBe(false);
  });

  it("never mutes a player with no ban", () => {
    expect(isSpeakingBanned(clean, 2, 8)).toBe(false);
  });

  it("lifts the ban on the final day phase (≤ 4 alive → still speaks)", () => {
    expect(isSpeakingBanned(banned, 2, 4)).toBe(false);
    expect(isSpeakingBanned(banned, 2, 3)).toBe(false);
    expect(isSpeakingBanned(banned, 2, 5)).toBe(true); // 5 alive → still banned
  });
});
