import React, { useEffect, useMemo, useState } from "react";
import {
  TrackReferenceOrPlaceholder,
  useRoomContext,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";

const HostControls = ({
  gameId,
  tracks,
}: {
  gameId?: string;
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
      allReady: total >= 12 && ready >= 12,
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
          {readyCount}/{Math.max(12, totalPlayers)} ready
        </div>
      )}
    </div>
  );
};

export default HostControls;
