"use client";

type FoulDisplayProps = {
  foulCount: number;
};

/**
 * Component that displays the number of fouls a player has received.
 * Shows exclamation marks (!) equal to the foul count.
 * Visible to all players.
 */
export default function FoulDisplay({ foulCount }: FoulDisplayProps) {
  if (foulCount === 0) return null;

  return (
    <div className="absolute right-1 bottom-1 md:right-2 md:bottom-2 z-20">
      <div className="flex items-center gap-0.5 rounded-full border border-amber-500/50 bg-amber-500/20 backdrop-blur px-1.5 py-0.5 md:px-2 md:py-1">
        {Array.from({ length: foulCount }).map((_, i) => (
          <span key={i} className="text-amber-400 font-bold text-xs md:text-sm">
            !
          </span>
        ))}
      </div>
    </div>
  );
}
