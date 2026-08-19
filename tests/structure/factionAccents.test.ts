/**
 * Faction hue parity between the type system and the stylesheet.
 *
 * SILENT FAILURE MODE: the winner on the end screen is coloured by a class name
 * ASSEMBLED at runtime — `host-panel__title-accent--${accent.tone}` in
 * HostPanelTitle.tsx. `tone` is a `Faction`, so `tsc` proves the tone is real
 * and proves nothing at all about the rule existing. A faction with no rule
 * renders the accent in the title's own colour: the banner still says who won,
 * in the same white as the "Winner" prefix that precedes it, which reads as a
 * flat sentence rather than a result. That is exactly how `serial_killer`
 * shipped — three factions had rules and the fourth inherited.
 *
 * Nothing here is hardcoded: the factions come from `FACTION_TEXT`, which is
 * total over the union, so a fifth faction fails this the day it is declared
 * rather than the day someone wins with it.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { FACTION_TEXT, type Faction } from "@/shared/lib/constants/factions";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;
const CSS_PATH = "src/features/game-room/styles/host-panel.css";
const css = readFileSync(join(REPO_ROOT, CSS_PATH), "utf8");

const ACCENT = "host-panel__title-accent";

/**
 * The tone modifiers the stylesheet actually defines, mapped to the utilities
 * they apply. A regex rather than a CSS parser: the file is hand-written in one
 * shape (`.selector { @apply utils; }`), and a dependency for four rules would
 * cost more than it proves.
 */
const declared = new Map<string, string>(
  [
    ...css.matchAll(
      new RegExp(`\\.${ACCENT}--([a-z_]+)\\s*\\{([^}]*)\\}`, "g"),
    ),
  ].map(([, tone, body]) => [
    tone,
    (/@apply\s+([^;]+);/.exec(body)?.[1] ?? "").trim(),
  ]),
);

const factions = Object.keys(FACTION_TEXT) as Faction[];

describe("faction title accents", () => {
  it("finds the tone modifiers at all", () => {
    // Guards the guard: if the regex stopped matching — the file reformatted,
    // the block renamed — every check below would pass vacuously on an empty
    // map, and the hole this file exists to close would be wide open again.
    expect(
      declared.size,
      `no .${ACCENT}--* rules parsed out of ${CSS_PATH} — the regex above has gone stale, not the stylesheet`,
    ).toBeGreaterThan(0);
  });

  it("gives every faction its own hue", () => {
    const missing = factions
      .filter((faction) => !declared.has(faction))
      .map((faction) => `${faction} → no .${ACCENT}--${faction} rule`);

    expect(
      missing,
      "these factions would render the winner in the prefix's colour, so the banner reads as prose instead of a result",
    ).toEqual([]);
  });

  it("uses the same hue the charts and badges use", () => {
    // The stylesheet's own comment promises this ("Hues match `FACTION_TEXT`"),
    // and it is the half a human cannot check by reading either file alone: a
    // faction that is amber on an admin donut and violet on the end screen looks
    // deliberate in both places.
    const mismatched = factions
      .filter((faction) => declared.has(faction))
      .filter((faction) => declared.get(faction) !== FACTION_TEXT[faction])
      .map(
        (faction) =>
          `${faction} → css applies "${declared.get(faction) ?? ""}", FACTION_TEXT says "${FACTION_TEXT[faction]}"`,
      );

    expect(
      mismatched,
      "a faction is a different colour on the end screen than on its badges and charts",
    ).toEqual([]);
  });

  it("keeps no rule for a faction that no longer exists", () => {
    // A dead modifier is unreachable — `tone` is typed — so it survives every
    // rename and slowly makes the block untrustworthy to read.
    const orphaned = [...declared.keys()]
      .filter((tone) => !factions.includes(tone as Faction))
      .map((tone) => `.${ACCENT}--${tone} → "${tone}" is not a Faction`);

    expect(orphaned, "these accent rules can never match a rendered tone").toEqual([]);
  });
});
