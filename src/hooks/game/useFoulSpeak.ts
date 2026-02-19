"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FOULS } from "@/lib/constants/game";
import { Tables } from "@/db/supabase/database.types";
import { startFoulSpeak, endFoulSpeak } from "@/lib/fouls/actions";

type UseFoulSpeakOptions = {
  gameId: string;
  player: Tables<"game_players">;
  isLocal: boolean;
  isFoulAllowedPhase: boolean;
  isSpeaking: boolean;
  isTargetHost: boolean;
  isViewerHost: boolean;
};

type UseFoulSpeakReturn = {
  isFoulSpeaking: boolean;
  foulSpeakTimeLeft: number;
  startFoulSpeakAction: () => Promise<void>;
  canFoulSpeak: boolean;
  canShowFoulSpeakButton: boolean;
  currentFouls: number;
  canShowFoulButton: boolean;
};

/**
 * Hook that manages all foul-related functionality:
 * - Foul speaking (5-second unmute via server-side control)
 * - Foul display UI
 * - Foul button visibility
 *
 * Server-side approach:
 * - Muting/unmuting is handled by server actions (startFoulSpeak, endFoulSpeak)
 * - Client tracks foul_speak_started_at from DB and calculates time remaining
 * - Client calls endFoulSpeak when time expires
 *
 * @param options - Configuration object
 * @returns Object with:
 *   - isFoulSpeaking: Whether the player is currently in foul speaking mode
 *   - foulSpeakTimeLeft: Seconds remaining in foul speaking mode
 *   - startFoulSpeakAction: Function to start foul speaking (calls server action)
 *   - canFoulSpeak: Whether the player can start foul speaking
 *   - currentFouls: Current number of fouls
 *   - canShowFoulButton: Whether to show the foul button (host only)
 */
export function useFoulSpeak({
  gameId,
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
    player.seat_number != null;

  // Foul speak - for non-speakers to speak for 5 seconds during foul-allowed phases
  // Only enabled for local player who is NOT the current speaker and NOT the host
  const canUseFoulSpeak =
    isLocal && isFoulAllowedPhase && !isSpeaking && !isTargetHost;

  // UI state derived from DB timestamp
  const foulSpeakStartedAt = player.foul_speak_started_at;
  const [foulSpeakTimeLeft, setFoulSpeakTimeLeft] = useState(0);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const hasEndedRef = useRef(false);

  // Calculate time remaining from DB timestamp
  useEffect(() => {
    // Clear any existing interval
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    if (!foulSpeakStartedAt) {
      setFoulSpeakTimeLeft(0);
      hasEndedRef.current = false;
      return;
    }

    const updateTimeLeft = () => {
      const startTime = new Date(foulSpeakStartedAt).getTime();
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, FOULS.FOUL_SPEAK_DURATION_MS - elapsed);
      const secondsLeft = Math.ceil(remaining / 1000);
      setFoulSpeakTimeLeft(secondsLeft);

      // Auto-end when time expires (only local player triggers server action)
      if (remaining <= 0 && isLocal && !hasEndedRef.current) {
        hasEndedRef.current = true;
        void endFoulSpeak(gameId);
      }
    };

    updateTimeLeft();
    countdownRef.current = setInterval(updateTimeLeft, 100);

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [foulSpeakStartedAt, gameId, isLocal]);

  const isFoulSpeaking = foulSpeakTimeLeft > 0;

  // Start foul speak via server action
  const startFoulSpeakAction = useCallback(async () => {
    if (!canUseFoulSpeak || isFoulSpeaking) return;
    hasEndedRef.current = false;
    await startFoulSpeak(gameId);
  }, [gameId, canUseFoulSpeak, isFoulSpeaking]);

  // Force end foul speak when conditions change (e.g., becomes the speaker, phase changes)
  useEffect(() => {
    if (!canUseFoulSpeak && isFoulSpeaking && isLocal && !hasEndedRef.current) {
      hasEndedRef.current = true;
      void endFoulSpeak(gameId);
    }
  }, [canUseFoulSpeak, isFoulSpeaking, gameId, isLocal]);

  return {
    isFoulSpeaking,
    foulSpeakTimeLeft,
    startFoulSpeakAction,
    canFoulSpeak: canUseFoulSpeak && !isFoulSpeaking,
    canShowFoulSpeakButton: canUseFoulSpeak,
    currentFouls,
    canShowFoulButton,
  };
}
