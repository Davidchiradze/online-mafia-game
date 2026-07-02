"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Presentational row used for every entry in the staff-tools panel: a leading
 * icon, a title + description, and an optional trailing control (e.g. a toggle).
 * `active` applies the "on" accent to both the row and the icon chip. Purely
 * visual — each tool owns its own behaviour.
 */
export default function ToolButton({
  icon,
  title,
  description,
  onClick,
  active = false,
  trailing,
  ariaPressed,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  active?: boolean;
  trailing?: ReactNode;
  ariaPressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
        active
          ? "border-red-500/30 bg-red-500/10"
          : "border-white/10 bg-white/[0.02] hover:border-white/20",
      )}
    >
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
          active
            ? "border-red-500/30 bg-red-500/15 text-red-400"
            : "border-white/10 bg-white/[0.04] text-zinc-400",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-sans text-sm font-medium text-white">
          {title}
        </span>
        <span className="block font-sans text-xs text-zinc-400">
          {description}
        </span>
      </span>
      {trailing}
    </button>
  );
}
