"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { PieChart as PieIcon } from "lucide-react";
import { Cell, Legend, Pie, PieChart, Tooltip } from "recharts";
import { api } from "@convex/_generated/api";
import { FACTION_HEX, type Faction } from "@/lib/constants/factions";
import ChartFrame, { TOOLTIP_STYLE } from "./ChartFrame";

const NO_WINNER_HEX = "#6b7280"; // gray-500

export default function FactionWinDonut() {
  const t = useTranslations("admin");
  const data = useQuery(api.admin.stats.gameAnalytics);

  const factions: Faction[] = ["mafia", "citizens", "yakuza"];
  const slices = data
    ? [
        ...factions.map((f) => ({
          name: t(`archive.faction.${f}`),
          value: data.factionWins[f],
          fill: FACTION_HEX[f],
        })),
        {
          name: t("dashboard.charts.noWinner"),
          value: data.noWinner,
          fill: NO_WINNER_HEX,
        },
      ].filter((s) => s.value > 0)
    : [];

  return (
    <ChartFrame
      title={t("dashboard.charts.factionWins")}
      icon={<PieIcon className="h-4 w-4" />}
      accent="rose"
      isEmpty={data !== undefined && slices.length === 0}
      emptyLabel={t("dashboard.charts.empty")}
    >
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          stroke="none"
        >
          {slices.map((s) => (
            <Cell key={s.name} fill={s.fill} />
          ))}
        </Pie>
        <Tooltip {...TOOLTIP_STYLE} />
        <Legend
          iconType="circle"
          wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
        />
      </PieChart>
    </ChartFrame>
  );
}
