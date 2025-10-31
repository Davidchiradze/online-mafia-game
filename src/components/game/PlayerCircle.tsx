"use client";

import {
  ParticipantTile,
  TrackReferenceOrPlaceholder,
} from "@livekit/components-react";
import React, { useMemo } from "react";

type PlayerCircleProps = {
  tracks: TrackReferenceOrPlaceholder[];
  hostUserId: string;
  maxPlayers?: number; // number of player slots around the host
};

// 4x5 grid placement for 12 players around a centered host (spanning 2 rows)
// Player indices are 1..12 (clockwise-ish around the host)
// Visual rows with playerIndex labels:
// Row1: [11, 12,  1,  2]
// Row2: [10,  h,  x,  3]
// Row3: [ 9,  x,  x,  4]
// Row4: [ 8,  7,  6,  5]
function gridPositionForPlayerIndex(playerIndex: number): {
  gridRow: number;
  gridColumn: number;
} {
  switch (playerIndex) {
    case 1:
      return { gridRow: 1, gridColumn: 3 };
    case 2:
      return { gridRow: 1, gridColumn: 4 };
    case 3:
      return { gridRow: 2, gridColumn: 4 };
    case 4:
      return { gridRow: 3, gridColumn: 4 };
    case 5:
      return { gridRow: 4, gridColumn: 4 };
    case 6:
      return { gridRow: 4, gridColumn: 3 };
    case 7:
      return { gridRow: 4, gridColumn: 2 };
    case 8:
      return { gridRow: 4, gridColumn: 1 };
    case 9:
      return { gridRow: 3, gridColumn: 1 };
    case 10:
      return { gridRow: 2, gridColumn: 1 };
    case 11:
      return { gridRow: 1, gridColumn: 1 };
    case 12:
      return { gridRow: 1, gridColumn: 2 };
    default:
      return { gridRow: 4, gridColumn: 4 };
  }
}

export default function PlayerCircle({
  tracks,
  hostUserId,
  maxPlayers = 12,
}: PlayerCircleProps) {
  const { hostTrack, playerTracks } = useMemo(() => {
    const hostT = tracks.find((t) => t.participant.identity === hostUserId);
    const rest = tracks.filter((t) => t.participant.identity !== hostUserId);
    return { hostTrack: hostT, playerTracks: rest.slice(0, maxPlayers) };
  }, [tracks, hostUserId, maxPlayers]);

  // Build exactly maxPlayers slots, fill placeholders with undefined
  const slots: Array<TrackReferenceOrPlaceholder | undefined> = useMemo(() => {
    const arr = new Array<TrackReferenceOrPlaceholder | undefined>(
      maxPlayers
    ).fill(undefined);
    for (let i = 0; i < Math.min(playerTracks.length, maxPlayers); i++) {
      arr[i] = playerTracks[i];
    }
    return arr;
  }, [playerTracks, maxPlayers]);

  return (
    <div
      className="grid w-full h-full gap-2 md:gap-3 lg:gap-4"
      style={{
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "repeat(4, minmax(0, 1fr))",
      }}
    >
      {/* Host centered, spanning two rows */}
      <div
        className="relative rounded-xl overflow-hidden border border-yellow-400 shadow-[0_0_0_2px_rgba(250,204,21,0.5)] bg-black/60"
        style={{ gridColumn: 2, gridRow: "2" }}
      >
        {hostTrack ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-sm text-gray-300">
            <ParticipantTile trackRef={hostTrack} />
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-300">
            Host
          </div>
        )}
      </div>

      {/* Players around the host */}
      {slots.map((t, index) => {
        const playerIndex = index + 1;
        const pos = gridPositionForPlayerIndex(playerIndex);
        return (
          <div
            key={t?.participant.identity ?? `slot-${playerIndex}`}
            className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black/60"
            style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
          >
            {t ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-sm text-gray-300">
                <ParticipantTile trackRef={t} />
                <div className="text-xs text-gray-400">{playerIndex}</div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                {playerIndex} Empty
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
