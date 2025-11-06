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
  if (
    sessionRes.ok &&
    Number(sessionRes.data.max_players) +
      1 -
      Number(sessionRes.data.current_players) ===
      0
  ) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-black">
        <div className="flex h-full items-center justify-center text-gray-600 dark:text-gray-400">
          <span className="animate-pulse">Game is full</span>
        </div>
      </div>
    );
  }
  const game = sessionRes.ok ? sessionRes.data : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-black">
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
