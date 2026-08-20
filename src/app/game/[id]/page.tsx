"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { lobbyGames, joinRequests } from "@convex/refs/lobby";
import { gamePlayers, gameSpectators } from "@convex/refs/game";
import { GameRoomProvider } from "@/features/game-room/context/gameRoomContext";
import Room from "@/features/game-room/components/room/Room";
import SpectatorJoinPrompt from "@/features/game-room/components/room/SpectatorJoinPrompt";
import RoomPinPrompt from "@/features/game-room/components/room/RoomPinPrompt";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";
import type { Id } from "@convex/_generated/dataModel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function GamePage({ params }: PageProps) {
  const t = useTranslations("game.session");
  const { id } = use(params);
  const router = useRouter();
  const gameId = id as Id<"games">;

  const game = useQuery(lobbyGames.getById, { gameId });
  const joinStatus = useQuery(joinRequests.myStatus, { gameId });
  const playerCheck = useQuery(gamePlayers.isPlayer, { gameId });
  const spectatorCheck = useQuery(gameSpectators.isSpectator, { gameId });

  const checkOrRequest = useMutation(joinRequests.checkOrRequest);
  const [hasRequested, setHasRequested] = useState(false);

  // Public rooms only: a private room is unlocked with its PIN, and firing this
  // would be pointless anyway — `checkOrRequest` writes no row for one.
  useEffect(() => {
    if (
      joinStatus?.status === "none" &&
      !hasRequested &&
      game?.gameStatus === "not_started" &&
      !game.isPrivate
    ) {
      setHasRequested(true);
      checkOrRequest({ gameId }).catch(() => {});
    }
  }, [joinStatus, hasRequested, checkOrRequest, gameId, game]);

  if (
    game === undefined ||
    joinStatus === undefined ||
    playerCheck === undefined ||
    spectatorCheck === undefined
  ) {
    return (
      <div className="h-screen flex items-center justify-center">
        <LoadingSpinner message={t("loadingGame")} />
      </div>
    );
  }

  if (game === null) {
    router.replace("/lobby");
    return null;
  }

  const isPlayer = playerCheck.isPlayer;
  const isSpectatorUser = spectatorCheck.isSpectator;

  // A private room asks for its PIN instead of queueing a join request. Anyone
  // already inside skips it: `myStatus` answers `accepted` for the host and for
  // every seated player, so a mid-game reload reconnects without a prompt.
  const needsPin =
    game.isPrivate &&
    game.gameStatus === "not_started" &&
    !isPlayer &&
    joinStatus.status === "none";

  if (needsPin) {
    return (
      <div className="h-screen flex items-center justify-center px-4">
        <RoomPinPrompt gameId={gameId} gameName={game.name} />
      </div>
    );
  }

  const shouldShowSpectatorPrompt =
    (game.gameStatus === "playing" || game.gameStatus === "finished") &&
    !isPlayer &&
    !isSpectatorUser;

  if (shouldShowSpectatorPrompt) {
    return (
      <div className="h-screen flex items-center justify-center px-4">
        <SpectatorJoinPrompt
          gameId={id}
          game={game}
          currentSpectatorCount={game.spectators?.length ?? 0}
          isPrivate={game.isPrivate}
        />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <GameRoomProvider gameId={gameId} isSpectator={isSpectatorUser}>
        <Room />
      </GameRoomProvider>
    </div>
  );
}
