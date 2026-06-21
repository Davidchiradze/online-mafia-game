"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { motion } from "motion/react";
import ParticipantComponent from "../participant/ParticipantComponent";
import GamePhaseControls from "./GamePhaseControls";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import VotingDisplay from "./VotingDisplay";
import { EmptySeat } from "@/components/participant/playerStates";
import PhaseTitle from "@/components/ui/PhaseTitle";
import WinnerBanner from "../host-controls/WinnerBanner";
import { useSeatShuffleAnimation } from "@/hooks/game";

const SHUFFLE_TRANSITION_SECONDS = 2.5;

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

  const {
    seatedPlayers,
    occupiedSeats,
    trackByPlayerId,
    hostTrack,
    gridPositionForSeat,
  } = useSeatShuffleAnimation({
    players,
    tracks,
    hostUserId,
    maxPlayers,
    gameSessionId: gameSessionState?._id ?? null,
  });

  const hostSlotKey = maxPlayers + 1;
  const hostPlayer = players.find((p) => p.seatNumber === hostSlotKey);

  return (
    <div className="grid w-full h-full gap-2 md:gap-3 lg:gap-4 grid-cols-4 grid-rows-4">
      {/* Static seat background layer */}
      {Array.from({ length: maxPlayers }, (_, index) => {
        const seatNumber = index + 1;
        const pos = gridPositionForSeat(seatNumber);
        const isOccupied = occupiedSeats.has(seatNumber);
        return (
          <div
            key={`seat-${String(seatNumber)}`}
            className={
              "relative rounded-xl backdrop-blur-sm " +
              (isOccupied
                ? "bg-black/40 border border-white/10"
                : "bg-white/[0.03] border border-dashed border-white/20")
            }
            style={{ gridColumn: pos.gridColumn, gridRow: pos.gridRow }}
          >
            {!isOccupied && <EmptySeat seatIndex={seatNumber} />}
          </div>
        );
      })}

      {/* Identity-keyed animated participant layer */}
      {seatedPlayers.map((player) => {
        const seatNumber = Number(player.seatNumber);
        if (!Number.isInteger(seatNumber)) return null;

        const position = gridPositionForSeat(seatNumber);
        const playerId = String(player.playerId);

        return (
          <motion.div
            key={`player-${playerId}`}
            className="relative rounded-xl backdrop-blur-sm bg-black/40 border border-white/10"
            style={{
              gridColumn: position.gridColumn,
              gridRow: position.gridRow,
            }}
            layout
            initial={false}
            transition={{
              layout: {
                type: "tween",
                duration: SHUFFLE_TRANSITION_SECONDS,
                ease: "linear",
              },
            }}
          >
            <ParticipantComponent
              player={player}
              gameId={gameId}
              hostProfileId={hostUserId}
              currentProfileId={userId}
              trackRef={trackByPlayerId.get(playerId)}
              playerIndex={seatNumber}
            />
          </motion.div>
        );
      })}

      {/* Unified 2x2 center panel */}
      <div className="center-panel rounded-2xl border flex flex-col-reverse overflow-hidden col-start-2 col-end-4 row-start-2 row-end-4">
        {/* Host video */}
        <div className="h-1/2 border-b border-white/10 flex items-center justify-center">
          <div className="relative h-full aspect-[4/3] overflow-hidden rounded-xl">
            {hostPlayer ? (
              <ParticipantComponent
                player={hostPlayer}
                gameId={gameId}
                hostProfileId={hostUserId}
                currentProfileId={userId}
                trackRef={hostTrack}
                playerIndex={hostSlotKey}
              />
            ) : (
              <EmptySeat seatIndex={hostSlotKey} />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="h-1/2 flex flex-col items-center justify-center gap-2 p-3 overflow-y-auto">
          {isHost ? (
            <GamePhaseControls />
          ) : gameSessionState?.isFinished ? (
            <WinnerBanner
              gameId={gameId}
              winner={gameSessionState.winner ?? null}
            />
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
