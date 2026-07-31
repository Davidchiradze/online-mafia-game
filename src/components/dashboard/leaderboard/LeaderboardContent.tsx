"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Trophy, Flame, Gamepad2, Target, Crown } from "lucide-react";
import type { LeaderboardRow } from "@convex/refs/leaderboard";
import { leaderboard } from "@convex/refs/leaderboard";
import { authProfiles } from "@convex/refs/lobby";
import type { Id } from "@convex/_generated/dataModel";
import { cn } from "@/shared/lib/cn";
import UserAvatar from "@/components/ui/UserAvatar";
import LevelBadge from "@/components/ranking/LevelBadge";
import { useRoleLabel } from "@/shared/lib/game/useRoleLabel";
import {
  getLevelForRating,
  getLevelProgress,
  pointsToNextLevel,
} from "@/shared/lib/ranking/levels";

/**
 * All-time ELO leaderboard for japanese_mafia (see /docs/ranking-system.md).
 * Rows come pre-sorted from the `by_gameType_rating` index; players with no
 * rated games are deliberately absent from the board.
 *
 * Layout: a gold/silver/bronze podium for the top 3 (medal-colored frames,
 * level-colored stats), followed by scannable ranked rows in the match-history
 * style — left accent bar keyed to level color, stats in fixed columns. The
 * signed-in player's entry gets a red "You" highlight wherever it appears.
 */

/** Gold / silver / bronze medal accents for the podium frames. */
const PODIUM_ACCENTS: Record<number, string> = {
  1: "#fbbf24",
  2: "#d4d4d8",
  3: "#d38a5a",
};

