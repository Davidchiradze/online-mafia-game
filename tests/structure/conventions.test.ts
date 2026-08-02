/**
 * Folder-structure and naming guards.
 *
 * SILENT FAILURE MODE: nothing else in this repo enforces where a file goes or
 * what it is called. `tsc` resolves any path; `eslint.config.mjs` carries no
 * naming or structure rules; `next build` is PR-only and path-filtered. So the
 * cost of a misplaced file is not a red build — it is that the next person, or
 * the next agent, cannot find it, and adds a second one beside it.
 *
 * Two tiers, and the split matters:
 *
 *   HARD_RULES — conventions the codebase already satisfies 100%. Asserted at
 *   exactly zero. There is no debt to grandfather, so any hit is a regression
 *   introduced right now.
 *
 *   DEBT_RULES — conventions with a pre-existing backlog. Pinned to a
 *   checked-in baseline that fails in BOTH directions: a new violation fails,
 *   and fixing one without updating the baseline also fails. The debt can only
 *   shrink, and the file can never quietly stop being accurate.
 *
 * To pay down debt: fix the file, then `npx vitest run tests/structure -u`.
 * Never add a line to the baseline by hand.
 *
 * Rule definitions live in tests/support/sourceTree.ts.
 */

import { describe, expect, it } from "vitest";

import {
  DEBT_RULES,
  HARD_RULES,
  componentDeclarations,
  conventionDebtText,
  sourceFiles,
} from "../support/sourceTree";

const files = sourceFiles();

describe("naming and structure conventions", () => {
  describe.each(HARD_RULES.map((rule) => [rule.id, rule] as const))("%s", (_id, rule) => {
    it("has no violations", () => {
      expect(rule.check(files), rule.consequence).toEqual([]);
    });
  });

  it("matches the convention-debt baseline", async () => {
    // A diff here is either progress (a violation you fixed) or a regression (a
    // violation you added). Read the diff before running with -u: the two look
    // identical to the tool and completely different to a reviewer.
    await expect(conventionDebtText(files)).toMatchFileSnapshot(
      "./__snapshots__/conventionDebt.txt",
    );
  });

  it("keeps every debt rule reachable", () => {
    // A rule whose detector silently stops matching is worse than no rule: the
    // baseline shrinks, the snapshot updates clean, and the convention quietly
    // stops being enforced. Every rule must still be able to see the codebase.
    const dead = DEBT_RULES.filter((rule) => {
      try {
        rule.check(files);
        return false;
      } catch {
        return true;
      }
    }).map((rule) => rule.id);
    expect(dead, "these rule detectors threw — they are no longer enforcing anything").toEqual([]);
  });
});

describe("component declaration detection", () => {
  // The one-component-per-file rule is only as good as this parser, so pin it.
  it("counts top-level PascalCase declarations", () => {
    expect(componentDeclarations("export default function RoomCard() {}")).toEqual(["RoomCard"]);
    expect(
      componentDeclarations("function Outer() {}\nfunction Inner() {}").sort(),
    ).toEqual(["Inner", "Outer"]);
    expect(componentDeclarations("const Badge = () => null;")).toEqual(["Badge"]);
  });

  it("ignores nested declarations, comments, and non-components", () => {
    // Indented = nested inside something else, so not a second top-level component.
    expect(componentDeclarations("function Outer() {\n  function Helper() {}\n}")).toEqual([
      "Outer",
    ]);
    expect(componentDeclarations("// function Ghost() {}")).toEqual([]);
    expect(componentDeclarations("/* function Ghost() {} */")).toEqual([]);
    expect(componentDeclarations("function helper() {}\nconst value = 1;")).toEqual([]);
  });

  it("does not mistake UPPER_SNAKE constants for components", () => {
    // The false positive that inflated this rule by 35 files on first run.
    expect(componentDeclarations("const PODIUM_ACCENTS = {};")).toEqual([]);
    expect(componentDeclarations("export const GAME_PHASES = [];")).toEqual([]);
    expect(componentDeclarations("const A = 1;")).toEqual([]);
    expect(componentDeclarations("const RoleCard = () => null;")).toEqual(["RoleCard"]);
  });
});
