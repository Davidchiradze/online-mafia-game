import { describe, it, expect } from "vitest";
import { getRoleIcon } from "@/features/game-room/lib/roleIcons";
import { ALL_ROLES } from "@/shared/lib/constants/game";
import {
  getGameDefinition,
  REGISTERED_GAME_TYPES,
} from "@convex/games/registry";

/**
 * Participant tiles below the `tsm` breakpoint replace the role label with the
 * role's icon, so a role with no icon silently loses its badge on small screens
 * — visible only on a phone, in a running game, to the one player holding that
 * card. Nothing else fails: `getRoleIcon` returns `undefined`, the component
 * falls back to its 7px text, and the build is green.
 */
describe("getRoleIcon", () => {
  it.each(ALL_ROLES)("has an icon for %s", (role) => {
    expect(getRoleIcon(role)).toBeTruthy();
  });

  it("covers every role every registered variant can deal", () => {
    const missing: string[] = [];
    for (const gameType of REGISTERED_GAME_TYPES) {
      for (const role of getGameDefinition(gameType).roles) {
        if (!getRoleIcon(role)) missing.push(`${gameType}/${role}`);
      }
    }
    expect(
      missing,
      "these roles would render no badge at all on a small tile",
    ).toEqual([]);
  });

  it("is case-insensitive on the role id", () => {
    expect(getRoleIcon("don")).toBe(getRoleIcon("DON"));
    expect(getRoleIcon("serial_killer")).toBe(getRoleIcon("SERIAL_KILLER"));
  });

  it("returns undefined for an absent or unknown role", () => {
    // The caller renders the text label in this case, so it must not throw.
    expect(getRoleIcon(null)).toBeUndefined();
    expect(getRoleIcon(undefined)).toBeUndefined();
    expect(getRoleIcon("GANG_BOSS")).toBeUndefined();
  });
});
