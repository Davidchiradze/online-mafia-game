"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { gameLogs as historyRefs } from "@convex/refs/history";
import { authProfiles } from "@convex/refs/lobby";
import StatsHeader from "./StatsHeader";
import RolePerformanceGrid from "./RolePerformanceGrid";
import MatchFilters, {
  type OutcomeFilter,
  type GameTypeFilter,
} from "./MatchFilters";
import MatchHistoryList from "./MatchHistoryList";

export default function MatchHistoryContent() {
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [gameType, setGameType] = useState<GameTypeFilter>("all");

  const stats = useQuery(historyRefs.myStats);
  const profile = useQuery(authProfiles.currentProfile);
  const currentPlayerId = profile?._id;

  return (
    <div className="flex min-h-full w-full flex-col items-center pb-12 text-white">
      <div className="mt-8 flex w-full max-w-6xl flex-col px-6 sm:mt-12 sm:px-8">
        <StatsHeader stats={stats} />
        <RolePerformanceGrid stats={stats} />
        <MatchFilters
          outcome={outcome}
          gameType={gameType}
          onOutcomeChange={setOutcome}
          onGameTypeChange={setGameType}
        />
        <MatchHistoryList
          outcome={outcome}
          gameType={gameType}
          currentPlayerId={currentPlayerId}
        />
      </div>
    </div>
  );
}