export default function LeaderboardContent() {
  const t = useTranslations("leaderboard");
  const rows = useQuery(leaderboard.list, {
    gameType: "japanese_mafia",
    limit: 50,
  });
  const profile = useQuery(authProfiles.currentProfile);
  const myId = profile?._id ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 text-white sm:px-6 sm:pt-10">
      {/* Hero */}
      <div className="mb-10 flex flex-col items-center text-center">
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
        <LeaderboardSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#13131a]/60 p-12 text-center font-inter text-zinc-400">
          {t("empty")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            {rows.slice(0, 3).map((p, i) => (
              <PodiumCard
                key={p.playerId}
                player={p}
                rank={i + 1}
                isMe={p.playerId === myId}
              />
            ))}
          </div>

          {rows.length > 3 && (
            <div className="mt-8 space-y-2">
              {rows.slice(3).map((p, i) => (
                <RankedRow
                  key={p.playerId}
                  player={p}
                  rank={i + 4}
                  isMe={p.playerId === myId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PodiumCard({
  player,
  rank,
  isMe,
}: {
  player: LeaderboardRow;
  rank: number;
  isMe: boolean;
}) {
  const t = useTranslations("leaderboard");
  const roleLabel = useRoleLabel();
  const level = getLevelForRating(player.rating);
  const progress = Math.round(getLevelProgress(player.rating) * 100);
  const toNext = pointsToNextLevel(player.rating);
  const accent = PODIUM_ACCENTS[rank];
  const isFirst = rank === 1;
  const currentStreak = player.currentStreak ?? 0;

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border bg-gradient-to-b from-[#17171f] to-[#101017] px-4 pb-4 shadow-xl transition-colors",
        isFirst ? "pt-7 sm:pb-6" : "pt-5",
        // On desktop the champion sits in the center: 2nd — 1st — 3rd.
        rank === 1 && "sm:order-2",
        rank === 2 && "sm:order-1",
        rank === 3 && "sm:order-3",
        isMe && "ring-1 ring-red-500/40",
      )}
      style={{ borderColor: `${accent}40` }}
    >
      {/* Medal-colored top line + glow behind the avatar */}
      <div
        className="absolute inset-x-0 top-0 h-[2px]"
        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
      <div
        className="pointer-events-none absolute -top-14 left-1/2 h-36 w-36 -translate-x-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: level.hex }}
      />

      {/* Rank chip + level badge */}
      <div className="mb-2 flex items-start justify-between">
        <span
          className="flex items-center gap-1 rounded-md border px-2 py-0.5 font-orbitron text-sm font-bold"
          style={{
            color: accent,
            background: `${accent}14`,
            borderColor: `${accent}33`,
          }}
        >
          #{rank}
          {isMe && <YouChip />}
        </span>
        <LevelBadge
          level={level.level}
          size={isFirst ? "md" : "sm"}
          title={t("levelTooltip", { elo: player.rating, level: level.level })}
        />
      </div>

      {/* Identity */}
      <div className="flex flex-col items-center text-center">
        {isFirst && (
          <Crown className="mb-1 h-6 w-6 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
        )}
        <div
          className="rounded-full border-2 p-[2px]"
          style={{
            borderColor: level.hex,
            boxShadow: `0 0 16px ${level.hex}55`,
          }}
        >
          <UserAvatar
            src={player.avatar}
            name={player.nickname}
            size={isFirst ? 72 : 56}
          />
        </div>
        <div
          className={cn(
            "mt-2 w-full truncate font-inter font-semibold text-white",
            isFirst ? "text-lg" : "text-base",
          )}
        >
          {player.nickname}
        </div>
        <div className={cn("font-inter text-xs", level.textClass)}>
          {t("level", { level: level.level })}
        </div>

        {/* ELO */}
        <div
          className={cn(
            "mt-2 font-orbitron font-bold leading-none",
            isFirst ? "text-3xl" : "text-2xl",
          )}
          style={{ color: level.hex, textShadow: `0 0 18px ${level.hex}55` }}
        >
          {player.rating}
        </div>
        <div className="mt-1 font-inter text-[0.6rem] uppercase tracking-wider text-zinc-500">
          {t("peak", { elo: player.peakRating })}
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
            currentStreak >= 3
              ? t("onStreak", { count: currentStreak })
              : undefined
          }
        />
      </div>

      {/* Signature role */}
      {player.topRole && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
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

function RankedRow({
  player,
  rank,
  isMe,
}: {
  player: LeaderboardRow;
  rank: number;
  isMe: boolean;
}) {
  const t = useTranslations("leaderboard");
  const roleLabel = useRoleLabel();
  const level = getLevelForRating(player.rating);
  const progress = Math.round(getLevelProgress(player.rating) * 100);
  const toNext = pointsToNextLevel(player.rating);
  const currentStreak = player.currentStreak ?? 0;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border shadow-lg transition-colors duration-300",
        isMe
          ? "border-red-500/40 bg-red-950/15"
          : "border-white/5 bg-[#13131a]/80 hover:border-white/20 hover:bg-[#1a1a24]",
      )}
    >
      {/* Level-colored accent bar */}
      <div
        className="absolute bottom-0 left-0 top-0 w-[3px]"
        style={{ background: level.hex, boxShadow: `0 0 10px ${level.hex}66` }}
      />

      <div className="flex items-center gap-3 p-3 pl-5 sm:gap-4 sm:p-4 sm:pl-6">
        {/* Rank */}
        <span className="w-9 shrink-0 text-center font-orbitron text-sm font-bold text-zinc-500">
          #{rank}
        </span>

        {/* Identity */}
        <div
          className="shrink-0 rounded-full border-2 p-[2px]"
          style={{
            borderColor: level.hex,
            boxShadow: `0 0 10px ${level.hex}44`,
          }}
        >
          <UserAvatar src={player.avatar} name={player.nickname} size={38} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-inter text-sm font-semibold text-white">
              {player.nickname}
            </span>
            {isMe && <YouChip />}
          </div>
          <div className="flex items-center gap-2">
            <span className={cn("font-inter text-xs", level.textClass)}>
              {t("level", { level: level.level })}
            </span>
            {player.topRole && (
              <span className="hidden truncate font-inter text-xs text-zinc-500 xl:inline">
                · {roleLabel(player.topRole.role)} {player.topRole.winRate}%
              </span>
            )}
          </div>
        </div>

        {/* Progress to next level */}
        <div
          className="hidden w-32 flex-col gap-1 lg:flex"
          title={
            toNext !== null
              ? t("toNextLevel", { points: toNext, level: level.level + 1 })
              : undefined
          }
        >
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: level.hex }}
            />
          </div>
          {toNext !== null && (
            <span className="font-inter text-[0.6rem] text-zinc-500">
              {t("toNextLevel", { points: toNext, level: level.level + 1 })}
            </span>
          )}
        </div>

        {/* Stats (desktop) */}
        <div className="hidden items-center md:flex">
          <RowStat
            label={t("statWinRate")}
            value={`${player.winRate}%`}
            title={t("record", { wins: player.wins, losses: player.losses })}
          />
          <RowStat
            label={t("statMatches")}
            value={String(player.totalMatches ?? 0)}
          />
          <RowStat
            label={t("statBestStreak")}
            value={String(player.bestStreak ?? 0)}
            highlight={currentStreak >= 3}
            title={
              currentStreak >= 3
                ? t("onStreak", { count: currentStreak })
                : undefined
            }
          />
        </div>

        {/* Level + ELO */}
        <LevelBadge
          level={level.level}
          size="sm"
          className="hidden sm:inline-flex"
          title={t("levelTooltip", { elo: player.rating, level: level.level })}
        />
        <div className="w-16 shrink-0 text-right">
          <div
            className="font-orbitron text-lg font-bold leading-none"
            style={{ color: level.hex }}
          >
            {player.rating}
          </div>
          <div className="mt-1 font-inter text-[0.55rem] uppercase tracking-wider text-zinc-500">
            {t("peak", { elo: player.peakRating })}
          </div>
        </div>
      </div>

      {/* Stats (mobile) */}
      <div className="grid grid-cols-3 divide-x divide-white/5 border-t border-white/5 py-2 pl-5 md:hidden">
        <Stat
          icon={<Target className="h-3 w-3" />}
          label={t("statWinRate")}
          value={`${player.winRate}%`}
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
        />
      </div>
    </div>
  );
}

function YouChip() {
  const t = useTranslations("leaderboard");
  return (
    <span className="shrink-0 rounded border border-red-500/30 bg-red-600/20 px-1.5 py-0.5 font-inter text-[0.55rem] font-bold uppercase tracking-wider text-red-400">
      {t("you")}
    </span>
  );
}

function RowStat({
  label,
  value,
  title,
  highlight = false,
}: {
  label: string;
  value: string;
  title?: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex w-20 flex-col items-center text-center" title={title}>
      <span
        className={cn(
          "font-orbitron text-sm font-bold",
          highlight ? "text-orange-400" : "text-white",
        )}
      >
        {value}
      </span>
      <span className="mt-0.5 font-inter text-[0.55rem] uppercase tracking-wide text-zinc-500">
        {label}
      </span>
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

function LeaderboardSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#13131a]/60 sm:order-2 sm:h-80" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#13131a]/60 sm:order-1 sm:h-72" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#13131a]/60 sm:order-3 sm:h-72" />
      </div>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-[70px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/60"
          />
        ))}
      </div>
    </div>
  );
}
