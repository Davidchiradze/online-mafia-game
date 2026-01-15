"use client";

type NominatedPlayersDisplayProps = {
  nominatedPlayers: number[];
};

/**
 * Displays the list of nominated player seat numbers.
 * Shows a red-styled badge for each nominated player.
 * Returns null if no players are nominated.
 */
export default function NominatedPlayersDisplay({
  nominatedPlayers,
}: NominatedPlayersDisplayProps) {
  if (nominatedPlayers.length === 0) return null;

  return (
    <div className="flex items-center flex-col justify-center gap-2 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-lg">
      <span className="text-xs text-red-300">Nominated:</span>
      <div className="flex gap-1 flex-wrap">
        {nominatedPlayers.map((seatIndex) => (
          <span
            key={seatIndex}
            className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full"
          >
            #{seatIndex}
          </span>
        ))}
      </div>
    </div>
  );
}
