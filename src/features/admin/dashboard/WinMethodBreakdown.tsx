"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Crosshair } from "lucide-react";
import { api } from "@convex/_generated/api";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import { DashboardCard, CardTitle, EmptyState } from "./primitives";

export default function WinMethodBreakdown() {
  const t = useTranslations("admin");
  const data = useQuery(api.admin.stats.gameAnalytics);

  const methods = data?.winMethods ?? [];
  const max = methods.reduce((m, x) => Math.max(m, x.count), 0) || 1;

  return (
    <DashboardCard accent="rose" className="h-full">
      <CardTitle icon={<Crosshair className="h-4 w-4" />}>
        {t("dashboard.winMethods.title")}
      </CardTitle>
      <div className="mt-4">
        {data === undefined ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner message={t("loading")} />
          </div>
        ) : methods.length === 0 ? (
          <EmptyState>{t("dashboard.winMethods.empty")}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {methods.map((m) => (
              <li key={m.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{m.label}</span>
                  <span className="font-orbitron font-semibold text-white">
                    {m.count}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-300"
                    style={{ width: `${(m.count / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardCard>
  );
}
