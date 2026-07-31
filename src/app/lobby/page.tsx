"use client";

import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { lobbyGames } from "@convex/refs/lobby";
import LobbyContent from "@/components/lobby/LobbyContent";
import LoadingSpinner from "@/shared/ui/LoadingSpinner";

export default function LobbyPage() {
  const games = useQuery(lobbyGames.list);
  const tc = useTranslations("common");

  if (games === undefined) {
    return (
      <div className="flex min-h-full items-center justify-center">
        <LoadingSpinner message={tc("loading")} />
      </div>
    );
  }

  return <LobbyContent games={games} />;
}
