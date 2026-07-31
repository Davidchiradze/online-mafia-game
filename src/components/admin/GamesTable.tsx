"use client";

import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { PERMISSIONS } from "@convex/lib/access";
import { useAccess } from "@/hooks/auth/useAccess";
import { toast } from "@/shared/lib/utils/toast";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

const STATUS_STYLE: Record<string, string> = {
  playing: "bg-emerald-500/15 text-emerald-400",
  not_started: "bg-amber-500/15 text-amber-400",
  finished: "bg-white/10 text-gray-400",
};

export default function GamesTable() {
  const t = useTranslations("admin");
  const { can } = useAccess();
  const games = useQuery(api.admin.games.listGames);
  const forceEndGame = useMutation(api.admin.games.forceEndGame);

  const canForceEnd = can(PERMISSIONS.GAME_FORCE_END);
  const canRefund = can(PERMISSIONS.GAME_REFUND);

  if (games === undefined) {
    return (
      <div className="flex justify-center py-16">
        <LoadingSpinner message={t("loading")} />
      </div>
    );
  }

  if (games.length === 0) {
    return <p className="text-sm text-gray-400">{t("games.empty")}</p>;
  }

  const handleForceEnd = async (gameId: Id<"games">) => {
    if (!window.confirm(t("games.confirmForceEnd"))) return;
    try {
      await forceEndGame({ gameId });
      toast.success(t("games.endedDone"));
    } catch (e) {
      toast.error(errorMessage(e, t("errors.generic")));
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-gray-400">
          <tr>
            <th className="px-4 py-3 font-medium">{t("games.name")}</th>
            <th className="px-4 py-3 font-medium">{t("games.host")}</th>
            <th className="px-4 py-3 font-medium">{t("games.players")}</th>
            <th className="px-4 py-3 font-medium">{t("games.status")}</th>
            <th className="px-4 py-3 font-medium">{t("games.actions")}</th>
          </tr>
        </thead>
        <tbody>
          {games.map((g) => (
            <tr key={g._id} className="border-t border-white/5">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{g.name}</div>
                <div className="text-xs text-gray-500">{g.code}</div>
              </td>
              <td className="px-4 py-3">{g.hostNickname}</td>
              <td className="px-4 py-3">
                {g.playerCount}/{g.maxPlayers}
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    STATUS_STYLE[g.gameStatus] ?? "bg-white/10 text-gray-400"
                  }`}
                >
                  {t(`status.${g.gameStatus}`)}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {canForceEnd && g.gameStatus !== "finished" && (
                    <button
                      onClick={() => handleForceEnd(g._id)}
                      className="rounded-md border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10"
                    >
                      {t("games.forceEnd")}
                    </button>
                  )}
                  {canRefund && (
                    <button
                      disabled
                      title={t("games.refundSoon")}
                      className="cursor-not-allowed rounded-md border border-white/10 px-3 py-1 text-xs text-gray-500"
                    >
                      {t("games.refund")}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === "object" && "data" in e) {
    const data = (e as { data?: unknown }).data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
  }
  return e instanceof Error ? e.message : fallback;
}
