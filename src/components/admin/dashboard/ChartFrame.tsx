"use client";

import type { ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import { DashboardCard, CardTitle, EmptyState } from "./primitives";
import type { Accent } from "./theme";

/**
 * Uniform wrapper for every Recharts visualization: themed glass card + title +
 * fixed-height ResponsiveContainer, with a built-in empty state. Keeping the
 * container/height/title here means each chart component only owns its series.
 */
export default function ChartFrame({
  title,
  icon,
  accent,
  isEmpty,
  emptyLabel,
  height = 220,
  children,
}: {
  title: string;
  icon?: ReactNode;
  accent?: Accent;
  isEmpty?: boolean;
  emptyLabel: string;
  height?: number;
  /** A single Recharts chart element (PieChart, AreaChart, …). */
  children: ReactNode;
}) {
  return (
    <DashboardCard accent={accent} className="h-full">
      <CardTitle icon={icon}>{title}</CardTitle>
      <div className="mt-4">
        {isEmpty ? (
          <EmptyState>{emptyLabel}</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            {/* Recharts requires a single child element here. */}
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </div>
    </DashboardCard>
  );
}

/** Shared dark tooltip style for all charts. */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(15, 23, 42, 0.92)", // slate-900 (near-opaque)
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    fontSize: 12,
    boxShadow: "0 8px 30px -12px rgba(0,0,0,0.8)",
  },
  labelStyle: { color: "#e2e8f0" },
  itemStyle: { color: "#e2e8f0" },
} as const;
