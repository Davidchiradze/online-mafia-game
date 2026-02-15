"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameRoom } from "@/types/game/type";
import { createLivekitRoom } from "@/lib/liveKit/actions";
import GameTable from "@/components/game/GameTable";
import CreateGameModal from "@/components/modals/CreateGameModal";
import LobbyHeader from "./LobbyHeader";
import { useLobbySubscription } from "@/hooks/lobby/useLobbySubscription";

type LobbyUser = {
  id: string;
  email?: string | null;
  nickname?: string | null;
};

type Props = {
  user: LobbyUser;
  initialSessions: GameRoom[];
};

export default function LobbyContent({ user, initialSessions }: Props) {
  const [sessions, setSessions] = useState<GameRoom[]>(initialSessions);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const router = useRouter();

  // Subscribe to real-time lobby updates (games + players)
  useLobbySubscription(sessions, setSessions);

  const handleCreated = async (session: GameRoom) => {
    setSessions((prev) => [session, ...prev]);
    await createLivekitRoom(session.id);
    router.push(`/game/${session.id}`);
  };

  const handleGameRowClick = (session: GameRoom) => {
    router.push(`/game/${session.id}`);
  };

  return (
    <>
      <LobbyHeader user={user} />

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
          </div>

          <div className="mt-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Recent Games
            </h3>
            <GameTable
              data={sessions}
              onRowClick={(s) => handleGameRowClick(s)}
              userId={user.id}
              onRoomDeleted={(gameId) => {
                setSessions((prev) => prev.filter((s) => s.id !== gameId));
              }}
            />
          </div>
        </div>
      </main>

      <CreateGameModal
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

