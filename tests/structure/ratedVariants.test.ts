/**
 * Rated-variant contract guards.
 *
 * SILENT FAILURE MODE: whether a variant is rated is decided by the *presence*
 * of a `RATING_CONFIG` entry, and everything about that entry is data. A
 * payout row for a faction the variant does not have is dead weight nobody
 * notices; a MISSING row is a seat that silently earns nothing, and neither is
 * a type error — the `Faction` union is global while a faction set is
 * per-variant. `tsc` cannot see any of it, and no user-visible surface reports
 * it either: the game just quietly pays someone zero.
 *
 * So the config is checked against the REGISTRY, the same way the vocabulary
 * firewall derives its banned words in variantDocs.test.ts. Nothing here is
 * hardcoded except the pins that are supposed to need updating when a variant
 * is added — which is the moment a human should be re-reading this file.
 */

import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { getGameDefinition } from "@convex/games/registry";
import { BACKFILL_POLICY, RATING_CONFIG } from "@convex/lib/constants";
import { roleToFaction } from "@convex/lib/roles";
import { GAME_TYPES } from "@/shared/lib/constants/game";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const p = (rel: string) => join(REPO_ROOT, rel);

/** `japanese_mafia` → `japanese`. Mirrors variantDocs.test.ts. */
const docSlug = (id: string) => id.replace(/_mafia$/, "");

/**
 * A variant is RATED when it has a config. Probing the record rather than
 * keeping a second list means this stays correct as variants come and go.
 */
const rated = GAME_TYPES.flatMap((id) => {
  const config = RATING_CONFIG[id];
  return config ? [{ id, config }] : [];
});

describe("rated variants", () => {
  it("pins which variants are rated", () => {
    // Guards the guards: if the probe above resolved nothing, every check
    // below would pass vacuously. This line is SUPPOSED to need editing when a
    // variant becomes rated — that edit is the review prompt.
    expect(
      rated.map((v) => v.id).sort(),
      "the rated-variant set changed — confirm the new variant's calibration was decided, not copied",
    ).toEqual(["japanese_mafia", "sports_mafia"]);
  });

  it("registers every rated variant", () => {
    // Rating reads `game.gameType`, so an unregistered variant cannot produce a
    // rated game — a config for one is dead config (/docs/ranking-system.md §13).
    const unregistered = rated
      .filter(({ id }) => {
        try {
          getGameDefinition(id);
          return false;
        } catch {
          return true;
        }
      })
      .map(({ id }) => `${id} → has a RATING_CONFIG entry but no game definition`);

    expect(unregistered, "these variants are rated but cannot be played").toEqual([]);
  });

  it("prices exactly the factions its definition declares", () => {
    // Extra row = the dead-faction wart. Missing row = a seat that earns
    // nothing, silently (`computeRatingDelta` degrades to a zero delta rather
    // than aborting the archive, so nothing anywhere raises).
    const mismatched = rated.flatMap(({ id, config }) => {
      const declared = [...getGameDefinition(id).factions].sort();
      const priced = Object.keys(config.deltas).sort();
      return declared.join(",") === priced.join(",")
        ? []
        : [`${id} → declares [${declared}] but prices [${priced}]`];
    });

    expect(
      mismatched,
      "a rated variant's payouts do not match its factions — a seat earns nothing, or a dead row is being maintained",
    ).toEqual([]);
  });

  it("prices every faction its own deck can deal", () => {
    // Belt and braces over the check above, from the other end: the deck is
    // what the shuffle actually produces.
    //
    // Both mappers are exercised on purpose. `archiveGameLog` computes the
    // faction with the SHARED `roleToFaction` from convex/lib/roles.ts, not
    // with `definition.roleToFaction` — they agree for every variant today,
    // and this is the assertion that keeps them agreeing.
    const unpriced: string[] = [];
    for (const { id, config } of rated) {
      const def = getGameDefinition(id);
      const priced = new Set(Object.keys(config.deltas));
      for (const role of def.roleDistribution) {
        for (const [source, faction] of [
          ["definition", def.roleToFaction(role)],
          ["shared", roleToFaction(role)],
        ] as const) {
          if (!priced.has(faction)) {
            unpriced.push(`${id} → ${role} is ${faction} (via ${source}), which has no payout`);
          }
        }
      }
    }

    expect(
      [...new Set(unpriced)],
      "a role in the deck maps to a faction with no payout — those players would earn nothing",
    ).toEqual([]);
  });

  it("keeps the table adjustment below the smallest base payout", () => {
    // The §3 safety property: while the cap is smaller than every base number,
    // no table can flip the sign of a result. A future variant with a lower K
    // is exactly how this gets violated.
    const unsafe = rated.flatMap(({ id, config }) => {
      const magnitudes = Object.values(config.deltas).flatMap((d) => [
        Math.abs(d.win),
        Math.abs(d.loss),
      ]);
      const smallest = Math.min(...magnitudes);
      const { cap } = config.tableAdjustment;
      return cap < smallest
        ? []
        : [`${id} → cap ${cap} ≥ smallest base payout ${smallest}`];
    });

    expect(
      unsafe,
      "the table adjustment can swallow a base payout — a win could pay ≤ 0 (/docs/ranking-system.md §3)",
    ).toEqual([]);
  });

  it("documents every rated variant's calibration", () => {
    // /docs/ranking-system.md §13 step 8: this doc owns the mechanism, the
    // variant owns its numbers. A rated variant with no rating doc means the
    // numbers were chosen somewhere nobody can find.
    const undocumented = rated
      .filter(({ id }) => !existsSync(p(`docs/variants/${docSlug(id)}/rating.md`)))
      .map(({ id }) => `${id} → expected docs/variants/${docSlug(id)}/rating.md`);

    expect(undocumented, "a variant is rated but its calibration is undocumented").toEqual([]);
  });
});

describe("backfill policy", () => {
  it("answers for every game type", () => {
    // Total by type, so this can only fail if GAME_TYPES and the union in
    // convex/lib/constants.ts drift apart — which is the drift that would let a
    // variant slip through with no answer at all.
    expect(
      Object.keys(BACKFILL_POLICY).sort(),
      "BACKFILL_POLICY and GAME_TYPES disagree about which variants exist",
    ).toEqual([...GAME_TYPES].sort());
  });

  it("only promises to replay archives it can actually price", () => {
    const impossible = Object.entries(BACKFILL_POLICY)
      .filter(([id, policy]) => policy === "replay" && !RATING_CONFIG[id as (typeof GAME_TYPES)[number]])
      .map(([id]) => `${id} → policy "replay" but no RATING_CONFIG entry to replay it with`);

    expect(impossible, "a backfill policy references a variant that is not rated").toEqual([]);
  });
});
