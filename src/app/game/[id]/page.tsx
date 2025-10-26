"use client";
import Link from "next/link";
import { useEffect, useState, use as usePromise } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  fetchGameSessionById,
  onMyJoinRequestStatus,
} from "@/lib/gameSession/actions";
import { JoinRequest } from "@/types/game/type";
import JoinRequestsDrawer from "@/components/host-controls/JoinRequestsDrawer";

type Props = {
  params: Promise<{ id: string }>;
};

export default function GamePage({ params }: Props) {
  const { id } = usePromise(params);
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const [myStatus, setMyStatus] = useState<JoinRequest["status"] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    let unsubMy: (() => void) | null = null;
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const sessionRes = await fetchGameSessionById(id);
      if (!sessionRes.ok) return;
      const host = sessionRes.data.host_id === user.id;
      setIsHost(host);
      if (!host) {
        unsubMy = onMyJoinRequestStatus(id, user.id, (status) =>
          setMyStatus(status)
        );
      }
      setLoading(false);
    };
    init();
    return () => {
      if (unsubMy) unsubMy();
    };
  }, [id, supabase.auth]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Game Room
            </h1>
            <Link
              href="/lobby"
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Back to Lobby
            </Link>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Game ID
                </div>
                <div className="text-xl font-semibold text-gray-900 dark:text-white">
                  {id}
                </div>
              </div>
            </div>
          </div>
          {loading ? (
            <div className="text-center text-gray-600 dark:text-gray-400">
              Loading...
            </div>
          ) : isHost ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 h-[480px]">
                <button
                  onClick={() => setDrawerOpen(true)}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white"
                >
                  Manage Join Requests
                </button>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 h-[480px]"></div>
              <JoinRequestsDrawer
                gameId={id}
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
              />
            </div>
          ) : myStatus !== "accepted" ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="text-gray-900 dark:text-white text-lg font-semibold mb-2">
                Waiting for host approval
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                You will join automatically once approved.
              </div>
              {myStatus === "rejected" ? (
                <div className="mt-4 text-red-600">
                  Your request was rejected.
                </div>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 h-[480px]"></div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700 h-[480px]"></div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
