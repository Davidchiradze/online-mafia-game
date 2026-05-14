"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import React from "react";
import ParticipantComponent from "../participant/ParticipantComponent";
import { usePlayerSlots } from "@/hooks/game";
import GamePhaseControls from "./GamePhaseControls";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import VotingDisplay from "./VotingDisplay";
import { EmptySeat } from "@/components/participant/playerStates";
import PhaseTitle from "@/components/ui/PhaseTitle";

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
    case 13:
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
  hostUserId: string | null;
  userId: string;
  maxPlayers?: number;
}) {
  const { players, gameSessionState, isHost } = useGameRoom();
  const slotDescriptors = usePlayerSlots({
    tracks,
    hostUserId,
    maxPlayers: maxPlayers,
    players,
  });

  const hostSlotKey = maxPlayers + 1;
  const hostSlotDescriptor = slotDescriptors.find(
    ({ key }) => key === hostSlotKey,
  );
  const hostPlayer = players.find((p) => p.seatNumber === hostSlotKey);

  return (
    <div className="grid w-full h-full gap-2 md:gap-3 lg:gap-4 grid-cols-4 grid-rows-4">
      {slotDescriptors.map(({ key, track }) => {
        if (key === hostSlotKey) return null;

        const pos = gridPositionForPlayerIndex(key);
        const player = players.find((p) => p.seatNumber === key);
        return (
          <div
            key={`seat-${String(key)}`}
            className={
              "relative rounded-xl backdrop-blur-sm " +
              (player
                ? "bg-black/40 border border-white/10"
                : "bg-white/[0.03] border border-dashed border-white/20")
            }
            style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
          >
            {player ? (
              <ParticipantComponent
                player={player}
                gameId={gameId}
                hostProfileId={hostUserId}
                currentProfileId={userId}
                trackRef={track}
                playerIndex={key}
              />
            ) : (
              <EmptySeat seatIndex={key} />
            )}
          </div>
        );
      })}

      {/* Unified 2×2 center panel */}
      <div className="center-panel rounded-2xl border flex flex-col-reverse overflow-hidden col-start-2 col-end-4 row-start-2 row-end-4">
        {/* Host video — top 50% */}
        <div className="h-1/2 border-b border-white/10 flex items-center justify-center">
          <div className="relative h-full aspect-[4/3] overflow-hidden rounded-xl">
            {hostPlayer ? (
              <ParticipantComponent
                player={hostPlayer}
                gameId={gameId}
                hostProfileId={hostUserId}
                currentProfileId={userId}
                trackRef={hostSlotDescriptor?.track}
                playerIndex={hostSlotKey}
              />
            ) : (
              <EmptySeat seatIndex={hostSlotKey} />
            )}
          </div>
        </div>

        {/* Controls — bottom 50% */}
        <div className="h-1/2 flex flex-col items-center justify-center gap-2 p-3 overflow-y-auto">
          {isHost ? (
            <GamePhaseControls />
          ) : (
            <>
              {gameSessionState && (
                <PhaseTitle gameSessionState={gameSessionState} />
              )}
              {gameSessionState?.gamePhase === "voting" && <VotingDisplay />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
