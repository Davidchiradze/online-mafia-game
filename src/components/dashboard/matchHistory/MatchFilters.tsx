"use client";

import { useTranslations } from "next-intl";
import { GAME_TYPES } from "@/shared/lib/constants/game";

export type OutcomeFilter = "all" | "win" | "loss" | "no_contest";
export type GameTypeFilter = "all" | (typeof GAME_TYPES)[number];

interface Props {
  outcome: OutcomeFilter;
  gameType: GameTypeFilter;
  onOutcomeChange: (v: OutcomeFilter) => void;
  onGameTypeChange: (v: GameTypeFilter) => void;
}

const SELECT_CLASS =
  "min-w-[180px] cursor-pointer appearance-none rounded-xl border border-white/5 bg-[#13131a]/70 px-5 py-3.5 font-inter font-medium text-white transition focus:border-[#00ff66]/50 focus:bg-[#13131a]/90 focus:outline-none";

export default function MatchFilters({
  outcome,
  gameType,
  onOutcomeChange,
  onGameTypeChange,
}: Props) {
  const t = useTranslations("matchHistory");
  const tg = useTranslations("game");

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-end">
      <select
        value={gameType}
        onChange={(e) => onGameTypeChange(e.target.value as GameTypeFilter)}
        className={SELECT_CLASS}
      >
        <option value="all" className="bg-[#0a0a12]">
          {t("filterAllModes")}
        </option>
        {GAME_TYPES.map((gt) => (
          <option key={gt} value={gt} className="bg-[#0a0a12]">
            {tg(`gameTypes.${gt}` as Parameters<typeof tg>[0])}
          </option>
        ))}
      </select>

      <select
        value={outcome}
        onChange={(e) => onOutcomeChange(e.target.value as OutcomeFilter)}
        className={SELECT_CLASS}
      >
        <option value="all" className="bg-[#0a0a12]">
          {t("filterAllOutcomes")}
        </option>
        <option value="win" className="bg-[#0a0a12]">
          {t("filterVictories")}
        </option>
        <option value="loss" className="bg-[#0a0a12]">
          {t("filterDefeats")}
        </option>
        <option value="no_contest" className="bg-[#0a0a12]">
          {t("filterNoContest")}
        </option>
      </select>
    </div>
  );
}
