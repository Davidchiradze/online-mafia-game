"use client";

import { useTranslations } from "next-intl";
import { Crosshair, Gamepad2, Trophy, Skull } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PlayerStats } from "@convex/refs/history";

type StatKey = "winRate" | "totalMatches" | "wins" | "losses";

const STAT_CARD_CONFIGS: Array<{
  key: StatKey;
  icon: LucideIcon;
  labelKey: string;
  format: (v: number) => string;
  gradient: string;
  border: string;
  glow: string;
  iconColor: string;
  bg: string;
}> = [
  {
    key: "winRate",
    icon: Crosshair,
    labelKey: "statWinRate",
    format: (v) => `${v}%`,
    gradient: "from-emerald-500/20 to-emerald-600/20",
    border: "border-emerald-400/20",
    glow: "rgba(16,185,129,0.15)",
    iconColor: "text-emerald-400",
    bg: "rgba(16,185,129,0.06)",
  },
  {
    key: "totalMatches",
    icon: Gamepad2,
    labelKey: "statMatchesPlayed",
    format: (v) => String(v),
    gradient: "from-blue-500/20 to-blue-600/20",
    border: "border-blue-400/20",
    glow: "rgba(59,130,246,0.15)",
    iconColor: "text-blue-400",
    bg: "rgba(59,130,246,0.06)",
  },
  {
    key: "wins",
    icon: Trophy,
    labelKey: "statWins",
    format: (v) => String(v),
    gradient: "from-amber-500/20 to-amber-600/20",
    border: "border-amber-400/20",
    glow: "rgba(245,158,11,0.15)",
    iconColor: "text-amber-400",
    bg: "rgba(245,158,11,0.06)",
  },
  {
    key: "losses",
    icon: Skull,
    labelKey: "statLosses",
    format: (v) => String(v),
    gradient: "from-red-500/20 to-red-600/20",
    border: "border-red-400/20",
    glow: "rgba(220,38,38,0.15)",
    iconColor: "text-red-400",
    bg: "rgba(220,38,38,0.06)",
  },
];

export default function LobbyStats({
  stats,
}: {
  stats: PlayerStats | undefined;
}) {
  const t = useTranslations("lobby");
  const loading = stats === undefined;

  return (
    <div className="mb-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STAT_CARD_CONFIGS.map(
          ({
            key,
            icon: Icon,
            labelKey,
            format,
            gradient,
            border,
            glow,
            iconColor,
            bg,
          }) => (
            <div
              key={key}
              className={`flex items-center gap-4 rounded-xl border p-4 ${border}`}
              style={{
                background: `linear-gradient(135deg, ${bg} 0%, transparent 100%)`,
                boxShadow: `0 4px 20px ${glow}`,
              }}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} border ${border}`}
                style={{ boxShadow: `0 0 16px ${glow}` }}
              >
                <Icon className={`h-5 w-5 ${iconColor}`} />
              </div>
              <div>
                <div className="font-orbitron text-2xl font-bold leading-tight text-white">
                  {loading ? "—" : format(stats[key])}
                </div>
                <div className="font-sans text-xs text-gray-500">
                  {t(labelKey)}
                </div>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
