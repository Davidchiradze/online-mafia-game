"use client";

import { useQuery } from "convex/react";
import { useTranslations, useLocale } from "next-intl";
import { TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@convex/_generated/api";
import ChartFrame, { TOOLTIP_STYLE } from "./ChartFrame";

export default function GamesOverTimeArea() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const data = useQuery(api.admin.stats.gameAnalytics);

  const fmt = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });

  const series = data?.gamesPerDay ?? [];
  const isEmpty =
    data !== undefined && series.every((d) => d.count === 0);

  return (
    <ChartFrame
      title={t("dashboard.charts.gamesOverTime")}
      icon={<TrendingUp className="h-4 w-4" />}
      accent="indigo"
      isEmpty={isEmpty}
      emptyLabel={t("dashboard.charts.empty")}
    >
      <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id="gamesOverTime" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" stopOpacity={0.6} />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis
          dataKey="day"
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
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
          labelFormatter={(ms) => fmt(Number(ms))}
          formatter={(value) => [value, t("dashboard.charts.gamesUnit")]}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#a5b4fc"
          strokeWidth={2.5}
          fill="url(#gamesOverTime)"
          dot={false}
          activeDot={{ r: 4, fill: "#a5b4fc", stroke: "#1e1b4b" }}
        />
      </AreaChart>
    </ChartFrame>
  );
}
