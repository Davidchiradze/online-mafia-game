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
import {
  countAliveSeatedPlayers,
  hasShortenedFinalDaySpeech,
  isSeatMutedThisRound,
} from "@/lib/game/speakingBan";

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

describe("isSeatMutedThisRound — phase scope", () => {
  // A 3rd foul during day 1 (night 0) bans round 2, i.e. the day phase that
  // follows night 1. Every phase after that night shares night number 1, so the
  // phase itself is what distinguishes the banned speech from the others.
  const banned = { foulSpeakingBanRound: 2 };
  const NIGHT_AFTER_FOUL = 1;
  const ALIVE = 8;

  it("mutes the banned player's day speech", () => {
    expect(
      isSeatMutedThisRound(banned, NIGHT_AFTER_FOUL, ALIVE, "day_phase"),
    ).toBe(true);
  });

  it("never mutes a farewell speech — a player killed that night still speaks", () => {
    expect(
      isSeatMutedThisRound(banned, NIGHT_AFTER_FOUL, ALIVE, "farewell_speech"),
    ).toBe(false);
  });

  it("leaves every other speaking phase alone", () => {
    for (const phase of [
      "nominated_players_speak",
      "voting",
      "best_move",
      "night_phase",
      undefined,
    ]) {
      expect(
        isSeatMutedThisRound(banned, NIGHT_AFTER_FOUL, ALIVE, phase),
      ).toBe(false);
    }
  });

  it("lifts the ban at 4 seated players alive — the final day phase", () => {
    // Sports table: 10 seats + host at seat 11. 4 players alive at the table is
    // the final day phase, so the banned player speaks (for 30s, below).
    const table = [
      { isAlive: true, seatNumber: 1 },
      { isAlive: true, seatNumber: 2 },
      { isAlive: true, seatNumber: 3 },
      { isAlive: true, seatNumber: 4 },
      { isAlive: false, seatNumber: 5 },
      { isAlive: false, seatNumber: 6 },
      { isAlive: false, seatNumber: 7 },
      { isAlive: false, seatNumber: 8 },
      { isAlive: false, seatNumber: 9 },
      { isAlive: false, seatNumber: 10 },
      { isAlive: true, seatNumber: 11 }, // host — never dies, never counted
      { isAlive: true }, // post-start joiner, no seat — never counted
    ];
    const alive = countAliveSeatedPlayers(table, 10);
    expect(alive).toBe(4);
    expect(isSeatMutedThisRound(banned, NIGHT_AFTER_FOUL, alive, "day_phase")).toBe(
      false,
    );
    expect(
      hasShortenedFinalDaySpeech(banned, NIGHT_AFTER_FOUL, alive, "day_phase"),
    ).toBe(true);
  });

  it("counts the host seat while maxPlayers is unknown (fail closed)", () => {
    const table = [
      { isAlive: true, seatNumber: 1 },
      { isAlive: true, seatNumber: 2 },
      { isAlive: true, seatNumber: 3 },
      { isAlive: true, seatNumber: 4 },
      { isAlive: true, seatNumber: 11 }, // host
    ];
    // Loading frame: the host is indistinguishable, so the count skews high and
    // the ban stays on rather than briefly unlocking the mic.
    expect(countAliveSeatedPlayers(table, null)).toBe(5);
    expect(countAliveSeatedPlayers(table, 10)).toBe(4);
  });

  it("still honours the round + final-day rules inside day_phase", () => {
    // Wrong round (the day before the ban lands) → not muted.
    expect(isSeatMutedThisRound(banned, 0, ALIVE, "day_phase")).toBe(false);
    // Final day phase carve-out (≤ 4 alive) → speaks anyway.
    expect(isSeatMutedThisRound(banned, NIGHT_AFTER_FOUL, 4, "day_phase")).toBe(
      false,
    );
    // No ban stamped (Japanese, or a player under 3 fouls).
    expect(isSeatMutedThisRound({}, NIGHT_AFTER_FOUL, ALIVE, "day_phase")).toBe(
      false,
    );
  });
});

describe("hasShortenedFinalDaySpeech — the 30s carve-out", () => {
  const banned = { foulSpeakingBanRound: 2 };
  const NIGHT_AFTER_FOUL = 1;

  it("shortens only a banned player's final-day speech", () => {
    expect(
      hasShortenedFinalDaySpeech(banned, NIGHT_AFTER_FOUL, 4, "day_phase"),
    ).toBe(true);
    expect(
      hasShortenedFinalDaySpeech(banned, NIGHT_AFTER_FOUL, 3, "day_phase"),
    ).toBe(true);
  });

  it("leaves an unbanned player on the final day at the full 60s", () => {
    expect(hasShortenedFinalDaySpeech({}, NIGHT_AFTER_FOUL, 4, "day_phase")).toBe(
      false,
    );
    // Banned, but for a different round.
    expect(hasShortenedFinalDaySpeech(banned, 0, 4, "day_phase")).toBe(false);
  });

  it("does not shorten while more than 4 are alive (that seat is muted instead)", () => {
    expect(
      hasShortenedFinalDaySpeech(banned, NIGHT_AFTER_FOUL, 5, "day_phase"),
    ).toBe(false);
  });

  it("is a day_phase rule only — never shortens a farewell speech", () => {
    expect(
      hasShortenedFinalDaySpeech(banned, NIGHT_AFTER_FOUL, 4, "farewell_speech"),
    ).toBe(false);
  });
});
