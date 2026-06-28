"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, Shield, X } from "lucide-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { cn } from "@/lib/utils";

/**
 * Floating staff toolbar (bottom-right), shown ONLY to a moderator/admin who is
 * spectating — gated by `canRevealRoles` from the game room context. Players,
 * including staff seated as players, never see it (and the server independently
 * rejects the reveal for them).
 *
 * Built as an extensible tool list; the only tool today is the host-POV role
 * reveal, which is local to this viewer (it never changes what players see).
 */
export default function StaffToolsButton() {
  const t = useTranslations("game.staffTools");
  const { canRevealRoles, hostVisionEnabled, setHostVisionEnabled } =
    useGameRoom();
  const [open, setOpen] = useState(false);

  if (!canRevealRoles) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-72 rounded-2xl border border-white/10 bg-[#13131a] p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-zinc-400">
              {t("title")}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("close")}
              className="cursor-pointer rounded-lg p-1 text-zinc-500 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tool: host-POV role reveal */}
          <button
            type="button"
            onClick={() => setHostVisionEnabled(!hostVisionEnabled)}
            aria-pressed={hostVisionEnabled}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all",
              hostVisionEnabled
                ? "border-red-500/30 bg-red-500/10"
                : "border-white/10 bg-white/[0.02] hover:border-white/20",
            )}
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                hostVisionEnabled
                  ? "border-red-500/30 bg-red-500/15 text-red-400"
                  : "border-white/10 bg-white/[0.04] text-zinc-400",
              )}
            >
              <Eye className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-sans text-sm font-medium text-white">
                {t("revealRoles")}
              </span>
              <span className="block font-sans text-xs text-zinc-400">
                {hostVisionEnabled ? t("revealRolesOn") : t("revealRolesOff")}
              </span>
            </span>
            {/* Toggle switch */}
            <span
              className={cn(
                "relative h-5 w-9 shrink-0 rounded-full transition-colors",
                hostVisionEnabled ? "bg-red-500" : "bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                  hostVisionEnabled ? "translate-x-4" : "translate-x-0.5",
                )}
              />
            </span>
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={t("title")}
        className={cn(
          "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border shadow-xl transition-all",
          hostVisionEnabled
            ? "border-red-500/40 bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]"
            : "border-white/10 bg-[#13131a] text-zinc-300 hover:border-white/20 hover:text-white",
        )}
      >
        <Shield className="h-5 w-5" />
      </button>
    </div>
  );
}
