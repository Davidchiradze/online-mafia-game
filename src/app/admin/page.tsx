"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAccess } from "@/hooks/auth/useAccess";
import { PERMISSIONS } from "@convex/lib/access";
import KpiStrip from "@/features/admin/dashboard/KpiStrip";
import TopPlayersLeaderboard from "@/features/admin/dashboard/TopPlayersLeaderboard";
import FactionWinDonut from "@/features/admin/dashboard/FactionWinDonut";
import GamesOverTimeArea from "@/features/admin/dashboard/GamesOverTimeArea";
import GamesByTypeBar from "@/features/admin/dashboard/GamesByTypeBar";
import RoleAnalyticsTable from "@/features/admin/dashboard/RoleAnalyticsTable";
import WinMethodBreakdown from "@/features/admin/dashboard/WinMethodBreakdown";
import RecentActivityFeed from "@/features/admin/dashboard/RecentActivityFeed";

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {children}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

export default function AdminDashboardPage() {
  const t = useTranslations("admin");
  const { can, role } = useAccess();

  const canViewUsers = can(PERMISSIONS.USER_VIEW);
  const canViewGames = can(PERMISSIONS.GAME_VIEW_ALL);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-orbitron text-2xl font-bold sm:text-3xl">
          {t("dashboard.heading")}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {t("dashboard.signedInAs", { role: t(`roles.${role}`) })}
        </p>
      </header>

      {/* Compact headline stat bar (includes live online count) */}
      {canViewUsers && <KpiStrip />}

      {/* Top players — list scrolls internally */}
      {canViewGames && <TopPlayersLeaderboard />}

      {/* Game analytics */}
      {canViewGames && (
        <section className="space-y-4">
          <SectionLabel>{t("dashboard.sections.analytics")}</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-3">
            <FactionWinDonut />
            <div className="lg:col-span-2">
              <GamesOverTimeArea />
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <GamesByTypeBar />
            <RoleAnalyticsTable />
            <WinMethodBreakdown />
          </div>
        </section>
      )}

      {/* Recent activity feed */}
      {canViewUsers && (
        <section>
          <SectionLabel>{t("dashboard.sections.activity")}</SectionLabel>
          <RecentActivityFeed />
        </section>
      )}
    </div>
  );
}
