"use client";

import { useEffect, useRef } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import type { useGameRoom } from "@/features/game-room/context/gameRoomContext";

type GamePlayer = ReturnType<typeof useGameRoom>["players"][number];

export function useDeadPlayerMute(
  room: LiveKitRoom | null | undefined,
  players: GamePlayer[],
  userId: string,
  isGameFinished?: boolean,
  enabled: boolean = true
) {
  const prevStateRef = useRef<{ isDead: boolean; isFinished: boolean } | null>(
    null
  );

  useEffect(() => {
    if (!room || !enabled) return;

    const myPlayer = players.find((p) => p.playerId === (userId as unknown));
    if (!myPlayer) return;

    const isDead = myPlayer.isAlive === false;
    const isFinished = Boolean(isGameFinished);

    const prevState = prevStateRef.current;
    if (
      prevState &&
      prevState.isDead === isDead &&
      prevState.isFinished === isFinished
    ) {
      return;
    }
    prevStateRef.current = { isDead, isFinished };

    if (isFinished) {
      void room.localParticipant.setCameraEnabled(true);
      void room.localParticipant.setMicrophoneEnabled(false);
      return;
    }

    if (isDead) {
      void room.localParticipant.setMicrophoneEnabled(false);
      void room.localParticipant.setCameraEnabled(false);
    }
  }, [room, players, userId, isGameFinished, enabled]);
}
