"use client";

import { useCallback, useState } from "react";
import { usePaginatedQuery, useConvexAuth } from "convex/react";
import { Swords, SearchX } from "lucide-react";
import { gameLogs as historyRefs } from "@convex/refs/history";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import MatchRow from "./MatchRow";
import type { OutcomeFilter, GameTypeFilter } from "./MatchFilters";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  outcome: OutcomeFilter;
  gameType: GameTypeFilter;
  currentPlayerId: Id<"profiles"> | undefined;
}

const PAGE_SIZE = 10;

export default function MatchHistoryList({
  outcome,
  gameType,
  currentPlayerId,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Skip until authenticated — the query throws "Not authenticated" if it runs
  // during the auth-bootstrap window on a fresh load.
  const { isAuthenticated } = useConvexAuth();

  const { results, status, loadMore } = usePaginatedQuery(
    historyRefs.listMine,
    isAuthenticated
      ? { outcome, gameType: gameType === "all" ? undefined : gameType }
      : "skip",
    { initialNumItems: PAGE_SIZE },
  );

  const onReachEnd = useCallback(() => {
    if (status === "CanLoadMore") loadMore(PAGE_SIZE);
  }, [status, loadMore]);

  const sentinelRef = useInfiniteScroll(onReachEnd, status === "CanLoadMore");

  if (status === "LoadingFirstPage") {
    return (
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[92px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/60"
          />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    const filtersActive = outcome !== "all" || gameType !== "all";
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#13131a]/40 px-6 py-16 text-center backdrop-blur-md">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500">
          {filtersActive ? (
            <SearchX className="h-7 w-7" />
          ) : (
            <Swords className="h-7 w-7" />
          )}
        </div>
        <h3 className="mb-2 font-orbitron text-lg font-bold uppercase tracking-widest text-zinc-200">
          {filtersActive ? "No matches found" : "No matches yet"}
        </h3>
        <p className="max-w-sm font-inter text-sm text-zinc-500">
          {filtersActive
            ? "No games match the selected filters. Try adjusting them to see more of your history."
            : "Once you finish a game, it'll show up here with your role, result, and full roster."}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop list header */}
      <div className="mb-2 hidden grid-cols-12 gap-4 px-6 py-3 font-inter text-xs font-bold uppercase tracking-widest text-zinc-500 md:grid">
        <div className="col-span-3">Date &amp; Time</div>
        <div className="col-span-5">Operation &amp; Assignment</div>
        <div className="col-span-3">Outcome</div>
        <div className="col-span-1" />
      </div>

      <div className="flex flex-col gap-3">
        {results.map((row) => (
          <MatchRow
            key={row._id}
            row={row}
            expanded={expandedId === row._id}
            onToggle={() =>
              setExpandedId(expandedId === row._id ? null : row._id)
            }
            currentPlayerId={currentPlayerId}
          />
        ))}

        {status === "LoadingMore" && (
          <div className="h-[92px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/60" />
        )}

        {/* Infinite-scroll sentinel */}
        <div ref={sentinelRef} className="h-px w-full" />
      </div>
    </>
  );
}
