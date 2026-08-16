import { describe, it, expect } from "vitest";

import { RATING_CONFIG, type RatingConfig } from "@convex/lib/constants";
import { computeRatingDelta } from "@convex/lib/ratings";
import type { Faction } from "@convex/lib/roles";

/**
 * CHARACTERIZATION TEST — the ELO formula (/docs/ranking-system.md §3).
 *
 * SILENT FAILURE MODE: until this file existed, NOTHING tested rating. The
 * payout numbers live in three places — `RATING_CONFIG`, §3 of the ranking doc,
 * and each variant's own rating doc — and a change to any one of them was
 * invisible to the other two. `computeRatingDelta` is also the shared unit
 * between the live archive path and the backfill migration, so a silent change
 * here rewrites history and the present at once.
 *
 * Everything below either iterates `RATING_CONFIG` (so a new rated variant is
 * covered the moment it is added) or pins a number that a human decided and
 * wrote down. Nothing derives an expectation from the code under test.
 */

type GameType = keyof typeof RATING_CONFIG;

const RATED = Object.entries(RATING_CONFIG) as [GameType, RatingConfig][];
const factionsOf = (config: RatingConfig) =>
  Object.keys(config.deltas) as Faction[];

describe("computeRatingDelta — base payouts", () => {
  // Pinned from /docs/variants/japanese/rating.md §2. At T === R the table term
  // is 0, so the delta IS the base payout.
  const JAPANESE: Array<[Faction, number, number]> = [
    ["mafia", 48, -30],
    ["citizens", 54, -26],
    ["yakuza", 56, -22],
  ];

  it.each(JAPANESE)("japanese %s pays %d on a win, %d on a loss", (faction, win, loss) => {
    const config = RATING_CONFIG.japanese_mafia!;
    expect(computeRatingDelta(config, faction, "win", 1000, 1000).delta).toBe(win);
    expect(computeRatingDelta(config, faction, "loss", 1000, 1000).delta).toBe(loss);
  });

  // Pinned from /docs/variants/sports/rating.md §3.
  const SPORTS: Array<[Faction, number, number]> = [
    ["mafia", 40, -40],
    ["citizens", 40, -40],
  ];

  it.each(SPORTS)("sports %s pays %d on a win, %d on a loss", (faction, win, loss) => {
    const config = RATING_CONFIG.sports_mafia!;
    expect(computeRatingDelta(config, faction, "win", 1000, 1000).delta).toBe(win);
    expect(computeRatingDelta(config, faction, "loss", 1000, 1000).delta).toBe(loss);
  });

  it("moves nothing on a no-contest, in every rated variant", () => {
    for (const [, config] of RATED) {
      for (const faction of factionsOf(config)) {
        expect(computeRatingDelta(config, faction, "no_contest", 1234, 1000)).toEqual({
          delta: 0,
          after: 1234,
        });
      }
    }
  });

  it("moves nothing for a faction the variant does not price", () => {
    // Unreachable in practice — ratedVariants.test.ts makes coverage a build
    // failure — but the archive path must degrade rather than throw.
    const twoFaction: RatingConfig = {
      start: 1000,
      floor: 100,
      deltas: { mafia: { win: 40, loss: -40 }, citizens: { win: 40, loss: -40 } },
      tableAdjustment: { divisor: 20, cap: 16 },
    };
    expect(computeRatingDelta(twoFaction, "yakuza", "win", 1000, 1000)).toEqual({
      delta: 0,
      after: 1000,
    });
  });
});

describe("computeRatingDelta — table-strength term b", () => {
  const config = RATING_CONFIG.japanese_mafia!;

  // Worked examples from /docs/ranking-system.md §3, Japanese Citizens (+54/−26).
  it("pays more against a stronger table", () => {
    // b = round((1140 − 1000) / 20) = +7
    expect(computeRatingDelta(config, "citizens", "win", 1000, 1140).delta).toBe(61);
    expect(computeRatingDelta(config, "citizens", "loss", 1000, 1140).delta).toBe(-19);
  });

  it("pays less against a weaker table", () => {
    // b = round((1150 − 1400) / 20) = round(−12.5) = −12.
    //
    // NOT −13: JavaScript's Math.round breaks exact halves toward +∞, so a
    // negative .5 rounds up in magnitude-losing fashion. The doc used to say
    // −13 (+41/−39); the shipped behaviour is what is pinned here, and §3 was
    // corrected to match. The asymmetry is worth one point at exact halves and
    // has been deliberately left alone rather than changing shipped payouts.
    expect(computeRatingDelta(config, "citizens", "win", 1400, 1150).delta).toBe(42);
    expect(computeRatingDelta(config, "citizens", "loss", 1400, 1150).delta).toBe(-38);
  });

  it("is zero at an evenly matched table", () => {
    expect(computeRatingDelta(config, "citizens", "win", 1050, 1050).delta).toBe(54);
  });

  // The same three tables from /docs/variants/sports/rating.md §3, where the
  // ±40 base makes the term's contribution readable on its own.
  describe("sports", () => {
    const sports = RATING_CONFIG.sports_mafia!;

    it.each([
      [1000, 1140, 7, 47, -33],
      [1400, 1150, -12, 28, -52],
      [1050, 1050, 0, 40, -40],
    ])("at R=%d T=%d (b=%d) pays +%d / %d", (rating, table, _b, win, loss) => {
      expect(computeRatingDelta(sports, "citizens", "win", rating, table).delta).toBe(win);
      expect(computeRatingDelta(sports, "citizens", "loss", rating, table).delta).toBe(loss);
    });
  });

  it("clamps at ±cap in every rated variant", () => {
    for (const [gameType, config] of RATED) {
      const { cap } = config.tableAdjustment;
      const faction = factionsOf(config)[0];
      const base = config.deltas[faction]!.win;
      // Far beyond the cap in both directions.
      expect(
        computeRatingDelta(config, faction, "win", 1000, 1000 + cap * 100).delta,
        `${gameType} should cap the bonus at +${cap}`,
      ).toBe(base + cap);
      expect(
        computeRatingDelta(config, faction, "win", 5000, 5000 - cap * 100).delta,
        `${gameType} should cap the penalty at −${cap}`,
      ).toBe(base - cap);
    }
  });
});

