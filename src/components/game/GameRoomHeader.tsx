"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { joinRequests } from "@convex/refs/lobby";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { LandingLogo } from "@/components/landing/LandingLogo";
import {
  EyeIcon,
  UsersIcon,
  FullscreenEnterIcon,
  FullscreenExitIcon,
} from "@/assets/icons";
import { LogOut, Settings } from "lucide-react";
import { useFullscreen } from "@/hooks/game/useFullscreen";
import ClickableTooltip from "@/components/ui/ClickableTooltip";
import UserAvatar from "@/components/ui/UserAvatar";
import JoinRequestsDrawer from "@/components/host-controls/JoinRequestsDrawer";
import CreateGameModal from "@/components/modals/CreateGameModal";
import type { GAME_TYPES } from "@/lib/constants/game";
import type { Id } from "@convex/_generated/dataModel";
import { useJoinRequestNotification } from "@/hooks/game/useJoinRequestNotification";
import { useRouter } from "next/navigation";

function SpectatorTooltipContent({
  spectators,
  roomName,
}: {
  spectators: { _id: string; nickname: string; avatar?: string }[];
  roomName: string;
}) {
  const t = useTranslations("game");
  return (
    <div>
      <div className="px-4 py-3 border-b border-white/10">
        <h3 className="text-white font-orbitron font-bold text-[0.9rem] mb-0.5">
          {t("row.spectatorsTooltipTitle", { count: spectators.length })}
        </h3>
        <p className="text-gray-500 font-sans text-[0.75rem]">{roomName}</p>
      </div>
      <div className="px-2 py-2 space-y-1 max-h-48 overflow-y-auto">
        {spectators.length === 0 ? (
          <p className="px-2 py-2 text-gray-600 font-sans text-sm">
            {t("row.noSpectatorsYet")}
          </p>
        ) : (
          spectators.map((spectator) => (
            <div
              key={spectator._id}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <UserAvatar
                src={spectator.avatar}
                name={spectator.nickname}
                size={24}
              />
              <span className="font-sans text-[0.85rem] font-medium text-white truncate">
                {spectator.nickname}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function GameRoomHeader() {
  const t = useTranslations("game");
  const {
    gameId,
    isHost,
    isSpectator,
    gameData,
    spectators,
    gameSessionState,
  } = useGameRoom();
  const router = useRouter();
  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const [isJoinDrawerOpen, setIsJoinDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const pendingCount = useQuery(
    joinRequests.countPending,
    isHost ? { gameId: gameId as Id<"games"> } : "skip",
  );

  useJoinRequestNotification(gameId, isHost);

  const roomName = gameData?.name ?? "Game Room";
  const isGameFinished = Boolean(gameSessionState?.isFinished);
  const canFinishGame =
    isHost && !isGameFinished && gameData?.gameStatus === "playing";

  const handleDisconnect = () => {
    router.push("/lobby");
  };
  return (
    <>
      <header className="relative z-20 px-4 sm:px-6 py-3 border-b border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <LandingLogo size="sm" />

          <div className="flex items-center gap-2 sm:gap-3">
            {isSpectator && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/90 text-black font-medium text-xs">
                <EyeIcon width={14} height={14} />
                <span>{t("header.spectating")}</span>
              </div>
            )}

            <ClickableTooltip
              content={
                <SpectatorTooltipContent
                  spectators={spectators}
                  roomName={roomName}
                />
              }
              side="bottom"
              align="end"
            >
              <button
                type="button"
                className="flex items-center gap-1.5 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition group"
                aria-label={t("header.viewSpectators")}
              >
                <EyeIcon width={18} height={18} />
                <span className="text-gray-400 font-sans text-sm font-semibold group-hover:text-white transition-colors">
                  {spectators.length}
                </span>
              </button>
            </ClickableTooltip>

            {isHost && (
              <button
                type="button"
                onClick={() => setIsJoinDrawerOpen(true)}
                className="relative p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition group"
                aria-label={t("header.manageJoinRequests")}
                title={t("header.joinRequests")}
              >
                <UsersIcon width={18} height={18} />
                {!!pendingCount && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {isHost && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition group"
                aria-label={t("header.roomSettings")}
                title={t("header.roomSettings")}
              >
                <Settings className="w-[18px] h-[18px] text-gray-400 group-hover:text-white transition-colors" />
              </button>
            )}

            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition group"
              title={isFullscreen ? t("header.exitFullscreen") : t("header.enterFullscreen")}
              aria-label={isFullscreen ? t("header.exitFullscreen") : t("header.enterFullscreen")}
            >
              {isFullscreen ? (
                <FullscreenExitIcon
                  width={18}
                  height={18}
                  className="text-gray-400 group-hover:text-white transition-colors"
                />
              ) : (
                <FullscreenEnterIcon
                  width={18}
                  height={18}
                  className="text-gray-400 group-hover:text-white transition-colors"
                />
              )}
            </button>

            <button
              type="button"
              onClick={handleDisconnect}
              className="p-2 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 transition group"
              title={isSpectator ? t("header.stopSpectating") : t("header.leaveRoom")}
              aria-label={isSpectator ? t("header.stopSpectating") : t("header.leaveRoom")}
            >
              <LogOut className="w-[18px] h-[18px] text-gray-400 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {isHost && (
        <JoinRequestsDrawer
          gameId={gameId}
          open={isJoinDrawerOpen}
          onClose={() => setIsJoinDrawerOpen(false)}
        />
      )}

      {isHost && gameData && (
        <CreateGameModal
          mode="edit"
          open={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          gameId={gameId}
          initialValues={{
            name: gameData.name,
            gameType: gameData.gameType as (typeof GAME_TYPES)[number],
            isPrivate: gameData.isPrivate,
          }}
          canFinishGame={canFinishGame}
        />
      )}
    </>
  );
}
