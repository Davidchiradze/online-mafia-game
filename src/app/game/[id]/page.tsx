import { createClient } from "@/lib/supabase/server";
import { fetchGameRoomById } from "@/lib/gameRoom/actions";
import { Suspense } from "react";
import Room from "@/components/game/Room";
import { redirect } from "next/navigation";
import { GameRoomProvider } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import SpectatorJoinPrompt from "@/components/game/SpectatorJoinPrompt";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/auth");
  }
  const userId = userData.user?.id || null;

  const sessionRes = await fetchGameRoomById(id);
  if (!sessionRes.ok) {
    redirect("/lobby");
  }

  const game = sessionRes.data;

  const isPlayer = game.players.some((p) => p.player_id === userId);
  const isHost = game.host_id === userId;

  // Non-players/hosts see the spectator prompt for in-progress games.
  // A fresh game_spectators row is created each time they click join,
  // and the webhook cleans it up on disconnect. No stale-row race conditions.
  const shouldShowSpectatorPrompt =
    (game.game_status === "playing" || game.game_status === "finished") &&
    !isPlayer &&
    !isHost;

  if (shouldShowSpectatorPrompt) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-black h-[100vh]">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex items-center justify-center">
          <SpectatorJoinPrompt
            gameId={id}
            userId={userId!}
            game={game}
            currentSpectatorCount={game.spectators?.length ?? 0}
          />
        </div>
      </div>
    );
  }

  // Normal flow: User is player or host
  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-black h-[100vh]">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full flex items-center justify-center">
        <div className="flex flex-col gap-6 h-full w-full sm:w-[80%] md:w-[90%] lg:w-[90%]">
          {!userId || !game ? (
            <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-400">
              <LoadingSpinner message="Loading..." />
            </div>
          ) : (
            <Suspense>
              <GameRoomProvider userId={userId} game={game}>
                <Room />
              </GameRoomProvider>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
