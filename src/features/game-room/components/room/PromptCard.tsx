"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/shared/lib/cn";

export type PromptAccent = "red" | "amber" | "zinc";

const ACCENT_CHIP: Record<PromptAccent, string> = {
  red: "border-red-500/20 bg-red-500/10 text-red-400",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  zinc: "border-white/10 bg-white/[0.05] text-zinc-400",
};

/** Shared "back to lobby" button styling for every prompt built on this card. */
export const BACK_BUTTON_CLASS =
  "flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 py-3 font-sans text-sm font-medium text-zinc-400 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

type PromptCardProps = {
  icon: LucideIcon;
  accent: PromptAccent;
  title: string;
  description: string;
  children: React.ReactNode;
};

/**
 * The full-page card every "you can't come in yet" state renders inside — the
 * spectator prompt, the subscription gate, the private-room PIN prompt. Shared
 * so the states stay visually identical whichever one the router lands on.
 */
export default function PromptCard({
  icon: Icon,
  accent,
  title,
  description,
  children,
}: PromptCardProps) {
  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-2xl border border-white/5 bg-[#13131a] p-8 text-center shadow-xl">
        <div
          className={cn(
            "mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border",
            ACCENT_CHIP[accent],
          )}
        >
          <Icon className="h-7 w-7" />
        </div>

        <h2 className="mb-2 font-orbitron text-xl font-bold tracking-tight text-white">
          {title}
        </h2>
        <p className="mb-7 font-sans text-sm leading-relaxed text-zinc-400">
          {description}
        </p>

        {children}
      </div>
    </div>
  );
}
