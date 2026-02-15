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

  // Determine box shadow based on speaking state (not for dead players)
  const boxShadowClass = useMemo(() => {
    if (isTargetDead) {
      return ""; // No glow for dead players
    }
    if (isParticipantFoulSpeaking) {
      // Red glow for foul speaking (visible to everyone)
      return "shadow-[0_0_20px_4px_rgba(239,68,68,0.7)]";
    }
    if (isSpeaking) {
      // Emerald glow for active speaker
      return "shadow-[0_0_20px_4px_rgba(16,185,129,0.7)]";
    }
    return "";
  }, [isParticipantFoulSpeaking, isSpeaking, isTargetDead]);

  return {
    isSpeaking,
    isParticipantFoulSpeaking,
    boxShadowClass,
  };
}