describe("sports_mafia — the two properties its declared symmetry buys", () => {
  const config = RATING_CONFIG.sports_mafia!;
  const factions = factionsOf(config);

  it("prices every faction identically — no faction spread", () => {
    // Japanese pays its hardest faction more for a win and charges it less for
    // a loss, because its factions win at different rates. Sports declares one
    // shared E, so there is nothing to compensate for and the rows must match
    // (/docs/variants/sports/rating.md §3). A spread appearing here means
    // someone measured Sports without also removing the "declared" stance.
    const rows = factions.map((f) => config.deltas[f]!);
    for (const row of rows) expect(row).toEqual(rows[0]);
  });

  it("neither inflates nor decays the ladder — zero drift", () => {
    // With E = 0.5, an average player's expected move per game is
    // 0.5·win + 0.5·loss, and 80 × (S − 0.5) is exact at both outcomes, so that
    // is 0 — unlike Japanese's deliberate +0.16…+0.32/game rounding drift.
    for (const faction of factions) {
      const win = computeRatingDelta(config, faction, "win", 1500, 1500).delta;
      const loss = computeRatingDelta(config, faction, "loss", 1500, 1500).delta;
      expect(win + loss, `${faction} drifts ${win + loss} per game`).toBe(0);
    }
  });
});

describe("computeRatingDelta — invariants that must hold for every rated variant", () => {
  /** Table averages spanning far past the cap in both directions. */
  const TABLE_OFFSETS = [-800, -320, -161, -40, 0, 40, 161, 320, 800];

  it("never lets a win pay ≤ 0 or a loss turn positive", () => {
    // The §3 safety property, exercised through the formula rather than
    // asserted about the constants (that check lives in ratedVariants.test.ts).
    const broken: string[] = [];
    for (const [gameType, config] of RATED) {
      for (const faction of factionsOf(config)) {
        for (const offset of TABLE_OFFSETS) {
          const rating = 1500; // clear of the floor, so nothing is clipped
          const win = computeRatingDelta(config, faction, "win", rating, rating + offset).delta;
          const loss = computeRatingDelta(config, faction, "loss", rating, rating + offset).delta;
          if (win <= 0) broken.push(`${gameType}/${faction} win ${win} at T−R=${offset}`);
          if (loss >= 0) broken.push(`${gameType}/${faction} loss ${loss} at T−R=${offset}`);
        }
      }
    }
    expect(
      broken,
      "a table adjustment swallowed the base payout — losing could raise a rating, or winning could lower it",
    ).toEqual([]);
  });

  it("records the CLIPPED delta at the floor", () => {
    for (const [gameType, config] of RATED) {
      const faction = factionsOf(config)[0];
      // At the floor, a loss cannot move the rating at all.
      const atFloor = computeRatingDelta(config, faction, "loss", config.floor, config.floor);
      expect(atFloor, `${gameType} at the floor`).toEqual({ delta: 0, after: config.floor });

      // Just above it, only the distance to the floor is charged — and the
      // recorded delta is that clipped amount, not the nominal payout.
      const near = computeRatingDelta(config, faction, "loss", config.floor + 5, config.floor + 5);
      expect(near.after, `${gameType} may not fall below its floor`).toBe(config.floor);
      expect(near.delta, `${gameType} must record the clipped delta`).toBe(-5);
    }
  });

  it("keeps every rated variant's start at or above its floor", () => {
    for (const [gameType, config] of RATED) {
      expect(config.start, `${gameType} starts below its own floor`).toBeGreaterThanOrEqual(
        config.floor,
      );
    }
  });
});
