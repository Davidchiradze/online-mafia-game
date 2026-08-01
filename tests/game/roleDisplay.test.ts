import { describe, it, expect } from "vitest";
import { Skull, Swords, Shield } from "lucide-react";
import {
  roleToFaction,
  factionIcon,
  factionBadgeClass,
  roleLabel,
} from "@/shared/lib/game/roleDisplay";
import {
  ROLE_DISPLAY_CONFIG,
  getRoleDisplayConfig,
  getRoleEmoji,
} from "@/shared/lib/utils/roleDisplay";

/**
 * CHARACTERIZATION TEST — role display / labelling (regression oracle).
 *
 * These are pure presentational maps that move into the variant folder
 * (docs/engine/variant-architecture.md §1: "Role labels"). NOTE: `roleToFaction` is duplicated
 * here (src/lib/game/roleDisplay.ts) AND in convex/lib/roles.ts — the refactor
 * collapses them into `definition.roleToFaction`. Pinned in both places so the
 * consolidation is a visible, intentional diff.
 */

describe("roleToFaction (src/lib/game/roleDisplay) — mirrors the convex copy", () => {
  const cases: Array<[string, "mafia" | "yakuza" | "citizens"]> = [
    ["DON", "mafia"],
    ["MAFIA", "mafia"],
    ["MAFIA_RIGHT_HAND", "mafia"],
    ["YAKUZA", "yakuza"],
    ["SHOGUN", "yakuza"],
    ["CITIZEN", "citizens"],
    ["DETECTIVE", "citizens"],
    ["DOCTOR", "citizens"],
    ["UNKNOWN", "citizens"],
  ];
  it.each(cases)("%s → %s", (role, faction) => {
    expect(roleToFaction(role)).toBe(faction);
  });
});

describe("factionIcon", () => {
  it("maps each faction to its Lucide icon", () => {
    expect(factionIcon("mafia")).toBe(Skull);
    expect(factionIcon("yakuza")).toBe(Swords);
    expect(factionIcon("citizens")).toBe(Shield);
  });
});

describe("factionBadgeClass", () => {
  it("returns distinct badge classes per faction", () => {
    expect(factionBadgeClass("mafia")).toContain("zinc");
    expect(factionBadgeClass("yakuza")).toContain("purple");
    expect(factionBadgeClass("citizens")).toContain("rose");
  });
});

describe("roleLabel", () => {
  const known: Array<[string, string]> = [
    ["DON", "Don"],
    ["MAFIA", "Mafia"],
    ["MAFIA_RIGHT_HAND", "Don's Right Hand"],
    ["SHOGUN", "Shogun"],
    ["YAKUZA", "Yakuza"],
    ["DETECTIVE", "Detective"],
    ["CITIZEN", "Citizen"],
    ["DOCTOR", "Doctor"],
  ];
  it.each(known)("labels known role %s → %s", (role, label) => {
    expect(roleLabel(role)).toBe(label);
  });

  it("title-cases an unknown role from its SNAKE_CASE id", () => {
    expect(roleLabel("GANG_BOSS")).toBe("Gang Boss");
    expect(roleLabel("REFEREE")).toBe("Referee");
  });
});

describe("getRoleDisplayConfig / getRoleEmoji", () => {
  it("returns the configured emoji for each known role", () => {
    expect(getRoleEmoji("DON")).toBe("👑");
    expect(getRoleEmoji("MAFIA")).toBe("🔫");
    expect(getRoleEmoji("SHOGUN")).toBe("⚔️");
    expect(getRoleEmoji("YAKUZA")).toBe("🐉");
    expect(getRoleEmoji("DETECTIVE")).toBe("🔍");
    expect(getRoleEmoji("CITIZEN")).toBe("👤");
    expect(getRoleEmoji("DOCTOR")).toBe("💉");
  });

  it("is case-insensitive on the role id", () => {
    expect(getRoleEmoji("don")).toBe("👑");
    expect(getRoleDisplayConfig("doctor")).toBe(ROLE_DISPLAY_CONFIG.DOCTOR);
  });

  it("falls back to a default config for unknown roles", () => {
    const cfg = getRoleDisplayConfig("SOMETHING_ELSE");
    expect(cfg.emoji).toBe("❓");
    expect(getRoleEmoji("SOMETHING_ELSE")).toBe("❓");
  });

  it("has a config entry for every one of the 8 roles", () => {
    expect(Object.keys(ROLE_DISPLAY_CONFIG)).toHaveLength(8);
  });
});
