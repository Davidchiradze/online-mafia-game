"use client";

import { useTranslations } from "next-intl";

type Props = {
  candidates: number[];
  currentIdx: number;
  isVoting: boolean;
  votes: Record<string, number[]>;
  variant?: "regular" | "both_leave";
};

/**
 * Progress dots showing candidates in voting queue.
 */
export function CandidateDots({
  candidates,
  currentIdx,
  isVoting,
  votes,
  variant = "regular",
}: Props) {
  const t = useTranslations("game");
  const getDotStyle = (idx: number): React.CSSProperties => {
    if (variant === "both_leave") {
      return {
        background: "linear-gradient(135deg, rgba(220,38,38,0.3) 0%, rgba(185,28,28,0.35) 100%)",
        borderColor: "rgba(220,38,38,0.7)",
        boxShadow: "0 0 12px rgba(220,38,38,0.4)",
      };
    }

    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;

    if (isCurrent) {
      return {
        background: isVoting
          ? "linear-gradient(135deg, rgba(52,211,153,0.4) 0%, rgba(16,185,129,0.45) 100%)"
          : "linear-gradient(135deg, rgba(52,211,153,0.3) 0%, rgba(16,185,129,0.35) 100%)",
        borderColor: "rgba(52,211,153,0.8)",
        boxShadow: isVoting
          ? "0 0 18px rgba(52,211,153,0.6)"
          : "0 0 12px rgba(52,211,153,0.35)",
      };
    }
    if (isPast) {
      return {
        background: "rgba(255,255,255,0.05)",
        borderColor: "rgba(255,255,255,0.15)",
        opacity: 0.5,
      };
    }
    return {
      background: "rgba(255,255,255,0.03)",
      borderColor: "rgba(255,255,255,0.1)",
    };
  };

  const getTextColor = (idx: number) => {
    if (variant === "both_leave") return "text-red-300";
    const isCurrent = idx === currentIdx;
    const isPast = idx < currentIdx;
    if (isCurrent) return "text-emerald-200";
    if (isPast) return "text-white/30";
    return "text-white/50";
  };

  return (
    <div className="flex gap-2">
      {candidates.map((seat, idx) => (
        <div
          key={seat}
          className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
            variant === "regular" && idx === currentIdx && isVoting ? "animate-pulse" : ""
          }`}
          style={getDotStyle(idx)}
          title={t("candidateDotTooltip", { seat, votes: (votes[String(seat)] ?? []).length })}
        >
          <span
            className={`text-xs font-bold ${getTextColor(idx)}`}
            style={{ fontFamily: "var(--font-orbitron), sans-serif" }}
          >
            {seat}
          </span>
        </div>
      ))}
    </div>
  );
}
