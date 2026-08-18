/**
 * "The mafia do not kill on night 1" must come from the FLAG, never a literal.
 *
 * SILENT FAILURE MODE, and this one shipped: the rule was hardcoded in four
 * places. Three moved onto `definition.flags.mafiaKillsOnFirstNight`; the
 * fourth — `MafiaKillControl` — was written `nightNumber !== 1` rather than
 * `=== 1`, so the audit grep that found the other three could not see it.
 *
 * The result was a DEADLOCK, not a cosmetic bug. Serial Killer declares the
 * flag true, so the host's advance gate correctly waited for a night-1 target
 * while the surviving literal hid the only button that could record one. Both
 * halves had to be wrong in the same direction for the game to work, which is
 * exactly the kind of agreement that rots silently.
 *
 * `tsc` cannot catch a boolean that is merely wrong, and there is no
 * component-test tooling in this repo to render the hook. So the guard is
 * structural: every comparison of a night number against 1 must be listed
 * below with a reason.
 *
 * TO ADD an entry: only when the site is genuinely night-1-specific for ALL
 * variants (a first-night mechanic), or is itself the flag-aware branch.
 * A new hardcoded copy of the mafia rule is never a valid entry — read the flag.
 */

import { describe, expect, it } from "vitest";

import { sourceFiles } from "../support/sourceTree";

/**
 * Sites allowed to compare a night number against 1, and why.
 *
 * Keyed by repo path; the value is the justification, present so an entry
 * cannot be added without stating one.
 */
const ALLOWED: Record<string, string> = {
  "src/features/game-room/lib/nightPhase.ts":
    "the flag-aware label rule itself — reads mafiaKillsOnFirstNight",
  "src/features/game-room/hooks/game/useNightPhaseReadiness.ts":
    "the flag-aware host gate, plus the Serial Killer's own never-on-night-1 rule",
  "src/features/game-room/components/participant/MafiaKillControl.tsx":
    "the flag-aware button gate — the copy this test exists because of",
  "convex/games/core/nightPhase.ts":
    "server guard: the SERIAL KILLER may not fire on night 1 (their own rule, not the mafia's)",
  "convex/games/sports/bestMove.ts":
    "Best Move is genuinely a first-night mechanic in every sense",
  "convex/games/core/types.ts": "doc comment on the flag",
};

/** `nightNumber`/`night` compared against the literal 1, either direction. */
const NIGHT_ONE = /\b(?:nightNumber|night)\s*[=!]==?\s*1\b/;

describe("the first-night mafia rule lives on the flag", () => {
  const files = sourceFiles(["src", "convex"]).filter(
    (f) => !f.name.includes(".test."),
  );

  it("finds the sites at all — a broken scan would pass vacuously", () => {
    const hits = files.filter((f) => NIGHT_ONE.test(f.text));
    expect(
      hits.length,
      "no night-1 comparisons found anywhere; the pattern has stopped matching",
    ).toBeGreaterThan(0);
  });

  it("compares a night against 1 only where that is justified", () => {
    const unlisted = files
      .filter((f) => NIGHT_ONE.test(f.text) && !(f.repoPath in ALLOWED))
      .map((f) => {
        const line = f.lines.findIndex((l) => NIGHT_ONE.test(l)) + 1;
        return `${f.repoPath}:${line}`;
      });

    expect(
      unlisted,
      "hardcoded night-1 rule — read `mafiaKillsOnFirstNight` from `useGameFlags()` " +
        "(or `definition.flags`) instead, or add the site to ALLOWED with a reason",
    ).toEqual([]);
  });

  it("has no stale entries", () => {
    const byPath = new Map(files.map((f) => [f.repoPath, f]));
    const stale = Object.keys(ALLOWED)
      .filter((path) => {
        const file = byPath.get(path);
        return !file || !NIGHT_ONE.test(file.text);
      })
      .map((path) => `${path} — no longer compares a night against 1, delete it`);

    expect(stale, "exempted but no longer needed").toEqual([]);
  });

  it("keeps the flag-aware sites actually reading the flag", () => {
    // The exemption is earned by consulting the flag, not by being listed.
    // Without this, moving a site into ALLOWED would be a way to dodge the rule.
    for (const path of [
      "src/features/game-room/lib/nightPhase.ts",
      "src/features/game-room/hooks/game/useNightPhaseReadiness.ts",
      "src/features/game-room/components/participant/MafiaKillControl.tsx",
    ]) {
      const file = files.find((f) => f.repoPath === path);
      expect(file, `${path} is missing`).toBeDefined();
      expect(
        file!.text,
        `${path} compares a night against 1 without reading the flag`,
      ).toContain("mafiaKillsOnFirstNight");
    }
  });
});
