/**
 * Loading placeholder mirroring the real board's geometry — podium first, then
 * ranked rows — so the layout does not jump when the query resolves. The
 * `sm:order-*` classes match `PodiumCard`, keeping the champion centred.
 */
export default function LeaderboardSkeleton() {
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:items-end">
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#13131a]/60 sm:order-2 sm:h-80" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#13131a]/60 sm:order-1 sm:h-72" />
        <div className="h-72 animate-pulse rounded-2xl border border-white/5 bg-[#13131a]/60 sm:order-3 sm:h-72" />
      </div>
      <div className="mt-8 space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-[70px] animate-pulse rounded-xl border border-white/5 bg-[#13131a]/60"
          />
        ))}
      </div>
    </div>
  );
}
