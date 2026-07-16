"use client";

import { Crosshair, Gamepad2, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";
import LevelBadge from "@/components/ranking/LevelBadge";
import {
  getLevelForRating,
  getLevelProgress,
  pointsToNextLevel,
} from "@/lib/ranking/levels";
import type { PlayerStats } from "@convex/refs/history";

interface Props {
  stats: PlayerStats | undefined;
}

export default function StatsHeader({ stats }: Props) {
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

      <div className="flex shrink-0 flex-wrap gap-4">
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
 * Current ELO + level badge + progress toward the next level (japanese_mafia
 * ladder, see /docs/ranking-system.md). Players with no rated games show the
 * 1000 default — never "unranked".
 */
export function RatingCard({ stats }: Props) {
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
