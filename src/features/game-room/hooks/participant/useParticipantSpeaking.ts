"use client";

import { useMemo } from "react";
import type { useGameRoom } from "@/features/game-room/context/gameRoomContext";

type GameSessionState = NonNullable<ReturnType<typeof useGameRoom>["gameSessionState"]>;

export interface ParticipantSpeakingResult {
  isSpeaking: boolean;
  /**
   * True when it is this player's turn but they are muted this round (Sports
   * 3rd-foul speaking ban). They stay in the order as a visible-but-inactive
   * stop; the host clicks Next past them. No speech countdown runs.
   */
  isMutedTurn: boolean;
  isParticipantFoulSpeaking: boolean;
  /**
   * Border treatment for the tile. Always a `border-2` so the box never
   * reflows — only the look changes: a steady emerald border + glow for the
   * active speaker, an amber dashed one for a muted turn, a red one for foul
   * speaking, transparent otherwise (see `.speaker-active` / `.speaker-muted`
   * / `.speaker-foul` in globals.css).
   */
  speakerBorderClass: string;
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
  isTargetDead: boolean,
  isSpeakingBanned: boolean = false
): ParticipantSpeakingResult {
  // Speaking state - check if this player is the current speaker
  const isSpeaking = useMemo(() => {
    if (!gameSessionState) return false;
    const currentSpeakerSeat = gameSessionState.currentSpeakerIndex;
    return currentSpeakerSeat != null && seatNumber === currentSpeakerSeat;
  }, [gameSessionState, seatNumber]);

  // It's this player's turn, but they're muted this round (3rd-foul ban). They
  // are highlighted as the current stop but cannot legitimately speak.
  const isMutedTurn = isSpeaking && isSpeakingBanned;

  // Detect if this participant is foul speaking (mic on but not the legitimate
  // active speaker). Only during phases where foul speaking is allowed (not
  // night). Visible to ALL players since LiveKit syncs mic state to everyone.
  // Dead players cannot foul speak. A muted-turn player IS foul-speaking if
  // they break the mic lock — hence `(!isSpeaking || isMutedTurn)`.
  const isParticipantFoulSpeaking =
    isFoulAllowedPhase &&
    isMicEnabled &&
    (!isSpeaking || isMutedTurn) &&
    !isTargetHost &&
    !isTargetDead &&
    !!gameSessionState;

  const speakerBorderClass = useMemo(() => {
    if (isTargetDead) return "border-2 border-transparent";
    if (isParticipantFoulSpeaking) return "speaker-foul";
    if (isMutedTurn) return "speaker-muted";
    if (isSpeaking) return "speaker-active";
    return "border-2 border-transparent";
  }, [isParticipantFoulSpeaking, isMutedTurn, isSpeaking, isTargetDead]);

  return {
    isSpeaking,
    isMutedTurn,
    isParticipantFoulSpeaking,
    speakerBorderClass,
  };
}
