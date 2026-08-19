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
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { getGameDefinition } from "@convex/games/registry";
import { BACKFILL_POLICY, RATING_CONFIG } from "@convex/lib/constants";
import { roleToFaction } from "@convex/lib/roles";
import { GAME_TYPES } from "@/shared/lib/constants/game";
import {
  DEFAULT_RATED_GAME_TYPE,
  RATED_GAME_TYPES,
} from "@/shared/lib/ranking/ratedVariants";

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
    ).toEqual(["japanese_mafia", "serial_killer_mafia", "sports_mafia"]);
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
    // Both mappers are exercised on purpose, and they do NOT agree any more:
    // `SERIAL_KILLER` is `serial_killer` via its definition and `citizens` via
    // the shared map (convex/lib/roles.ts documents why it stays variant-blind).
    // `archiveGameLog` resolves the definition FIRST and only falls back to the
    // shared map for a gameType the registry cannot resolve — impossible for a
    // game that was actually played — so the definition is what rates a seat.
    //
    // This check therefore is not a parity check. It asserts the weaker thing
    // that still matters: whichever mapper answers, the faction it names has a
    // payout. Both arms are kept because the fallback arm is the one nobody
    // would think to price.
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

  it("offers the client exactly the variants the backend rates", () => {
    // The tabs render `RATED_GAME_TYPES`. If it drifted from `RATING_CONFIG` a
    // viewer could select a board the backend never writes to, which looks
    // exactly like "nobody has played yet" — a wrong answer indistinguishable
    // from a right one.
    expect([...RATED_GAME_TYPES].sort()).toEqual(rated.map((v) => v.id).sort());
  });

  it("defaults to a ladder that is not empty", () => {
    // ORDER, not membership. `RATED_GAME_TYPES` follows registration order and
    // `DEFAULT_RATED_GAME_TYPE` is its first entry, so a reordering of the
    // registry silently changes which board every surface opens on. Sports has
    // no backfill (/docs/variants/sports/rating.md §5) — defaulting to it would
    // greet everyone with an empty leaderboard and a 1000 ELO on their profile.
    expect(
      DEFAULT_RATED_GAME_TYPE,
      "the default ladder changed — confirm the new default has an existing archive, or players will land on an empty board",
    ).toBe("japanese_mafia");
    expect(RATED_GAME_TYPES[0]).toBe(DEFAULT_RATED_GAME_TYPE);
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

/** Every .ts/.tsx file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.tsx?$/.test(entry.name) ? [full] : [];
  });
}

describe("ladder surfaces pick a variant, never name one", () => {
  /**
   * The surfaces that render per-variant rating data. Both had a hardcoded
   * `"japanese_mafia"` before the ladders were split, and both would keep
   * working — showing one variant's numbers under another's tab — if one came
   * back. That is the regression this guards.
   */
  const SURFACES = [
    "src/features/headquarters/leaderboard",
    "src/features/headquarters/match-history",
  ];

  /**
   * Files allowed to name a variant, each with the reason. Deliberately empty:
   * a ladder surface resolves its variant from `RATED_GAME_TYPES` or receives
   * it as a prop. An entry here is a claim that some surface genuinely needs to
   * know which game it is showing — worth arguing for in review.
   */
  const ALLOWLIST: Record<string, string> = {};

  const offenders = SURFACES.flatMap((surface) =>
    sourceFiles(p(surface)).flatMap((file) => {
      const rel = relative(REPO_ROOT, file);
      if (rel in ALLOWLIST) return [];
      const text = readFileSync(file, "utf8");
      return GAME_TYPES.filter((id) => text.includes(id)).map(
        (id) => `${rel} → names "${id}"`,
      );
    }),
  );

  it("resolves the variant from RATED_GAME_TYPES, never a literal", () => {
    // Comments count. A docblock naming one variant is how the last hardcode
    // outlived the code that justified it.
    expect(
      offenders,
      "a ladder surface names a game variant — read it from RATED_GAME_TYPES or take it as a prop (/docs/ranking-system.md §13)",
    ).toEqual([]);
  });

  it("keeps no stale allowlist entries", () => {
    // An allowlist that outlives its reason silently re-opens the hole.
    const stale = Object.keys(ALLOWLIST).filter(
      (rel) => !existsSync(p(rel)) || !GAME_TYPES.some((id) => readFileSync(p(rel), "utf8").includes(id)),
    );
    expect(stale, "an allowlisted file no longer names a variant — drop the entry").toEqual([]);
  });
});
