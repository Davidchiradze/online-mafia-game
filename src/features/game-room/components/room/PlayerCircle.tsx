"use client";

import { TrackReferenceOrPlaceholder } from "@livekit/components-react";
import { motion } from "motion/react";
import ParticipantComponent from "@/features/game-room/components/participant/ParticipantComponent";
import GamePhaseControls from "@/features/game-room/components/phase/GamePhaseControls";
import { useGameRoom } from "@/features/game-room/context/gameRoomContext";
import VotingDisplay from "@/features/game-room/components/phase/VotingDisplay";
import { EmptySeat } from "@/features/game-room/components/participant/player-states";
import PhaseTitle from "@/features/game-room/components/phase/PhaseTitle";
import WinnerBanner from "@/features/game-room/components/host/WinnerBanner";
import { useSeatShuffleAnimation } from "@/features/game-room/hooks/game";
import { CENTER_PANEL_STACK_CLASS } from "@/features/game-room/lib/centerPanel";
import RingCenter from "./RingCenter";

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

  // The cell is handed over bare: the host panel is a size container and its
  // own padding is part of its type scale, so it cannot sit inside a `p-3`.
  // Everything that is not the panel opts back into the padded column itself.
  const controls = isHost ? (
    <GamePhaseControls />
  ) : (
    <div className={`${CENTER_PANEL_STACK_CLASS} justify-center`}>
      {gameSessionState?.isFinished ? (
        <WinnerBanner gameId={gameId} winner={gameSessionState.winner ?? null} />
      ) : (
        <>
          {gameSessionState && (
            <PhaseTitle gameSessionState={gameSessionState} />
          )}
          {gameSessionState?.gamePhase === "voting" && <VotingDisplay />}
        </>
      )}
    </div>
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

      <RingCenter
        seatLayout={seatLayout}
        hostVideo={hostVideo}
        controls={controls}
      />
    </div>
  );
}
