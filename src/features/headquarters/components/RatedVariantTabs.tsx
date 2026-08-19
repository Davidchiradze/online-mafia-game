"use client";

import { useTranslations } from "next-intl";
import VariantSegmented from "@/shared/ui/variants-selector/VariantSegmented";
import type { VariantControlSize } from "@/shared/ui/variants-selector";
import { useGameVariantOptions } from "@/shared/hooks/useGameVariantOptions";
import {
  RATED_GAME_TYPES,
  type RatedGameType,
} from "@/shared/lib/ranking/ratedVariants";

type RatedVariantTabsProps = {
  value: RatedGameType;
  onChange: (gameType: RatedGameType) => void;
  /** `lg` where this is the page's primary control, as on match history. */
  size?: VariantControlSize;
  className?: string;
};

/**
 * Ladder picker — form B of the variant selector kit, wired to this repo's
 * rating policy. Used by the leaderboard hero and the match-history stats
 * header.
 *
 * The policy is why this wrapper exists at all rather than callers reaching for
 * `VariantSegmented` directly: `shared/ui` must not know which variants have a
 * ladder, and both surfaces must answer that question identically.
 *
 * `RATED_GAME_TYPES` is passed explicitly rather than taking the hook's default
 * of every playable variant, and that is load-bearing twice over. It keeps an
 * unrated variant off a ladder it would only show an empty board for
 * (/docs/ranking-system.md §13), and it preserves REGISTRATION order — the
 * hook's default is `GAME_TYPES` order, which would reorder the tabs and no
 * longer agree with `DEFAULT_RATED_GAME_TYPE` about which board opens first.
 *
 * So this is a restyle, not a rule change: same tabs, same order, same default.
 *
 * Controlled on purpose: each surface owns its own selection. The leaderboard
 * and the profile stats block are separate questions, and answering one should
 * not silently re-answer the other.
 */
export default function RatedVariantTabs({
  value,
  onChange,
  size = "md",
  className,
}: RatedVariantTabsProps) {
  const t = useTranslations("game");
  const options = useGameVariantOptions({ gameTypes: RATED_GAME_TYPES });

  // One ladder is not a choice. Rendering a lone live tab beside dimmed ones
  // would imply there is somewhere to go when there is not.
  if (RATED_GAME_TYPES.length < 2) return null;

  return (
    <VariantSegmented
      options={options}
      value={value}
      onChange={onChange}
      size={size}
      label={t("chooseLadder")}
      className={className}
    />
  );
}
