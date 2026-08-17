"use client";

import { useTranslations } from "next-intl";

/** Red "You" marker on the signed-in player's entry, wherever it appears. */
export default function YouChip() {
  const t = useTranslations("leaderboard");
  return (
    <span className="shrink-0 rounded border border-red-500/30 bg-red-600/20 px-1.5 py-0.5 font-inter text-[0.55rem] font-bold uppercase tracking-wider text-red-400">
      {t("you")}
    </span>
  );
}
