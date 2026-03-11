"use client";

import { useQuery } from "convex/react";
import { lobbyGames } from "@convex/refs/lobby";
import LobbyContent from "@/components/lobby/LobbyContent";

export default function LobbyPage() {
  const games = useQuery(lobbyGames.list);

  if (games === undefined) {
    return (
      <div
        className="min-h-screen flex items-center justify-center text-white"
        style={{
          background:
            "linear-gradient(180deg, #0a0a12 0%, #0f0f1a 50%, #0a0a12 100%)",
        }}
      >
        <div className="animate-pulse text-gray-400 font-sans text-sm">
          Loading lobby…
        </div>
      </div>
    );
  }

  return <LobbyContent games={games} />;
}
