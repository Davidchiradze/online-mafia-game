"use client";

import { useEffect, useRef } from "react";
import { ConnectionState, Room as LiveKitRoom } from "livekit-client";
import { SPEAKING_STATE } from "@/shared/lib/constants/game";
import {
  countAliveSeatedPlayers,
  isSeatMutedThisRound,
} from "@/shared/lib/game/speakingBan";
import { useConnectionState } from "@livekit/components-react";
import type { useGameRoom } from "@/lib/context/gameRoomContext";

type GameSession = NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;
type GamePlayer = ReturnType<typeof useGameRoom>["players"][number];

export function useSpeakingAutoMute(
  room: LiveKitRoom | null | undefined,
  gameSessionState: GameSession | null,
  players: GamePlayer[],
  userId: string,
  isHost: boolean,
  /**
   * Table size, so the 3rd-foul ban's alive count excludes the host seat
   * (`maxPlayers + 1`). `null` until the game doc loads.
   */
  maxPlayers: number | null,
  enabled: boolean = true
) {
  const connectionState = useConnectionState(room ?? undefined);
  const isConnected = connectionState === ConnectionState.Connected;
  const prevShouldMuteRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!room || !enabled || isHost || !isConnected) return;

    const myPlayer = players.find((p) => p.playerId === (userId as unknown));
    const mySeatNumber = myPlayer?.seatNumber ?? null;

    if (!gameSessionState) {
      if (prevShouldMuteRef.current !== false) {
        prevShouldMuteRef.current = false;
        void room.localParticipant.setMicrophoneEnabled(false);
      }
      return;
    }

    if (mySeatNumber === null || mySeatNumber === undefined) {
      if (prevShouldMuteRef.current !== true) {
        prevShouldMuteRef.current = true;
        void room.localParticipant.setMicrophoneEnabled(false);
      }
      return;
    }

    const speakingOrder = gameSessionState.speakingOrder ?? [];
    const currentSpeakerIndex = gameSessionState.currentSpeakerIndex ?? null;

    const isSpeakingRoundActive =
      speakingOrder.length > 0 && SPEAKING_STATE.isActive(currentSpeakerIndex);

    const isPaused = SPEAKING_STATE.isPaused(currentSpeakerIndex);

    let shouldMute: boolean;

    if (isSpeakingRoundActive) {
      // Muted this round (3rd-foul ban)? Stay locked even on your own turn —
      // the tile shows the muted (or, if you break the lock, foul) border. Only
      // in `day_phase`: a farewell speaker keeps their mic even when banned.
      const bannedThisRound = myPlayer
        ? isSeatMutedThisRound(
            myPlayer,
            gameSessionState.currentNightNumber,
            countAliveSeatedPlayers(players, maxPlayers),
            gameSessionState.gamePhase,
          )
        : false;
      shouldMute = currentSpeakerIndex !== mySeatNumber || bannedThisRound;
    } else if (isPaused) {
      shouldMute = true;
    } else {
      shouldMute = true;
    }

    if (prevShouldMuteRef.current === shouldMute) return;
    prevShouldMuteRef.current = shouldMute;

    void room.localParticipant.setMicrophoneEnabled(!shouldMute);
  }, [
    room,
    gameSessionState,
    players,
    userId,
    isHost,
    maxPlayers,
    enabled,
    isConnected,
  ]);
}
