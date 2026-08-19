"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { gameLogs as historyRefs } from "@convex/refs/history";
import { useViewer } from "@/features/auth/hooks/useViewer";
import StatsHeader from "./StatsHeader";
import RolePerformanceGrid from "./RolePerformanceGrid";
import MatchFilters, { type OutcomeFilter } from "./MatchFilters";
import MatchHistoryList from "./MatchHistoryList";
import {
  DEFAULT_RATED_GAME_TYPE,
  type RatedGameType,
} from "@/shared/lib/ranking/ratedVariants";

export default function MatchHistoryContent() {
  const [outcome, setOutcome] = useState<OutcomeFilter>("all");

  // ONE variant selection for the whole page: the hero switcher in StatsHeader
  // scopes the ELO/record cards, the role grid AND the match list below.
  //
  // There used to be a second mode filter over the list that also offered
  // "all". That put the same question on screen twice and let the two answers
  // disagree — the cards could read Japanese while the rows read Sports. The
  // cost of merging is that "all modes" is gone from the list, because "all"
  // names no ladder and so cannot drive an ELO or a record
  // (/docs/ranking-system.md §12). Outcome stays its own filter: it narrows
  // within the selected mode rather than contradicting it.
  const [variant, setVariant] = useState<RatedGameType>(
    DEFAULT_RATED_GAME_TYPE,
  );
  const stats = useQuery(historyRefs.myStats, { gameType: variant });
  const { profile } = useViewer();
  const currentPlayerId = profile?._id;

  return (
    <div className="flex min-h-full w-full flex-col items-center pb-12 text-white">
      <div className="mt-8 flex w-full max-w-6xl flex-col px-6 sm:mt-12 sm:px-8">
        <StatsHeader
          stats={stats}
          gameType={variant}
          onGameTypeChange={setVariant}
        />
        <RolePerformanceGrid stats={stats} gameType={variant} />
        <MatchFilters outcome={outcome} onOutcomeChange={setOutcome} />
        <MatchHistoryList
          outcome={outcome}
          gameType={variant}
          currentPlayerId={currentPlayerId}
        />
      </div>
    </div>
  );
}
