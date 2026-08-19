"use client";

import { Crosshair, Gamepad2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import LevelBadge from "@/shared/ui/LevelBadge";
import {
  getLevelForRating,
  getLevelProgress,
  pointsToNextLevel,
} from "@/shared/lib/ranking/levels";
import type { PlayerStats } from "@convex/refs/history";
import type { RatedGameType } from "@/shared/lib/ranking/ratedVariants";
import RatedVariantTabs from "../components/RatedVariantTabs";

interface Props {
  stats: PlayerStats | undefined;
  gameType: RatedGameType;
  onGameTypeChange: (gameType: RatedGameType) => void;
}

/**
 * Page hero: heading, the ONE variant switcher, and the ELO/win-rate/matches
 * cards for the selected ladder.
 *
 * The switcher is the page's primary control and is centred and `lg` to say so.
 * It scopes BOTH this block and the match list below it — the two used to be
 * separate selectors, which put the same question on screen twice and let the
 * stats and the list disagree about which mode you were looking at.
 *
 * The cost of merging is that the list can no longer show every mode at once:
 * "all" names no ladder, so it cannot drive an ELO or a record and there is no
 * honest number to invent for it (/docs/ranking-system.md §12). One always-true
 * scope beats two controls that contradict each other.
 */
export default function StatsHeader({
  stats,
  gameType,
  onGameTypeChange,
}: Props) {
  const t = useTranslations("matchHistory");
  const tg = useTranslations("game");

  return (
    <div className="mb-10 flex flex-col items-center text-center">
      <h1 className="mb-3 font-orbitron text-4xl font-bold uppercase tracking-widest text-white drop-shadow-sm sm:text-5xl">
        {t("pageTitle")}
      </h1>
      <p className="max-w-2xl font-inter text-lg text-zinc-400">
        {t("pageSubtitle")}
      </p>

      {/* Names what the switcher governs. Without it the ELO, W/L and match
          rows all read as lifetime totals across every mode. */}
      <div className="mt-7 flex flex-col items-center gap-2.5">
        <span className="font-inter text-[0.65rem] font-bold uppercase tracking-widest text-zinc-500">
          {tg("variantSelector.chooseVariant")}
        </span>
        <RatedVariantTabs
          value={gameType}
          onChange={onGameTypeChange}
          size="lg"
        />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <RatingCard stats={stats} />
        <StatCard
          icon={<Crosshair className="h-3.5 w-3.5" />}
          label={t("overallWinRate")}
          value={stats === undefined ? "—" : `${stats.winRate}%`}
          accent="bg-[#00ff66]/80 shadow-[0_0_10px_rgba(0,255,102,0.8)]"
        />
        <StatCard
          icon={<Gamepad2 className="h-3.5 w-3.5" />}
          label={t("totalMatches")}
          value={stats === undefined ? "—" : String(stats.totalMatches)}
          accent="bg-blue-500/80 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
        />
      </div>
    </div>
  );
}

/**
 * Current ELO + level badge + progress toward the next level, for whichever
 * ladder produced `stats` — the query is scoped to one variant upstream
 * (/docs/ranking-system.md §12). Players with no rated games in it show the
 * 1000 default — never "unranked".
 */
export function RatingCard({ stats }: { stats: PlayerStats | undefined }) {
  const t = useTranslations("matchHistory");
  const level = stats === undefined ? null : getLevelForRating(stats.rating);
  const toNext = stats === undefined ? null : pointsToNextLevel(stats.rating);

  return (
    <div className="relative min-w-[180px] overflow-hidden rounded-xl border border-white/5 bg-[#13131a]/80 p-5 shadow-xl">
      <div
        className="absolute left-0 top-0 h-[2px] w-full"
        style={
          level
            ? { background: level.hex, boxShadow: `0 0 10px ${level.hex}` }
            : { background: "rgba(255,255,255,0.2)" }
        }
      />
      <div className="mb-2 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-400">
        <TrendingUp className="h-3.5 w-3.5" /> {t("eloRating")}
      </div>
      {stats === undefined || level === null ? (
        <div className="font-orbitron text-3xl font-bold text-white">—</div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            <LevelBadge
              level={level.level}
              size="md"
              title={t("levelTooltip", {
                elo: stats.rating,
                level: level.level,
              })}
            />
            <div className="font-orbitron text-3xl font-bold text-white">
              {stats.rating}
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.round(getLevelProgress(stats.rating) * 100)}%`,
                background: level.hex,
              }}
            />
          </div>
          {toNext !== null && (
            <div className="mt-1.5 font-inter text-xs text-zinc-500">
              {t("toNextLevel", { points: toNext, level: level.level + 1 })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative min-w-[140px] overflow-hidden rounded-xl border border-white/5 bg-[#13131a]/80 p-5 shadow-xl">
      <div className={`absolute left-0 top-0 h-[2px] w-full ${accent}`} />
      <div className="mb-2 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-400">
        {icon} {label}
      </div>
      <div className="font-orbitron text-3xl font-bold text-white">{value}</div>
    </div>
  );
}
