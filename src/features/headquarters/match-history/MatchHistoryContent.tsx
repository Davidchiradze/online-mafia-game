"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { gameLogs as historyRefs } from "@convex/refs/history";
import { useViewer } from "@/features/auth/hooks/useViewer";
import StatsHeader from "./StatsHeader";
import RolePerformanceGrid from "./RolePerformanceGrid";
import MatchFilters, {
  type OutcomeFilter,
  type GameTypeFilter,
} from "./MatchFilters";
import MatchHistoryList from "./MatchHistoryList";
import { DEFAULT_RATED_GAME_TYPE } from "@/shared/lib/ranking/ratedVariants";

export default function MatchHistoryContent() {
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [gameType, setGameType] = useState<GameTypeFilter>("all");

  // The stats block is per variant — a rating cannot be averaged across
  // ladders. It stays on the default one until it gets its own switcher; the
  // filter below drives only the match list, and offers "all" plus unrated
  // variants, neither of which has a record to show.
  const stats = useQuery(historyRefs.myStats, {
    gameType: DEFAULT_RATED_GAME_TYPE,
  });
  const { profile } = useViewer();
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
