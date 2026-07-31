"use client";

import LiveKitTestComponent from "@/components/liveKit/LiveKitTestComponent";
import SpectatorView from "./SpectatorView";
import WaitingRoom from "./WaitingRoom";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useTranslations } from "next-intl";

export default function Room() {
  const t = useTranslations("game");
  const {
    gameId,
    userId,
    hostUserId,
    isHost,
    isSpectator,
    room,
    livekitToken,
    joinStatus,
    isJoiningGame,
    joinError,
  } = useGameRoom();

  if (isSpectator) {
    if (!livekitToken) {
      return (
        <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
          <LoadingSpinner message={t("session.connectingAsSpectator")} />
        </div>
      );
    }

    return (
      <SpectatorView
        gameId={gameId}
        room={room}
        hostUserId={hostUserId}
        token={livekitToken}
        userId={userId}
      />
    );
  }

  if (isJoiningGame) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-300">
        <LoadingSpinner message={t("session.joiningGame")} />
      </div>
    );
  }

  if (joinError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        {joinError}
      </div>
    );
  }

  if (joinStatus !== "none" && joinStatus !== "accepted" && !isHost) {
    return <WaitingRoom status={joinStatus} gameId={gameId} userId={userId} />;
  }

  if (joinStatus === "accepted" || isHost) {
    return (
      <LiveKitTestComponent
        gameId={gameId}
        room={room}
        hostUserId={hostUserId}
        token={livekitToken ?? ""}
        isHost={isHost}
        userId={userId}
      />
    );
  }

  return null;
}
