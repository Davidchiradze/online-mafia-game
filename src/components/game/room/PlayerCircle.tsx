"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { motion } from "motion/react";
import ParticipantComponent from "@/components/participant/ParticipantComponent";
import GamePhaseControls from "@/components/game/phase/GamePhaseControls";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import VotingDisplay from "@/components/game/phase/VotingDisplay";
import { EmptySeat } from "@/components/participant/playerStates";
import PhaseTitle from "@/components/ui/PhaseTitle";
import WinnerBanner from "@/components/host-controls/WinnerBanner";
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
  const { players, gameSessionState, isHost, ruleset } = useGameRoom();
  const { seatLayout } = ruleset;
  const gridPositionForSeat = seatLayout.positionForSeat;

  const { seatedPlayers, occupiedSeats, trackByPlayerId, hostTrack } =
    useSeatShuffleAnimation({
      players,
      tracks,
      hostUserId,
      maxPlayers,
      gameSessionId: gameSessionState?._id ?? null,
      gridPositionForSeat,
    });

  const hostSlotKey = maxPlayers + 1;
  const hostPlayer = players.find((p) => p.seatNumber === hostSlotKey);

  const { hostPanel, controlsPanel } = seatLayout;
  const isSplitCenter = !!hostPanel && !!controlsPanel;

  const hostVideo = (
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
  );

  const controls = isHost ? (
    <GamePhaseControls />
  ) : gameSessionState?.isFinished ? (
    <WinnerBanner gameId={gameId} winner={gameSessionState.winner ?? null} />
  ) : (
    <>
      {gameSessionState && <PhaseTitle gameSessionState={gameSessionState} />}
      {gameSessionState?.gamePhase === "voting" && <VotingDisplay />}
    </>
  );

  return (
    <div
      className="grid w-full h-full gap-2 md:gap-3 lg:gap-4"
      style={{
        gridTemplateColumns: `repeat(${String(seatLayout.cols)}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${String(seatLayout.rows)}, minmax(0, 1fr))`,
      }}
    >
      {/* Static seat background layer */}
      {Array.from({ length: maxPlayers }, (_, index) => {
        const seatNumber = index + 1;
        const pos = gridPositionForSeat(seatNumber);
        const isOccupied = occupiedSeats.has(seatNumber);
        return (
          <div
            key={`seat-${String(seatNumber)}`}
            className={
              "relative rounded-xl " +
              (isOccupied
                ? "bg-black/60 border border-white/10"
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
            className="relative rounded-xl bg-black/60 border border-white/10"
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

      {isSplitCenter ? (
        <>
          {/* Split center — host video cell */}
          <div
            className="center-panel rounded-2xl border overflow-hidden flex items-center justify-center"
            style={spanStyle(hostPanel)}
          >
            {hostVideo}
          </div>

          {/* Split center — host controls / voting cell */}
          <div
            className="center-panel rounded-2xl border overflow-auto flex flex-col items-center justify-center gap-2 p-3"
            style={spanStyle(controlsPanel)}
          >
            {controls}
          </div>
        </>
      ) : (
        /* Merged center panel (host video + host controls stacked) */
        <div
          className="center-panel rounded-2xl border flex flex-col-reverse overflow-hidden"
          style={spanStyle(seatLayout.center)}
        >
          {/* Host video */}
          <div className="h-1/2 border-b border-white/10 flex items-center justify-center">
            {hostVideo}
          </div>

          {/* Controls */}
          <div className="h-1/2 flex flex-col items-center justify-center gap-2 p-3 overflow-y-auto">
            {controls}
          </div>
        </div>
      )}
    </div>
  );
}

function spanStyle(span: {
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}) {
  return {
    gridColumnStart: span.colStart,
    gridColumnEnd: span.colEnd,
    gridRowStart: span.rowStart,
    gridRowEnd: span.rowEnd,
  };
}
