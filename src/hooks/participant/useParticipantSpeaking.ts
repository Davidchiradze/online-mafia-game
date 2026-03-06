"use client";

import { useMemo } from "react";
import { GameSessionState } from "@/types/game/type";

export interface ParticipantSpeakingResult {
  isSpeaking: boolean;
  isParticipantFoulSpeaking: boolean;
  boxShadowClass: string;
}

/**
 * Hook to determine speaking state and visual effects for a participant.
 */
export function useParticipantSpeaking(
  gameSessionState: GameSessionState | null,
  seatNumber: number | null,
  isMicEnabled: boolean,
  isFoulAllowedPhase: boolean,
  isTargetHost: boolean,
  isTargetDead: boolean
): ParticipantSpeakingResult {
  // Speaking state - check if this player is the current speaker
  const isSpeaking = useMemo(() => {
    if (!gameSessionState) return false;
    const currentSpeakerSeat = gameSessionState.current_speaker_index;
    return currentSpeakerSeat != null && seatNumber === currentSpeakerSeat;
  }, [gameSessionState, seatNumber]);

  // Detect if this participant is foul speaking (mic on but not active speaker)
  // Only during phases where foul speaking is allowed (not during night phases)
  // This is visible to ALL players since LiveKit syncs mic state to everyone
  // Dead players cannot foul speak
  const isParticipantFoulSpeaking =
    isFoulAllowedPhase &&
    isMicEnabled &&
    !isSpeaking &&
    !isTargetHost &&
    !isTargetDead &&
    !!gameSessionState;

  const boxShadowClass = useMemo(() => {
    if (isTargetDead) return "";
    if (isParticipantFoulSpeaking) {
      return "shadow-[0_0_35px_rgba(220,38,38,0.8)]";
    }
    if (isSpeaking) {
      return "shadow-[0_0_30px_rgba(34,197,94,0.7)]";
    }
    return "";
  }, [isParticipantFoulSpeaking, isSpeaking, isTargetDead]);

  return {
    isSpeaking,
    isParticipantFoulSpeaking,
    boxShadowClass,
  };
}
