"use client";

import { useTranslations } from "next-intl";

interface EmptySeatProps {
  seatIndex: number;
  className?: string;
}

export default function EmptySeat({
  seatIndex,
  className = "",
}: EmptySeatProps) {
  const tg = useTranslations("game");
  return (
    <div
      className={`absolute inset-0 flex flex-col items-center justify-center ${className}`}
    >
      {/* Very subtle dashed inner border */}
      <div className="absolute inset-[3px] rounded-xl border border-dashed border-white/20 pointer-events-none" />

      {/* Ghosted seat number */}
      <span
        className="font-orbitron text-white/30 font-bold select-none leading-none"
        style={{ fontSize: "clamp(1.5rem, 4vw, 2.8rem)" }}
      >
        {seatIndex}
      </span>

      {/* WAITING label */}
      <span
        className="font-orbitron text-white/25 font-semibold uppercase tracking-[0.22em] mt-1 select-none"
        style={{ fontSize: "clamp(0.35rem, 1vw, 0.55rem)" }}
      >
        {tg("waitingForPlayer")}
      </span>
    </div>
  );
}
