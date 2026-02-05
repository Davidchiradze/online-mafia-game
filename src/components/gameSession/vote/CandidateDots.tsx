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
      return "bg-red-500 text-white";
    }

    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;

    if (isCurrent) {
      return isVoting
        ? "bg-amber-500 text-white animate-pulse"
        : "bg-amber-500 text-white";
    }
    if (isPast) return "bg-gray-600 text-gray-300";
    return "bg-gray-700 text-gray-400";
  };

  return (
    <div className="flex gap-1">
      {candidates.map((seat, idx) => (
        <div
          key={seat}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${getDotStyle(idx)}`}
          title={`#${seat}: ${(votes[String(seat)] ?? []).length} votes`}
        >
          {seat}
        </div>
      ))}
    </div>
  );
}

