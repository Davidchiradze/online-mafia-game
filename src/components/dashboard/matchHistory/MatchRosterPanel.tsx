"use client";

import { motion, AnimatePresence } from "motion/react";
import { Users, Trophy } from "lucide-react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { gameLogs as historyRefs } from "@convex/refs/history";
import {
  roleToFaction,
  factionIcon,
  factionBadgeClass,
} from "@/lib/game/roleDisplay";
import { useRoleLabel } from "@/lib/game/useRoleLabel";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  gameLogId: Id<"gameLogs">;
  expanded: boolean;
  currentPlayerId: Id<"profiles"> | undefined;
}

export default function MatchRosterPanel({
  gameLogId,
  expanded,
  currentPlayerId,
}: Props) {
  const t = useTranslations("matchHistory");
  const roleLabel = useRoleLabel();
  const detail = useQuery(
    historyRefs.getOne,
    expanded ? { gameLogId } : "skip",
  );

  return (
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
            <div className="mb-5 flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-inter text-xs font-bold uppercase tracking-widest text-zinc-400">
                <Users className="h-4 w-4 text-blue-400" /> {t("operationRoster")}
              </h4>
              {detail?.winMethodLabel && (
                <span className="font-inter text-xs text-zinc-500">
                  {detail.winMethodLabel}
                </span>
              )}
            </div>

            {detail === undefined ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-9 animate-pulse rounded-lg bg-white/[0.03]"
                  />
                ))}
              </div>
            ) : detail === null ? (
              <p className="font-inter text-sm text-zinc-500">
                {t("rosterUnavailable")}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-x-12 gap-y-1 md:grid-cols-2">
                {[...detail.players]
                  .sort(
                    (a, b) =>
                      (a.seatNumber ?? Infinity) - (b.seatNumber ?? Infinity),
                  )
                  .map((player) => {
                  const faction = roleToFaction(player.role);
                  const Icon = factionIcon(faction);
                  const isYou = player.playerId === currentPlayerId;
                  const isWinner =
                    detail.winner !== null && faction === detail.winner;
                  return (
                    <div
                      key={player.playerId}
                      className={cn(
                        "-mx-2 grid grid-cols-[1fr_auto_auto] items-center gap-4 rounded-lg border-b border-white/5 px-2 py-2.5 last:border-0",
                        isYou
                          ? "bg-white/[0.03]"
                          : "transition-colors hover:bg-white/[0.02]",
                      )}
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] font-inter text-xs font-bold tabular-nums text-zinc-400">
                          {player.seatNumber ?? "—"}
                        </span>
                        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-red-600 shadow">
                          {player.avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={player.avatar}
                              alt={player.nickname}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span
                          className={cn(
                            "truncate font-inter text-sm",
                            isYou
                              ? "font-bold text-white"
                              : "font-medium text-zinc-300",
                          )}
                        >
                          {player.nickname}
                          {isYou && (
                            <span className="ml-1 text-xs font-normal text-zinc-500">
                              {t("you")}
                            </span>
                          )}
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
                            {t("alive")}
                          </span>
                        ) : (
                          <span className="text-xs font-bold uppercase tracking-widest text-[#ff2a2a]">
                            {t("dead")}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
