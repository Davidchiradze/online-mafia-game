"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@convex/_generated/api";
import { CHART_SERIES_HEX } from "@/lib/constants/factions";
import ChartFrame, { TOOLTIP_STYLE } from "./ChartFrame";

export default function GamesByTypeBar() {
  const t = useTranslations("admin");
  const data = useQuery(api.admin.stats.gameAnalytics);

  const series = (data?.byType ?? []).map((d) => ({
    name: t(`gameType.${d.gameType}`),
    count: d.count,
  }));

  return (
    <ChartFrame
      title={t("dashboard.charts.gamesByType")}
      icon={<BarChart3 className="h-4 w-4" />}
      accent="violet"
      isEmpty={data !== undefined && series.length === 0}
      emptyLabel={t("dashboard.charts.empty")}
    >
      <BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={64}>
          {series.map((_, i) => (
            <Cell
              key={i}
              fill={CHART_SERIES_HEX[i % CHART_SERIES_HEX.length]}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}
