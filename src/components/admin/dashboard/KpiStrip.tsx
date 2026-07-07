"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import {
  Users,
  Swords,
  Gamepad2,
  Trophy,
  Ban,
  UserPlus,
  UserCheck,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { cn } from "@/lib/utils";
import { DashboardCard } from "./primitives";
import { ACCENT, type Accent } from "./theme";

function Stat({
  icon: Icon,
  accent,
  value,
  label,
  sub,
  live,
}: {
  icon?: LucideIcon;
  accent: Accent;
  value: string | number;
  label: string;
  sub?: string;
  live?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
          ACCENT[accent].chip,
        )}
      >
        {live ? (
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-80" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
          </span>
        ) : (
          Icon && <Icon className="h-4 w-4" strokeWidth={2.2} />
        )}
      </span>
      <div className="min-w-0">
        <div className="font-orbitron text-xl font-semibold leading-none text-white">
          {value}
        </div>
        <div className="mt-1 text-[11px] uppercase leading-tight tracking-wide text-slate-400">
          {label}
        </div>
        {sub && (
          <div className={cn("text-[11px]", ACCENT[accent].text)}>{sub}</div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact headline stat bar: a single slim glass strip of metrics (including
 * the live online count) instead of a wall of large cards. Wraps to a grid on
 * smaller screens, collapses to one row on desktop.
 */
export default function KpiStrip() {
  const t = useTranslations("admin");
  const kpi = useQuery(api.admin.stats.overviewKpis);
  const online = useQuery(api.presence.onlineNow);

  const dash = "—";
  const v = (n?: number) =>
    kpi === undefined ? dash : (n ?? 0).toLocaleString();

  return (
    <DashboardCard className="p-0">
      <div className="grid grid-cols-2 divide-x divide-y divide-white/5 sm:grid-cols-3 lg:grid-cols-8 lg:divide-y-0">
        <Stat
          live
          accent="emerald"
          value={online === undefined ? "…" : online.count}
          label={t("dashboard.online.title")}
        />
        <Stat
          icon={Users}
          accent="indigo"
          value={v(kpi?.totalUsers)}
          label={t("dashboard.kpi.users")}
        />
        <Stat
          icon={Gamepad2}
          accent="emerald"
          value={v(kpi?.activeGames)}
          label={t("dashboard.kpi.activeGames")}
          sub={
            kpi === undefined
              ? undefined
              : t("dashboard.kpi.waiting", { count: kpi.waitingGames })
          }
        />
        <Stat
          icon={Trophy}
          accent="sky"
          value={v(kpi?.finishedGames)}
          label={t("dashboard.kpi.finishedGames")}
        />
        <Stat
          icon={UserCheck}
          accent="indigo"
          value={v(kpi?.playersPlayed)}
          label={t("dashboard.kpi.playersPlayed")}
        />
        <Stat
          icon={UserPlus}
          accent="amber"
          value={v(kpi?.newThisWeek)}
          label={t("dashboard.kpi.newThisWeekLabel")}
        />
        <Stat
          icon={Crown}
          accent="violet"
          value={v(kpi?.subscribers)}
          label={t("dashboard.kpi.subscribers")}
        />
        <Stat
          icon={Ban}
          accent="rose"
          value={v(kpi?.banned)}
          label={t("dashboard.kpi.banned")}
        />
      </div>
    </DashboardCard>
  );
}
