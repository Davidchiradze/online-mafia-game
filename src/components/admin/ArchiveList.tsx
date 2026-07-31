"use client";

import { useCallback, useEffect, useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { Archive, Search, SearchX } from "lucide-react";
import { useTranslations } from "next-intl";
import { adminGameLogs } from "@convex/refs/admin";
import { GAME_TYPES } from "@/shared/lib/constants/game";
import { useInfiniteScroll } from "@/shared/hooks/useInfiniteScroll";
import ArchiveRow from "./ArchiveRow";

const PAGE_SIZE = 10;
type GameTypeFilter = "all" | (typeof GAME_TYPES)[number];

const SELECT_CLASS =
  "min-w-[180px] cursor-pointer appearance-none rounded-xl border border-white/5 bg-[#13131a]/70 px-5 py-3.5 font-inter font-medium text-white transition focus:border-[#00ff66]/50 focus:bg-[#13131a]/90 focus:outline-none";

export default function ArchiveList() {
  const t = useTranslations("admin");
  const tg = useTranslations("game");

  const [gameType, setGameType] = useState<GameTypeFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  // Debounce the search input so we don't re-query on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const { results, status, loadMore } = usePaginatedQuery(
    adminGameLogs.listAll,
    {
      gameType: gameType === "all" ? undefined : gameType,
      search: search || undefined,
    },
    { initialNumItems: PAGE_SIZE },
  );

  const onReachEnd = useCallback(() => {
    if (status === "CanLoadMore") loadMore(PAGE_SIZE);
  }, [status, loadMore]);
  const sentinelRef = useInfiniteScroll(onReachEnd, status === "CanLoadMore");

  const filtersActive = gameType !== "all" || search.length > 0;

  return (
    <div>
      {/* Filters: search (left) + mode (right) */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("archive.search")}
            className="w-full rounded-xl border border-white/5 bg-[#13131a]/70 py-3.5 pl-11 pr-4 font-inter font-medium text-white transition placeholder:text-zinc-500 focus:border-[#00ff66]/50 focus:bg-[#13131a]/90 focus:outline-none"
          />
        </div>

        <select
          value={gameType}
          onChange={(e) => setGameType(e.target.value as GameTypeFilter)}
          className={SELECT_CLASS}
        >
          <option value="all" className="bg-[#0a0a12]">
            {t("archive.filterAll")}
          </option>
          {GAME_TYPES.map((gt) => (
            <option key={gt} value={gt} className="bg-[#0a0a12]">
              {tg(`gameTypes.${gt}` as Parameters<typeof tg>[0])}
            </option>
          ))}
        </select>
      </div>

      {status === "LoadingFirstPage" ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[92px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/60"
            />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#13131a]/60 px-6 py-16 text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-500">
            {filtersActive ? (
              <SearchX className="h-7 w-7" />
            ) : (
              <Archive className="h-7 w-7" />
            )}
          </div>
          <h3 className="mb-2 font-orbitron text-lg font-bold uppercase tracking-widest text-zinc-200">
            {filtersActive
              ? t("archive.noResultsTitle")
              : t("archive.emptyTitle")}
          </h3>
          <p className="max-w-sm font-inter text-sm text-zinc-500">
            {filtersActive
              ? t("archive.noResultsBody")
              : t("archive.emptyBody")}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop list header */}
          <div className="mb-2 hidden grid-cols-12 gap-4 px-6 py-3 font-inter text-xs font-bold uppercase tracking-widest text-zinc-500 md:grid">
            <div className="col-span-3">{t("archive.colDate")}</div>
            <div className="col-span-5">{t("archive.colGame")}</div>
            <div className="col-span-3">{t("archive.colWinner")}</div>
            <div className="col-span-1" />
          </div>

          <div className="flex flex-col gap-3">
            {results.map((row) => (
              <ArchiveRow key={row._id} row={row} />
            ))}

            {status === "LoadingMore" && (
              <div className="h-[92px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/60" />
            )}

            {/* Infinite-scroll sentinel */}
            <div ref={sentinelRef} className="h-px w-full" />
          </div>
        </>
      )}
    </div>
  );
}
