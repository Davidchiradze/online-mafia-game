"use client";

import { useCallback, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { Swords, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { gameLogs as historyRefs } from "@convex/refs/history";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";
import MatchRow from "./MatchRow";
import type { OutcomeFilter } from "./MatchFilters";
import type { RatedGameType } from "@/shared/lib/ranking/ratedVariants";
import type { Id } from "@convex/_generated/dataModel";

interface Props {
  outcome: OutcomeFilter;
  /** Always a concrete mode — the page's hero switcher owns this scope. */
  gameType: RatedGameType;
  currentPlayerId: Id<"profiles"> | undefined;
}

const PAGE_SIZE = 10;

export default function MatchHistoryList({
  outcome,
  gameType,
  currentPlayerId,
}: Props) {
  const t = useTranslations("matchHistory");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { results, status, loadMore } = usePaginatedQuery(
    historyRefs.listMine,
    { outcome, gameType },
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
    // Outcome only. `gameType` is now the page's always-set scope rather than a
    // filter, so counting it here would make this permanently true and tell a
    // brand-new player with no games at all to "try adjusting the filters".
    const filtersActive = outcome !== "all";
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#13131a]/60 px-6 py-16 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500">
          {filtersActive ? (
            <SearchX className="h-7 w-7" />
          ) : (
            <Swords className="h-7 w-7" />
          )}
        </div>
        <h3 className="mb-2 font-orbitron text-lg font-bold uppercase tracking-widest text-zinc-200">
          {filtersActive ? t("noMatchesFoundTitle") : t("noMatchesYetTitle")}
        </h3>
        <p className="max-w-sm font-inter text-sm text-zinc-500">
          {filtersActive ? t("noMatchesFoundBody") : t("noMatchesYetBody")}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop list header */}
      <div className="mb-2 hidden grid-cols-12 gap-4 px-6 py-3 font-inter text-xs font-bold uppercase tracking-widest text-zinc-500 md:grid">
        <div className="col-span-3">{t("colDateTime")}</div>
        <div className="col-span-5">{t("colOperation")}</div>
        <div className="col-span-3">{t("colOutcome")}</div>
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
