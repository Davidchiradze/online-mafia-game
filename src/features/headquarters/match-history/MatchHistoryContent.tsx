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
import {
  DEFAULT_RATED_GAME_TYPE,
  type RatedGameType,
} from "@/shared/lib/ranking/ratedVariants";

export default function MatchHistoryContent() {
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");
  const [gameType, setGameType] = useState<GameTypeFilter>("all");

  // THREE independent selections, and the third is deliberately not the second.
  //
  // `gameType` above filters the match LIST and offers "all" plus unrated
  // variants — neither of which names a ladder, so neither can drive the stats.
  // `statsVariant` picks the ladder whose ELO and record are shown. Binding
  // them would mean either dropping "all" from the list or inventing a record
  // for it, and there is no honest number to invent (/docs/ranking-system.md §12).
  const [statsVariant, setStatsVariant] = useState<RatedGameType>(
    DEFAULT_RATED_GAME_TYPE,
  );
  const stats = useQuery(historyRefs.myStats, { gameType: statsVariant });
  const { profile } = useViewer();
  const currentPlayerId = profile?._id;

  return (
    <div className="flex min-h-full w-full flex-col items-center pb-12 text-white">
      <div className="mt-8 flex w-full max-w-6xl flex-col px-6 sm:mt-12 sm:px-8">
        <StatsHeader
          stats={stats}
          gameType={statsVariant}
          onGameTypeChange={setStatsVariant}
        />
        <RolePerformanceGrid stats={stats} gameType={statsVariant} />
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
