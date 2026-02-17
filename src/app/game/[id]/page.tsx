import { createClient } from "@/lib/supabase/server";
import { fetchGameRoomById } from "@/lib/gameRoom/actions";
import { Suspense } from "react";
import Room from "@/components/game/Room";
import { redirect } from "next/navigation";
import { GameRoomProvider } from "@/lib/context/gameRoomContext";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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
  // if (
  //   Number(sessionRes.data.max_players) +
  //     1 -
  //     sessionRes.data.players.length ===
  //     0
  // ) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-black">
  //       <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-400">
  //         <span className="animate-pulse">Game is full</span>
  //       </div>
  //     </div>
  //   );
  // }
  const game = sessionRes.data;

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
