"use client";

import { useTranslations } from "next-intl";
import { Eye } from "lucide-react";
import { SPECTATOR } from "@convex/lib/constants";
import UserAvatar from "@/shared/ui/UserAvatar";
import ClickableTooltip from "@/shared/ui/ClickableTooltip";
import { LobbyGame } from "@/features/lobby/components/LobbyContent";

function SpectatorList({
  spectators,
  roomName,
}: {
  spectators: LobbyGame["spectators"];
  roomName: string;
}) {
  const t = useTranslations("game");
  return (
    <div>
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="mb-0.5 font-orbitron text-[0.9rem] font-bold text-white">
          {t("row.spectatorsTooltipTitle", { count: spectators.length })}
        </h3>
        <p className="font-sans text-[0.75rem] text-gray-500">{roomName}</p>
      </div>
      <div className="max-h-48 space-y-1 overflow-y-auto px-2 py-2">
        {spectators.map((s) => (
          <div
            key={s._id}
            className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5"
          >
            <UserAvatar src={s.avatar} name={s.nickname} size={24} />
            <span className="truncate font-sans text-[0.85rem] font-medium text-white">
              {s.nickname}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Footer spectator count (eye + `X/max`). When there are spectators, it becomes
 * a hover/click tooltip listing them; with none it's just the count.
 */
export default function SpectatorCount({ room }: { room: LobbyGame }) {
  const count = room.spectators.length;

  const label = (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[0.74rem] font-medium text-gray-400">
      <Eye className="h-3.5 w-3.5" />
      {count}/{SPECTATOR.MAX_SPECTATORS_PER_GAME}
    </span>
  );

  if (count === 0) return label;

  return (
    <ClickableTooltip
      content={
        <SpectatorList spectators={room.spectators} roomName={room.name} />
      }
      side="top"
      align="start"
    >
      <span className="transition-colors hover:text-gray-200">{label}</span>
    </ClickableTooltip>
  );
}
