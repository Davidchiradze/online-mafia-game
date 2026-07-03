"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ACCENT, type Accent } from "./theme";

/**
 * Elevated-dark surface primitives. They encode the redesigned glass-card idiom
 * once so every widget matches: a translucent gradient panel with a blurred
 * backdrop, hairline border, soft drop shadow, and an optional accent (top
 * gradient line + corner glow) that gives the card its identity.
 */

export function DashboardCard({
  children,
  className = "",
  accent,
}: {
  children: ReactNode;
  className?: string;
  accent?: Accent;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-br from-white/[0.07] to-white/[0.02]",
        "p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl",
        "transition duration-300 hover:border-white/20",
        className,
      )}
    >
      {accent && (
        <>
          <span
            className={cn(
              "pointer-events-none absolute inset-x-6 -top-px h-px bg-gradient-to-r",
              ACCENT[accent].line,
            )}
          />
          <span
            className={cn(
              "pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl",
              ACCENT[accent].glow,
            )}
          />
        </>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}

export function CardTitle({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white">
      {icon && <span className="text-slate-400">{icon}</span>}
      {children}
    </h2>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-500">{children}</p>;
}

/** Format an in-game role constant (e.g. "MAFIA_RIGHT_HAND") for display. */
export function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
