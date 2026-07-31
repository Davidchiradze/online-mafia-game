"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Drama } from "lucide-react";
import { api } from "@convex/_generated/api";
import { getRoleDisplayConfig } from "@/shared/lib/utils/roleDisplay";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { DashboardCard, CardTitle, EmptyState, formatRole } from "./primitives";

export default function RoleAnalyticsTable() {
  const t = useTranslations("admin");
  const roles = useQuery(api.admin.stats.roleAnalytics);

  return (
    <DashboardCard accent="violet" className="h-full">
      <CardTitle icon={<Drama className="h-4 w-4" />}>
        {t("dashboard.roleStats.title")}
      </CardTitle>
      <div className="mt-4">
        {roles === undefined ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner message={t("loading")} />
          </div>
        ) : roles.length === 0 ? (
          <EmptyState>{t("dashboard.roleStats.empty")}</EmptyState>
        ) : (
          <ul className="space-y-2.5">
            {roles.map((r) => {
              const cfg = getRoleDisplayConfig(r.role);
              return (
                <li key={r.role} className="flex items-center gap-3">
                  <span className="text-base leading-none">{cfg.emoji}</span>
                  <span className={`w-28 shrink-0 truncate text-sm ${cfg.color}`}>
                    {formatRole(r.role)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-300"
                      style={{ width: `${r.winRate}%` }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs text-slate-300">
                    {r.winRate}%
                  </span>
                  <span className="w-12 shrink-0 text-right text-xs text-slate-500">
                    {r.matches}×
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </DashboardCard>
  );
}
