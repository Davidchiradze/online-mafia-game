import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchGameSessionById } from "@/lib/gameSession/actions";
import { Suspense } from "react";
import HostActions from "@/components/game/HostActions";
import WaitingRoom from "@/components/game/WaitingRoom";
import LiveKitTestComponent from "@/components/liveKit/LiveKitTestComponent";
import { Room } from "livekit-client";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GamePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id || null;

  const sessionRes = await fetchGameSessionById(id);
  const game = sessionRes.ok ? sessionRes.data : null;

  const isHost = !!(userId && game && game.host_id === userId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Game Room
            </h1>
            <div className="flex flex-row gap-6">
              {isHost && <HostActions gameId={id} />}
              <Link
                href="/lobby"
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Back to Lobby
              </Link>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Room name
                </div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {game?.name}
                </div>
              </div>
            </div>
          </div>
          {!userId || !game ? (
            <div className="text-center text-gray-600 dark:text-gray-400">
              Loading...
            </div>
          ) : (
            <Suspense>
              <WaitingRoom
                gameId={id}
                userId={userId}
                isHost={isHost}
                hostUserId={(game!.host_id as string) ?? ""}
              />
            </Suspense>
          )}
        </div>
      </main>
    </div>
  );
}
