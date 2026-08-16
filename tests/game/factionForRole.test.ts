import { describe, it, expect, vi } from "vitest";

/**
 * Proves `factionForRole` reads the VARIANT DEFINITION, not the global role
 * sets in `roleDisplay.ts`.
 *
 * Why this needs a mock: japanese_mafia and sports_mafia assign every shared
 * role to the same faction, so against the real registry a helper that ignored
 * the definition entirely would produce identical output — verified by
 * fault-injection, which the registry-driven tests in roleDisplay.test.ts did
 * not catch. Those tests guard the two variants that exist; this one guards the
 * mechanism, and it is the only place that can fail today.
 *
 * The synthetic variant makes CITIZEN a mafia role — impossible in either real
 * deck, which is exactly what makes the assertion discriminating.
 */
vi.mock("@convex/games/registry", () => ({
  REGISTERED_GAME_TYPES: ["mirror_mafia"],
  getGameDefinition: (gameType: string) => {
    if (gameType !== "mirror_mafia") {
      throw new Error(`No game definition for "${gameType}"`);
    }
    return {
      roles: ["DON", "CITIZEN"],
      factions: ["mafia", "citizens"],
      // Inverted on purpose: the global map says CITIZEN → citizens.
      roleToFaction: (role: string) =>
        role === "CITIZEN" ? "mafia" : "citizens",
    };
  },
}));

const { factionForRole, roleToFaction } = await import(
  "@/shared/lib/game/roleDisplay"
);

describe("factionForRole — the definition wins over the global role sets", () => {
  it("returns the variant's answer even when it contradicts the global map", () => {
    expect(roleToFaction("CITIZEN")).toBe("citizens");
    expect(factionForRole("mirror_mafia", "CITIZEN")).toBe("mafia");
  });

  it("returns the variant's answer for a role the global map calls mafia", () => {
    expect(roleToFaction("DON")).toBe("mafia");
    expect(factionForRole("mirror_mafia", "DON")).toBe("citizens");
  });

  it("falls back to the global map when the variant is unregistered", () => {
    // Card decoration must not take a page down over a missing definition.
    expect(factionForRole("no_such_mafia", "DON")).toBe("mafia");
    expect(factionForRole("no_such_mafia", "CITIZEN")).toBe("citizens");
  });
});
