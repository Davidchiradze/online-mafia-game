"use client";

import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { cn } from "@/lib/utils";
import ToolButton from "./ToolButton";

/**
 * Host-POV role reveal (admin only). Local to this spectator — toggling it never
 * changes what players see; it drives the `revealAll` flag on the game-room
 * roles query. Render only when the viewer has the privilege.
 */
export default function RevealRolesTool() {
  const t = useTranslations("game.staffTools");
  const { hostVisionEnabled, setHostVisionEnabled } = useGameRoom();

  return (
    <ToolButton
      icon={<Eye className="h-4 w-4" />}
      title={t("revealRoles")}
      description={hostVisionEnabled ? t("revealRolesOn") : t("revealRolesOff")}
      onClick={() => setHostVisionEnabled(!hostVisionEnabled)}
      active={hostVisionEnabled}
      ariaPressed={hostVisionEnabled}
      trailing={
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
      }
    />
  );
}
