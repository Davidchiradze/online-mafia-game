"use client";

import { useQuery } from "convex/react";
import { lobbyGames } from "@convex/refs/lobby";
import LobbyContent from "@/components/lobby/LobbyContent";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

export default function LobbyPage() {
  const games = useQuery(lobbyGames.list);

  if (games === undefined) {
    return (
      <div className="min-h-screen bg-[#0a0a12] flex items-center justify-center">
        <LoadingSpinner message="Loading…" />
      </div>
    );
  }

  return <LobbyContent games={games} />;
}
