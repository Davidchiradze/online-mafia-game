import React, { useMemo } from "react";
import { TrackReferenceOrPlaceholder } from "@livekit/components-react";

const HostControls = ({
  gameId,
  maxPlayers,
  tracks,
}: {
  gameId?: string;
  maxPlayers: number;
  tracks: TrackReferenceOrPlaceholder[];
}) => {
  const { readyCount, totalPlayers, allReady } = useMemo(() => {
    const nonHostTracks = tracks.filter(
      (t) => !(t as any)?.participant?.isLocal
    );
    const total = nonHostTracks.length;
    const ready = nonHostTracks.filter((t) => {
      const p: any = (t as any)?.participant;
      try {
        return Boolean(JSON.parse(p?.metadata || "{}")?.ready);
      } catch (_e) {
        return false;
      }
    }).length;
    return {
      readyCount: ready,
      totalPlayers: total,
      allReady: total >= maxPlayers && ready >= maxPlayers,
    };
  }, [tracks]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      {allReady ? (
        <button
          type="button"
          className="rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 shadow"
          // onClick={startGame}
        >
          Start Game
        </button>
      ) : (
        <div className="text-xs text-gray-300/80">
          {readyCount}/{Math.max(maxPlayers, totalPlayers)} ready
        </div>
      )}
    </div>
  );
};

export default HostControls;
