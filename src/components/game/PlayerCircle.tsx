"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import React from "react";
import ParticipantComponent from "../participant/ParticipantComponent";
import { usePlayerSlots } from "@/hooks/game";
import GamePhaseControls from "./GamePhaseControls";
import { Tables } from "@/db/supabase/database.types";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import NominatedPlayersDisplay from "./NominatedPlayersDisplay";
import VotingDisplay from "./VotingDisplay";
import { EmptySeat } from "@/components/participant/playerStates";

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
        const isHostIndex = key === maxPlayers + 1;
        const player = players.find(
          (p) => p.seat_number === key,
        ) as Tables<"game_players">;
        return (
          <div
            key={`seat-${String(key)}`}
            className={
              "relative rounded-xl backdrop-blur-sm" +
              (player
                ? "bg-black/40 border border-white/10"
                : "bg-white/[0.03] border border-dashed border-white/20 ") +
              (isHostIndex ? "transform translate-y-1/2" : "")
            }
            style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
          >
            {player ? (
              <ParticipantComponent
                player={player}
                gameId={gameId}
                hostUserId={hostUserId}
                currentUserId={userId}
                trackRef={track}
                playerIndex={key}
              />
            ) : (
              <EmptySeat seatIndex={key} />
            )}
          </div>
        );
      })}
      <div style={{ gridColumn: 3, gridRow: 2, position: "relative" }}>
        {(isHost || gameSessionState?.game_phase === "voting") && (
          <div className="absolute top-0 left-0 w-full h-[200%] flex flex-col items-center justify-center gap-2">
            <div className="w-full h-[50%] flex flex-col items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-black/50 backdrop-blur-md border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-inset ring-white/[0.05]">
              {isHost ? (
                <NominatedPlayersDisplay
                  nominatedPlayers={gameSessionState?.nominated_players ?? []}
                />
              ) : (
                <VotingDisplay />
              )}
              {isHost && <GamePhaseControls />}
            </div>
          </div>
        )}
      </div>
      <div style={{ gridColumn: 3, gridRow: 3 }}></div>
    </div>
  );
}
