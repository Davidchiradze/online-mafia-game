"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";
import GameTable from "@/components/game/GameTable";
import CreateGameModal from "@/components/modals/CreateGameModal";
import { GameSession } from "@/types/game/type";
import { fetchAllGameSessions, requestJoin } from "@/lib/gameSession/actions";
export default function LobbyPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth");
        return;
      }
      setUser(user);
      const res = await fetchAllGameSessions();
      if (res.ok) setSessions(res.data);
      setLoading(false);
    };

    getUser();
  }, [router, supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  const handleCreated = (session: GameSession) => {
    setSessions((prev) => [session, ...prev]);
    router.push(`/game/${session.id}`);
  };

  const handleGameRowClick = async (session: GameSession) => {
    if (!user) return;
    if (session.host_id === user.id) {
      router.push(`/game/${session.id}`);
      return;
    }
    const res = await requestJoin(session.id);

    if (res.ok) router.push(`/game/${session.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Online Mafia
            </h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <User size={20} />
                <span>{user?.user_metadata?.nickname || user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
              >
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to the Lobby
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Create a new game or join an existing one to start playing Mafia
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Create New Game
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start a new Mafia game and invite friends to join
              </p>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Create Game
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Join Game
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Enter a game code to join an existing Mafia game
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter game code"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
                  Join Game
                </button>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Recent Games
            </h3>
            <GameTable
              data={sessions}
              onRowClick={(s) => handleGameRowClick(s)}
            />
          </div>
        </div>
      </main>
      <CreateGameModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
