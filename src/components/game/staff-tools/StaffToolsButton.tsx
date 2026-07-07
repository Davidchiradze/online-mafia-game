"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Shield, X } from "lucide-react";
import { authProfiles } from "@convex/refs/lobby";
import { PERMISSIONS, roleHasPermission } from "@convex/lib/access";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { cn } from "@/lib/utils";
import RevealRolesTool from "./RevealRolesTool";
import BroadcastTool from "./BroadcastTool";

/**
 * Floating staff toolbar (bottom-right), shown to a moderator/admin who is
 * spectating. Players — including staff seated as players — never see it, and
 * the server independently rejects each tool for them.
 *
 * This is just the container: it gates each tool by privilege and renders it.
 * Every tool is a single-responsibility component under this folder.
 */
export default function StaffToolsButton() {
  const t = useTranslations("game.staffTools");
  const { isSpectator, canRevealRoles, hostVisionEnabled } = useGameRoom();
  const currentProfile = useQuery(authProfiles.currentProfile);
  const [open, setOpen] = useState(false);

  // Moderators + admins spectating (unlike reveal-roles, which is admin-only).
  const canBroadcast =
    isSpectator &&
    roleHasPermission(currentProfile?.role, PERMISSIONS.GAME_BROADCAST);

  if (!canRevealRoles && !canBroadcast) return null;

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

          <div className="flex flex-col gap-2">
            {canRevealRoles && <RevealRolesTool />}
            {canBroadcast && <BroadcastTool />}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-label={t("title")}
        className={cn(
          "flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border shadow-xl transition",
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
