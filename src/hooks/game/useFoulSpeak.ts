"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import { FOULS } from "@/lib/constants/game";
import type { useGameRoom } from "@/lib/context/gameRoomContext";

type Player = NonNullable<ReturnType<typeof useGameRoom>["players"]>[number];

type UseFoulSpeakOptions = {
  room: LiveKitRoom | null | undefined;
  player: Player;
  isLocal: boolean;
  isFoulAllowedPhase: boolean;
  isSpeaking: boolean;
  isTargetHost: boolean;
  isViewerHost: boolean;
};

type UseFoulSpeakReturn = {
  isFoulSpeaking: boolean;
  foulSpeakTimeLeft: number;
  startFoulSpeak: () => Promise<void>;
  canFoulSpeak: boolean;
  canShowFoulSpeakButton: boolean;
  currentFouls: number;
  canShowFoulButton: boolean;
};

/**
 * Hook that manages foul speaking and foul button visibility.
 */
export function useFoulSpeak({
  room,
  player,
  isLocal,
  isFoulAllowedPhase,
  isSpeaking,
  isTargetHost,
  isViewerHost,
}: UseFoulSpeakOptions): UseFoulSpeakReturn {
  const currentFouls = player.fouls ?? 0;

  // Show foul button to host during foul-allowed phases (not on host tile)
  const canShowFoulButton =
    isViewerHost &&
    isFoulAllowedPhase &&
    !isTargetHost &&
    player.seatNumber != null;

  // Foul speak - for non-speakers to speak for 5 seconds during foul-allowed phases
  // Only enabled for local player who is NOT the current speaker and NOT the host
  const canUseFoulSpeak =
    isLocal && isFoulAllowedPhase && !isSpeaking && !isTargetHost;
  const [isFoulSpeaking, setIsFoulSpeaking] = useState(false);
  const [foulSpeakTimeLeft, setFoulSpeakTimeLeft] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  // Start foul speaking - unmute for 5 seconds
  const startFoulSpeak = useCallback(async () => {
    if (!room || !canUseFoulSpeak || isFoulSpeaking) return;

    // Clean up any existing timers
    cleanup();

    // Unmute the player
    await room.localParticipant.setMicrophoneEnabled(true);
    setIsFoulSpeaking(true);
    setFoulSpeakTimeLeft(FOULS.FOUL_SPEAK_DURATION_SECONDS);

    // Start countdown timer (updates every second)
    countdownRef.current = setInterval(() => {
      setFoulSpeakTimeLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Set timer to mute after 5 seconds
    timerRef.current = setTimeout(async () => {
      // Re-mute the player
      await room.localParticipant.setMicrophoneEnabled(false);
      setIsFoulSpeaking(false);
      setFoulSpeakTimeLeft(0);
      cleanup();
    }, FOULS.FOUL_SPEAK_DURATION_MS);
  }, [room, canUseFoulSpeak, isFoulSpeaking, cleanup]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // When disabled mid-foul-speak, stop it
  useEffect(() => {
    if (!canUseFoulSpeak && isFoulSpeaking) {
      cleanup();
      setIsFoulSpeaking(false);
      setFoulSpeakTimeLeft(0);
      // Re-mute when disabled
      if (room) {
        void room.localParticipant.setMicrophoneEnabled(false);
      }
    }
  }, [canUseFoulSpeak, isFoulSpeaking, room, cleanup]);

  return {
    isFoulSpeaking,
    foulSpeakTimeLeft,
    startFoulSpeak,
    canFoulSpeak: canUseFoulSpeak && !isFoulSpeaking,
    canShowFoulSpeakButton: canUseFoulSpeak,
    currentFouls,
    canShowFoulButton,
  };
}
