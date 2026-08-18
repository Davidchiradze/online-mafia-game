import { describe, it, expect, vi } from "vitest";

/**
 * Proves `getUiRuleset` THROWS for a variant that has a backend definition but
 * no UI ruleset.
 *
 * Why this needs a mock: every registered variant currently has a ruleset, so
 * against the real registry the dangerous branch is unreachable and a
 * regression that softened it back to the Japanese fallback would pass every
 * other test in the suite.
 *
 * Why the branch matters: the fallback used to be silent apart from a
 * dev-only `console.warn`, which does not exist in production. A registered
 * variant would then deal its own deck into JAPANESE's ring, phase controls
 * and visibility rules — an 11-card game rendered as a 12-seat Japanese room,
 * looking playable and being wrong. A thrown error hits an error boundary,
 * which is a far better outcome than a corrupt game.
 */
vi.mock("@convex/games/registry", () => ({
  // A variant the backend knows about and the UI registry does not.
  REGISTERED_GAME_TYPES: [
    "japanese_mafia",
    "sports_mafia",
    "serial_killer_mafia",
    "ghost_mafia",
  ],
  getGameDefinition: () => {
    throw new Error("not needed for this test");
  },
}));

const { getUiRuleset } = await import(
  "@/features/game-room/variants/registry"
);

describe("getUiRuleset — strict for registered variants", () => {
  it("throws when a registered variant has no UI ruleset", () => {
    expect(() => getUiRuleset("ghost_mafia")).toThrow(
      /has a backend definition but no UI ruleset/,
    );
  });

  it("still resolves the variants that do have one", () => {
    expect(() => getUiRuleset("japanese_mafia")).not.toThrow();
    expect(() => getUiRuleset("sports_mafia")).not.toThrow();
    expect(() => getUiRuleset("serial_killer_mafia")).not.toThrow();
  });

  it("keeps the soft fallback for a type with no definition at all", () => {
    // `city_mafia` is reserved in the union and unbuilt on both sides. Callers
    // like profile cards render legacy rows and must not crash.
    expect(() => getUiRuleset("city_mafia")).not.toThrow();
    expect(() => getUiRuleset(null)).not.toThrow();
  });
});
