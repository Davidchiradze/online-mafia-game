"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import {
  RATED_GAME_TYPES,
  type RatedGameType,
} from "@/shared/lib/ranking/ratedVariants";

type RatedVariantTabsProps = {
  value: RatedGameType;
  onChange: (gameType: RatedGameType) => void;
  className?: string;
};

/**
 * Ladder picker — one tab per rated variant, in registration order.
 *
 * The tab list is derived from `RATED_GAME_TYPES`, never written out here, so
 * rating a new variant gives it a tab with no edit to this file and an unrated
 * one can never be offered a board that would always be empty
 * (/docs/ranking-system.md §13).
 *
 * Controlled on purpose: each surface owns its own selection. The leaderboard
 * and the profile stats block are separate questions, and answering one should
 * not silently re-answer the other.
 */
export default function RatedVariantTabs({
  value,
  onChange,
  className,
}: RatedVariantTabsProps) {
  const t = useTranslations("game");

  // One ladder is not a choice. Rendering a lone dead tab would imply there is
  // somewhere else to go.
  if (RATED_GAME_TYPES.length < 2) return null;

  return (
    <div
      role="tablist"
      aria-label={t("chooseLadder")}
      className={cn(
        "flex gap-1 rounded-xl bg-black/20 p-1 ring-1 ring-white/10",
        className,
      )}
    >
      {RATED_GAME_TYPES.map((gameType) => (
        <button
          key={gameType}
          type="button"
          role="tab"
          aria-selected={value === gameType}
          onClick={() => onChange(gameType)}
          className={cn(
            "rounded-lg px-3 py-1.5 font-inter text-xs font-medium transition",
            value === gameType
              ? "bg-white/10 text-white shadow-sm"
              : "text-zinc-400 hover:text-white",
          )}
        >
          {t(`gameTypes.${gameType}` as Parameters<typeof t>[0])}
        </button>
      ))}
    </div>
  );
}
