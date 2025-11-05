import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fetchGameSessionById } from "@/lib/gameSession/actions";
import { Suspense } from "react";
import Room from "@/components/game/Room";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-black">
      <header className="sticky top-0 z-40 border-b border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/50 backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-gray-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between gap-4">
            <h1 className="truncate text-lg sm:text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              Game Room: {game?.name ?? ""}
            </h1>
            <div className="flex items-center gap-3">
              <Link
                href="/lobby"
                aria-label="Back to Lobby"
                className="inline-flex items-center gap-2 rounded-md border border-gray-300/70 dark:border-gray-700/70 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100/60 dark:hover:bg-gray-800/60 transition-colors"
              >
                Back to Lobby
              </Link>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-56px)]">
        <div className="flex flex-col gap-6 h-full">
          {!userId || !game ? (
            <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-400">
              <span className="animate-pulse">Loading…</span>
            </div>
          ) : (
            <Suspense>
              <Room
                gameId={id}
                userId={userId}
                hostUserId={(game!.host_id as string) ?? ""}
              />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
