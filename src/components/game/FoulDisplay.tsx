"use client";

import { FoulXIcon } from "@/assets/icons";

type FoulDisplayProps = {
  foulCount: number;
};

/**
 * Displays foul count as small red × marks. Visible to all players.
 */
export default function FoulDisplay({ foulCount }: FoulDisplayProps) {
  if (foulCount === 0) return null;

  return (
    <div className="absolute right-1.5 bottom-1 md:right-2 md:bottom-2 z-20 flex items-center gap-0.5">
      {Array.from({ length: foulCount }).map((_, i) => (
        <FoulXIcon
          key={i}
          width="12"
          height="12"
          className="shrink-0 drop-shadow-[0_0_3px_rgba(239,68,68,0.8)]"
        />
      ))}
    </div>
  );
}
