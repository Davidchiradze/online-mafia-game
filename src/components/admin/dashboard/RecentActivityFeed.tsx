"use client";

import { useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";
import { Activity } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Faction } from "@/shared/lib/constants/factions";
import { FACTION_TEXT } from "@/shared/lib/constants/factions";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { DashboardCard, CardTitle, EmptyState } from "./primitives";

/** Known audit action keys → i18n suffix. Unknown actions fall back to raw. */
const ACTION_KEYS = new Set([
  "role.assign",
  "user.ban",
  "user.unban",
  "game.force_end",
  "game.annul",
  "game.refund",
]);

export default function RecentActivityFeed() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const data = useQuery(api.admin.stats.recentActivity, {});

  const when = (ms: number) =>
    new Date(ms).toLocaleString(locale, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const actionLabel = (action: string) =>
    ACTION_KEYS.has(action)
      ? t(`dashboard.recent.actionLabels.${action}`)
      : action;

  return (
    <DashboardCard accent="sky">
      <CardTitle icon={<Activity className="h-4 w-4" />}>
        {t("dashboard.recent.title")}
      </CardTitle>
      {data === undefined ? (
        <div className="flex justify-center py-10">
          <LoadingSpinner message={t("loading")} />
        </div>
      ) : (
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              {t("dashboard.recent.games")}
            </h3>
            {data.recentGames.length === 0 ? (
              <EmptyState>{t("dashboard.recent.emptyGames")}</EmptyState>
            ) : (
              <ul className="space-y-2">
                {data.recentGames.map((g) => (
                  <li
                    key={g._id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-slate-300">
                      {g.gameName}
                    </span>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        g.winner
                          ? FACTION_TEXT[g.winner as Faction]
                          : "text-slate-500"
                      }`}
                    >
                      {g.winner
                        ? t(`archive.faction.${g.winner}`)
                        : t("dashboard.charts.noWinner")}
                    </span>
                    <span className="shrink-0 text-xs text-slate-600">
                      {when(g.finishedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs uppercase tracking-wide text-slate-500">
              {t("dashboard.recent.actions")}
            </h3>
            {data.recentActions.length === 0 ? (
              <EmptyState>{t("dashboard.recent.emptyActions")}</EmptyState>
            ) : (
              <ul className="space-y-2">
                {data.recentActions.map((a) => (
                  <li
                    key={a._id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-slate-300">
                      <span className="font-medium text-white">
                        {a.actorNickname}
                      </span>{" "}
                      <span className="text-slate-500">
                        {actionLabel(a.action)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-600">
                      {when(a.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </DashboardCard>
  );
}
