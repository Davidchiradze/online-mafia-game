"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Trophy, Flame, Gamepad2, Target, Crown } from "lucide-react";
import type { LeaderboardRow } from "@convex/refs/leaderboard";
import { leaderboard } from "@convex/refs/leaderboard";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/ui/UserAvatar";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import LevelBadge from "@/components/ranking/LevelBadge";
import { useRoleLabel } from "@/lib/game/useRoleLabel";
import {
  getLevelForRating,
  getLevelProgress,
  pointsToNextLevel,
} from "@/lib/ranking/levels";

/**
 * All-time ELO leaderboard for japanese_mafia (see /docs/ranking-system.md).
 * Rows come pre-sorted from the `by_gameType_rating` index; players with no
 * rated games are deliberately absent from the board.
 *
 * A dense, uniform grid of compact stat cards — level, ELO, peak, progress to
 * next level, win rate, matches, streak, and signature role. Accents are keyed
 * to each player's level color; the top 3 get a brighter frame (and #1 a
 * crown) without breaking the grid alignment.
 */
export default function LeaderboardContent() {
  const t = useTranslations("leaderboard");
  const rows = useQuery(leaderboard.list, {
    gameType: "japanese_mafia",
    limit: 50,
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-8 text-white sm:px-6 sm:pt-10">
      {/* Hero */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>
        <h1 className="mb-2 font-orbitron text-3xl font-bold uppercase tracking-widest text-white drop-shadow-sm sm:text-4xl">
          {t("pageTitle")}
        </h1>
        <p className="max-w-xl font-inter text-sm text-zinc-400 sm:text-base">
          {t("pageSubtitle")}
        </p>
      </div>

      {rows === undefined ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner message={t("loading")} />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#13131a]/80 p-12 text-center font-inter text-zinc-400">
          {t("empty")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p, i) => (
            <PlayerCard key={p.playerId} player={p} rank={i + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerCard({
  player,
  rank,
}: {
  player: LeaderboardRow;
  rank: number;
}) {
  const t = useTranslations("leaderboard");
  const roleLabel = useRoleLabel();
  const level = getLevelForRating(player.rating);
  const progress = Math.round(getLevelProgress(player.rating) * 100);
  const toNext = pointsToNextLevel(player.rating);
  const isTop = rank <= 3;
  const currentStreak = player.currentStreak ?? 0;

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-xl border bg-gradient-to-b from-[#17171f] to-[#101017] p-4 shadow-lg transition-colors hover:border-white/20"
      style={{ borderColor: `${level.hex}${isTop ? "4d" : "1f"}` }}
    >
      {/* Top accent line, keyed to level */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: level.hex, boxShadow: `0 0 10px ${level.hex}` }}
      />

      {/* Header: rank + level badge */}
      <div className="mb-3 flex items-center justify-between">
        <span
          className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-orbitron text-xs font-bold"
          style={{ color: level.hex, background: `${level.hex}14` }}
        >
          {rank === 1 && <Crown className="h-3 w-3" />}#{rank}
        </span>
        <LevelBadge
          level={level.level}
          size="sm"
          title={t("levelTooltip", { elo: player.rating, level: level.level })}
        />
      </div>

      {/* Identity + ELO */}
      <div className="flex items-center gap-2.5">
        <div
          className="shrink-0 rounded-full p-[2px]"
          style={{ boxShadow: `0 0 0 2px ${level.hex}, 0 0 12px ${level.hex}44` }}
        >
          <UserAvatar src={player.avatar} name={player.nickname} size={40} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-inter text-sm font-semibold text-white">
            {player.nickname}
          </div>
          <div className={cn("font-inter text-xs", level.textClass)}>
            {t("level", { level: level.level })}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div
            className="font-orbitron text-xl font-bold leading-none"
            style={{ color: level.hex }}
          >
            {player.rating}
          </div>
          <div className="mt-1 font-inter text-[0.6rem] uppercase tracking-wider text-zinc-500">
            {t("peak", { elo: player.peakRating })}
          </div>
        </div>
      </div>

      {/* Progress to next level */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: level.hex }}
          />
        </div>
        {toNext !== null && (
          <span className="shrink-0 font-inter text-[0.6rem] text-zinc-500">
            {t("toNextLevel", { points: toNext, level: level.level + 1 })}
          </span>
        )}
      </div>

      {/* Stat strip */}
      <div className="mt-3 grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 pt-3">
        <Stat
          icon={<Target className="h-3 w-3" />}
          label={t("statWinRate")}
          value={`${player.winRate}%`}
          sub={t("record", { wins: player.wins, losses: player.losses })}
        />
        <Stat
          icon={<Gamepad2 className="h-3 w-3" />}
          label={t("statMatches")}
          value={String(player.totalMatches ?? 0)}
        />
        <Stat
          icon={<Flame className="h-3 w-3" />}
          label={t("statBestStreak")}
          value={String(player.bestStreak ?? 0)}
          highlight={currentStreak >= 3}
          sub={
            currentStreak >= 3 ? t("onStreak", { count: currentStreak }) : undefined
          }
        />
      </div>

      {/* Signature role */}
      {player.topRole && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-inter text-[0.6rem] uppercase tracking-wider text-zinc-500">
            {t("topRole")}
          </span>
          <span className="truncate font-inter text-xs font-medium text-zinc-300">
            {roleLabel(player.topRole.role)}
            <span className="ml-1.5 text-zinc-500">
              {player.topRole.winRate}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-center px-1 text-center">
      <span
        className={cn(
          "mb-1 flex items-center gap-0.5 font-inter text-[0.55rem] uppercase tracking-wide",
          highlight ? "text-orange-400" : "text-zinc-500",
        )}
      >
        {icon} {label}
      </span>
      <span className="font-orbitron text-sm font-bold text-white">{value}</span>
      {sub && (
        <span className="mt-0.5 font-inter text-[0.55rem] text-zinc-500">
          {sub}
        </span>
      )}
    </div>
  );
}
