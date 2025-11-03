"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import React, { useMemo } from "react";
import ParticipantComponent from "../participant/ParticipantComponent";
import HostControls from "./HostControls";

type PlayerCircleProps = {
  gameId: string;
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
function gridPositionForPlayerIndex(playerIndex: number | "host"): {
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
    case "host":
      return { gridRow: 2, gridColumn: 2 };
    default:
      return { gridRow: 4, gridColumn: 4 };
  }
}

export default function PlayerCircle({
  gameId,
  tracks,
  hostUserId,
  userId,
  maxPlayers = 12,
}: {
  gameId: string;
  tracks: TrackReferenceOrPlaceholder[];
  hostUserId: string;
  userId: string;
  maxPlayers?: number;
}) {
  const slotDescriptors = useMemo(() => {
    const hostTrack = tracks.find((t) => t.participant.identity === hostUserId);
    const nonHostTracks = tracks
      .filter((t) => t.participant.identity !== hostUserId)
      .slice(0, maxPlayers);

    const slots: Array<{
      key: number | "host";
      track?: TrackReferenceOrPlaceholder;
    }> = [];

    // host is always at row 2, col 2
    slots.push({ key: "host", track: hostTrack });

    // numbered player positions 1..maxPlayers
    for (let i = 1; i <= maxPlayers; i++) {
      slots.push({ key: i as number, track: nonHostTracks[i - 1] });
    }

    return slots;
  }, [tracks, hostUserId, maxPlayers]);
  //

  return (
    <div
      className="grid w-full h-full gap-2 md:gap-3 lg:gap-4"
      style={{
        gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
        gridTemplateRows: "repeat(4, minmax(0, 1fr))",
      }}
    >
      {slotDescriptors.map(({ key, track }) => {
        const pos = gridPositionForPlayerIndex(key);
        const isHost = key === "host";
        return (
          <div
            key={
              (track as TrackReferenceOrPlaceholder | undefined)?.participant
                .identity ?? `slot-${String(key)}`
            }
            className={
              "relative rounded-xl overflow-hidden bg-black/40 backdrop-blur-sm border " +
              (isHost
                ? "border-amber-400/60 ring-1 ring-amber-400/40"
                : "border-white/10")
            }
            style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
          >
            {track ? (
              <ParticipantComponent
                gameId={gameId}
                hostUserId={hostUserId}
                currentUserId={userId}
                trackRef={track}
                playerIndex={key}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-300/70">
                {isHost ? "Host" : `${key} Empty`}
              </div>
            )}
          </div>
        );
      })}
      <div style={{ gridColumn: 3, gridRow: 2 }}>
        {userId === hostUserId && <HostControls />}
      </div>
    </div>
  );
}
