import { describe, it, expect } from "vitest";
import { roleToFaction, type Faction } from "@convex/lib/roles";

/**
 * CHARACTERIZATION TEST — role → faction mapping (regression oracle).
 *
 * Pins the current Japanese mapping. During the refactor this becomes
 * `definition.roleToFaction`; the mapping itself must not change.
 */

describe("roleToFaction — Japanese", () => {
  const cases: Array<[string, Faction]> = [
    // mafia team
    ["DON", "mafia"],
    ["MAFIA", "mafia"],
    ["MAFIA_RIGHT_HAND", "mafia"],
    // yakuza clan
    ["YAKUZA", "yakuza"],
    ["SHOGUN", "yakuza"],
    // town (everything else is a citizen)
    ["CITIZEN", "citizens"],
    ["DETECTIVE", "citizens"],
    ["DOCTOR", "citizens"],
  ];

  it.each(cases)("maps %s → %s", (role, faction) => {
    expect(roleToFaction(role)).toBe(faction);
  });

  it("treats any unknown role as a citizen", () => {
    expect(roleToFaction("SOMETHING_ELSE")).toBe("citizens");
    expect(roleToFaction("")).toBe("citizens");
  });
});
