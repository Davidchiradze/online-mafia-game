"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Building2, Crosshair, Volleyball, type LucideIcon } from "lucide-react";
import { getGameDefinition } from "@convex/games/registry";
import { GAME_TYPES } from "@/shared/lib/constants/game";
import { isRatedGameType } from "@/shared/lib/ranking/ratedVariants";
import type {
  VariantAccent,
  VariantOption,
} from "@/shared/ui/variants-selector";

export type GameVariant = (typeof GAME_TYPES)[number];

type VariantIdentity = {
  accent: VariantAccent;
  /** Latin uppercase name — the Orbitron line on cards, and the badge text. */
  code: string;
  icon?: LucideIcon;
  /** Wins over `icon`. Only where a glyph says it better than any icon can. */
  glyph?: string;
};

/**
 * Each variant's visual identity, declared once.
 *
 * This is the whole reason the selector kit is domain-free: accent and glyph
 * live here, so the create-game modal, the leaderboard tabs and a match-row
 * badge cannot disagree about what Japanese Mafia looks like. It was three
 * separate maps before — `MODE_TINT` in the lobby, ad-hoc classes in the tabs,
 * and nothing at all on match rows.
 *
 * A `Record` over the full union, not a partial map with a fallback: adding a
 * game type to `GAME_TYPES` should fail `tsc` here rather than silently ship a
 * grey unlabelled control.
 */
const VARIANT_IDENTITY: Record<GameVariant, VariantIdentity> = {
  japanese_mafia: { accent: "purple", code: "JAPANESE", glyph: "死" },
  sports_mafia: { accent: "emerald", code: "SPORTS", icon: Volleyball },
  serial_killer_mafia: { accent: "red", code: "SERIAL", icon: Crosshair },
  city_mafia: { accent: "blue", code: "CITY", icon: Building2 },
};

/**
 * Seat count from the variant's own definition, or `null` when it has none.
 *
 * Mirrors `seatCountFor` in `convex/lobby/games.ts` — `definition.seatCount` is
 * the single source, and a local `Record<string, number>` here would be a
 * second copy whose keys `tsc` never checks against the registry.
 */
function seatCountFor(gameType: string): number | null {
  try {
    return getGameDefinition(gameType).seatCount;
  } catch {
    return null;
  }
}

/**
 * Variants that are actually playable — the ones with a backend definition.
 *
 * `city_mafia` sits in the `GameType` union with no definition on either side,
 * so it is excluded by default rather than by name. That is the same test the
 * server applies when creating a game; `CreateGameModal` filtering it out of a
 * dropdown by string literal was a third place to forget.
 */
const BUILT_GAME_TYPES: readonly GameVariant[] = GAME_TYPES.filter(
  (gameType) => seatCountFor(gameType) !== null,
);

type UseGameVariantOptionsArgs = {
  /**
   * Which variants to offer, in display order. Defaults to every playable one.
   * Pass `RATED_GAME_TYPES` for a ladder surface; passing an unbuilt variant
   * explicitly includes it, disabled — the caller asked for it.
   */
  gameTypes?: readonly GameVariant[];
  /**
   * Render unrated variants dimmed and inert instead of selectable. For ladder
   * surfaces, where an unrated board would always be empty
   * (/docs/ranking-system.md §13).
   */
  disableUnrated?: boolean;
};

/**
 * This repo's game variants as `VariantOption`s for the variant selector kit.
 *
 * Derived, never listed: the seat count comes from the backend definition and
 * the rated flag from `RATING_CONFIG`, so registering or rating a variant
 * updates every selector surface with no edit here beyond its
 * `VARIANT_IDENTITY` entry.
 */
export function useGameVariantOptions({
  gameTypes = BUILT_GAME_TYPES,
  disableUnrated = false,
}: UseGameVariantOptionsArgs = {}): VariantOption<GameVariant>[] {
  const t = useTranslations("game");

  return useMemo(
    () =>
      gameTypes.map((gameType) => {
        const identity = VARIANT_IDENTITY[gameType];
        const seatCount = seatCountFor(gameType);
        const rated = isRatedGameType(gameType);
        const unbuilt = seatCount === null;

        // "12 seats · Rated" — the two facts that actually decide which mode
        // someone picks. Seats are dropped for an unbuilt variant rather than
        // shown as 0, which would read as a rule instead of a gap.
        const meta = [
          seatCount === null ? null : t("variantSelector.seats", { seatCount }),
          t(rated ? "variantSelector.rated" : "variantSelector.unrated"),
        ]
          .filter(Boolean)
          .join(" · ");

        const disabled = unbuilt || (disableUnrated && !rated);

        return {
          value: gameType,
          label: t(`gameTypes.${gameType}` as Parameters<typeof t>[0]),
          code: identity.code,
          accent: identity.accent,
          icon: identity.icon,
          glyph: identity.glyph,
          meta,
          disabled,
          disabledReason: disabled
            ? t(
                unbuilt
                  ? "variantSelector.unbuiltHint"
                  : "variantSelector.unratedHint",
              )
            : undefined,
        };
      }),
    [gameTypes, disableUnrated, t],
  );
}
