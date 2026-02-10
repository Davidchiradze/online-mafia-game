"use client";

type Props = {
  candidates: number[];
  currentIdx: number;
  isVoting: boolean;
  votes: Record<string, number[]>;
  variant?: "regular" | "both_leave";
};

/**
 * Progress dots showing candidates in voting queue.
 * Highlights current candidate and shows past/future status.
 */
export function CandidateDots({
  candidates,
  currentIdx,
  isVoting,
  votes,
  variant = "regular",
}: Props) {
  const getDotStyle = (idx: number) => {
    if (variant === "both_leave") {
      return "bg-rose-500 text-white border-rose-400";
    }

    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;

    if (isCurrent) {
      return isVoting
        ? "bg-emerald-500 text-white border-emerald-400 animate-pulse"
        : "bg-emerald-500 text-white border-emerald-400";
    }
    if (isPast) return "bg-white/10 text-white/50 border-white/20";
    return "bg-white/5 text-white/40 border-white/10";
  };

  return (
    <div className="flex gap-1.5">
      {candidates.map((seat, idx) => (
        <div
          key={seat}
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${getDotStyle(idx)}`}
          title={`#${seat}: ${(votes[String(seat)] ?? []).length} votes`}
        >
          {seat}
        </div>
      ))}
    </div>
  );
}
