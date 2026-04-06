"use client";

import { use } from "react";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { lobbyGames, joinRequests } from "@convex/refs/lobby";
import { gamePlayers, gameSpectators } from "@convex/refs/game";
import { GameRoomProvider } from "@/lib/context/gameRoomContext";
import Room from "@/components/game/Room";
import SpectatorJoinPrompt from "@/components/game/SpectatorJoinPrompt";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import type { Id } from "@convex/_generated/dataModel";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function GamePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const gameId = id as Id<"games">;

  const game = useQuery(lobbyGames.getById, { gameId });
  const joinStatus = useQuery(joinRequests.myStatus, { gameId });
  const playerCheck = useQuery(gamePlayers.isPlayer, { gameId });
  const spectatorCheck = useQuery(gameSpectators.isSpectator, { gameId });

  const checkOrRequest = useMutation(joinRequests.checkOrRequest);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (
      joinStatus?.status === "none" &&
      !hasRequested &&
      game?.gameStatus === "not_started"
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
        <LoadingSpinner message="Loading game..." />
      </div>
    );
  }

  if (game === null) {
    router.replace("/lobby");
    return null;
  }

  const isPlayer = playerCheck.isPlayer;
  const isSpectatorUser = spectatorCheck.isSpectator;

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
