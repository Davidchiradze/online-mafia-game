"use client";

import { useState } from "react";
import { ChevronDown, Clock, Trophy, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  roleToFaction,
  factionIcon,
  factionBadgeClass,
} from "@/lib/game/roleDisplay";
import { useRoleLabel } from "@/lib/game/useRoleLabel";
import {
  formatDate,
  formatTime,
  formatDuration,
} from "@/components/dashboard/matchHistory/format";
import type { AdminGameLogRow } from "@convex/refs/admin";

const WINNER_BAR: Record<string, string> = {
  mafia: "bg-[#ff2a2a] shadow-[0_0_12px_rgba(255,42,42,0.6)]",
  yakuza: "bg-[#a855f7] shadow-[0_0_12px_rgba(168,85,247,0.6)]",
  citizens: "bg-[#00ff66] shadow-[0_0_12px_rgba(0,255,102,0.6)]",
};

export default function ArchiveRow({ row }: { row: AdminGameLogRow }) {
  const t = useTranslations("admin");
  const tg = useTranslations("game");
  const roleLabel = useRoleLabel();
  const [expanded, setExpanded] = useState(false);

  const winner = row.winner;
  const WinnerIcon = winner ? factionIcon(winner) : null;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300",
        expanded
          ? "border-white/10 bg-[#13131a]"
          : "border-white/5 bg-[#13131a]/80 hover:border-white/20 hover:bg-[#1a1a24]",
      )}
    >
      {/* Winner indicator bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 top-0 w-[4px] transition-colors",
          winner ? WINNER_BAR[winner] : "bg-zinc-500",
        )}
      />

      <div
        onClick={() => setExpanded((v) => !v)}
        className="grid cursor-pointer grid-cols-1 items-center gap-x-4 gap-y-4 p-5 pl-7 md:grid-cols-12"
      >
        {/* Date & time */}
        <div className="flex flex-col justify-center md:col-span-3">
          <span className="mb-1 font-inter font-semibold text-zinc-100">
            {formatDate(row.finishedAt)}
          </span>
          <span className="flex items-center gap-1.5 font-inter text-sm text-zinc-500">
            <Clock className="h-3.5 w-3.5" /> {formatTime(row.finishedAt)} •{" "}
            {formatDuration(row.startedAt, row.finishedAt)}
          </span>
        </div>

        {/* Game name, mode, host, player count */}
        <div className="flex flex-col justify-center border-t border-white/5 pt-3 md:col-span-5 md:border-0 md:pt-0">
          <span className="mb-1.5 font-inter font-medium text-zinc-300">
            {row.gameName}{" "}
            <span className="text-sm text-zinc-600">{row.gameCode}</span>
          </span>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 font-inter text-sm text-zinc-500">
            <span>
              {tg(`gameTypes.${row.gameType}` as Parameters<typeof tg>[0])}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {row.players.length}
            </span>
            <span>
              • {t("archive.host")}: {row.hostNickname}
            </span>
          </div>
        </div>

        {/* Winner */}
        <div className="flex items-center gap-3 md:col-span-3">
          <div
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 font-orbitron text-sm font-bold tracking-widest",
              winner
                ? factionBadgeClass(winner)
                : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
            )}
          >
            {WinnerIcon && <WinnerIcon className="h-4 w-4" />}
            {winner ? t(`archive.faction.${winner}`) : t("archive.noWinner")}
          </div>
          {row.winMethodLabel && (
            <span className="font-orbitron text-sm font-bold tracking-wider text-zinc-400">
              {row.winMethodLabel}
            </span>
          )}
        </div>

        {/* Expand chevron */}
        <div className="absolute right-5 top-5 flex justify-end md:relative md:right-auto md:top-auto md:col-span-1">
          <div
            className={cn(
              "rounded-full border p-1.5 transition-all duration-300",
              expanded
                ? "border-white/20 bg-white/10 text-white"
                : "border-transparent text-zinc-500 group-hover:bg-white/10 group-hover:text-zinc-300",
            )}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 transition-transform duration-300",
                expanded && "rotate-180",
              )}
            />
          </div>
        </div>
      </div>

      {/* Roster panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden bg-[#0c0c12]/80 backdrop-blur-md"
          >
            <div className="border-t border-white/5 px-7 py-6">
              <h4 className="mb-5 flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-400">
                <Users className="h-4 w-4 text-blue-400" /> {t("archive.roster")}
              </h4>

              <div className="grid grid-cols-1 gap-x-12 gap-y-1 md:grid-cols-2">
                {row.players.map((player) => {
                  const faction = roleToFaction(player.role);
                  const Icon = factionIcon(faction);
                  const isWinner = winner !== null && faction === winner;
                  return (
                    <div
                      key={player.playerId}
                      className="-mx-2 grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border-b border-white/5 px-2 py-2.5 transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 text-[11px] font-bold text-white shadow">
                          {player.nickname[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span className="truncate font-inter text-sm font-medium text-zinc-300">
                          {typeof player.seatNumber === "number" && (
                            <span className="mr-1 text-xs text-zinc-600">
                              #{player.seatNumber}
                            </span>
                          )}
                          {player.nickname}
                        </span>
                        {isWinner && (
                          <Trophy className="h-3.5 w-3.5 shrink-0 text-yellow-500/50" />
                        )}
                      </div>

                      <div
                        className={cn(
                          "flex items-center gap-1.5 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                          factionBadgeClass(faction),
                        )}
                      >
                        <Icon className="h-3 w-3" />
                        {roleLabel(player.role)}
                      </div>

                      <div className="flex w-16 items-center justify-end">
                        {player.isAlive ? (
                          <span className="text-xs font-bold uppercase tracking-widest text-[#2a5cff]">
                            {t("archive.alive")}
                          </span>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-widest text-[#ff2a2a]">
                            {t("archive.dead")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
