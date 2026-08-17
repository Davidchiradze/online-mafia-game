"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Trophy } from "lucide-react";
import { leaderboard } from "@convex/refs/leaderboard";
import { useViewer } from "@/features/auth/hooks/useViewer";
import {
  DEFAULT_RATED_GAME_TYPE,
  type RatedGameType,
} from "@/shared/lib/ranking/ratedVariants";
import RatedVariantTabs from "../components/RatedVariantTabs";
import PodiumCard from "./PodiumCard";
import RankedRow from "./RankedRow";
import LeaderboardSkeleton from "./LeaderboardSkeleton";

/**
 * All-time ELO leaderboard, one board per rated variant
 * (see /docs/ranking-system.md §12). Every column — rating, record, streaks,
 * top role — belongs to the selected ladder; nothing here is cross-variant.
 * Rows come pre-sorted from the `by_gameType_rating` index; players with no
 * rated games in that variant are deliberately absent from its board.
 *
 * The selection is local state, NOT a URL param: the repo has no
 * `useSearchParams` call site, and adding one without a `<Suspense>` boundary
 * fails `next build`. Shareable per-ladder links would need that boundary first.
 *
 * Layout: a gold/silver/bronze podium for the top 3 (medal-colored frames,
 * level-colored stats), followed by scannable ranked rows in the match-history
 * style — left accent bar keyed to level color, stats in fixed columns. The
 * signed-in player's entry gets a red "You" highlight wherever it appears.
 */
export default function LeaderboardContent() {
  const t = useTranslations("leaderboard");
  const tg = useTranslations("game");
  const [gameType, setGameType] = useState<RatedGameType>(
    DEFAULT_RATED_GAME_TYPE,
  );
  const rows = useQuery(leaderboard.list, { gameType, limit: 50 });
  const { profile } = useViewer();
  const myId = profile?._id ?? null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 text-white sm:px-6 sm:pt-10">
      {/* Hero */}
      <div className="mb-10 flex flex-col items-center text-center">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 shadow-[0_0_24px_rgba(251,191,36,0.25)]">
          <Trophy className="h-5 w-5 text-amber-400" />
        </div>
        <h1 className="mb-2 font-orbitron text-3xl font-bold uppercase tracking-widest text-white drop-shadow-sm sm:text-4xl">
          {t("pageTitle")}
        </h1>
        <p className="max-w-xl font-inter text-sm text-zinc-400 sm:text-base">
          {t("pageSubtitle")}
        </p>
        <RatedVariantTabs
          value={gameType}
          onChange={setGameType}
          className="mt-5"
        />
      </div>

      {rows === undefined ? (
        <LeaderboardSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#13131a]/60 p-12 text-center font-inter text-zinc-400">
          {/* Names the ladder: a newly rated variant's board is empty on day
              one, and the generic copy would read as a broken page. */}
          {t("emptyForMode", {
            mode: tg(`gameTypes.${gameType}` as Parameters<typeof tg>[0]),
          })}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
            {rows.slice(0, 3).map((p, i) => (
              <PodiumCard
                key={p.playerId}
                player={p}
                rank={i + 1}
                isMe={p.playerId === myId}
              />
            ))}
          </div>

          {rows.length > 3 && (
            <div className="mt-8 space-y-2">
              {rows.slice(3).map((p, i) => (
                <RankedRow
                  key={p.playerId}
                  player={p}
                  rank={i + 4}
                  isMe={p.playerId === myId}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
