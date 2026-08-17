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
 * Page heading plus the ELO/win-rate/matches cards for ONE ladder.
 *
 * The switcher lives here rather than on the page because these three cards are
 * the only thing it changes. It is independent of the match-list filter below —
 * that filter offers "all" and unrated variants, neither of which has a record
 * to show, so they cannot be the same control (/docs/ranking-system.md §12).
 */
export default function StatsHeader({
  stats,
  gameType,
  onGameTypeChange,
}: Props) {
  const t = useTranslations("matchHistory");

  return (
    <div className="mb-10 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
      <div>
        <h1 className="mb-3 font-orbitron text-4xl font-bold uppercase tracking-widest text-white drop-shadow-sm sm:text-5xl">
          {t("pageTitle")}
        </h1>
        <p className="max-w-2xl font-inter text-lg text-zinc-400">
          {t("pageSubtitle")}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-3">
        {/* Says which ladder the cards below belong to — without it the W/L and
            total-matches numbers read as lifetime totals across every game. */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-inter text-[0.65rem] font-bold uppercase tracking-widest text-zinc-500">
            {t("statsForMode")}
          </span>
          <RatedVariantTabs value={gameType} onChange={onGameTypeChange} />
        </div>

        <div className="flex flex-wrap gap-4">
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
