"use client";

import { useMemo } from "react";
import type { GameSessionState } from "@/types/game/type";
import type { Tables } from "@/db/supabase/database.types";
import { SPEAKING_STATE } from "@/lib/constants/game";

/**
 * Hook that determines speaking state for UI purposes.
 *
 * NOTE: This hook NO LONGER controls muting/unmuting. All muting is now
 * handled server-side via LiveKit's mutePublishedTrack API in server actions.
 *
 * This hook is kept for UI purposes:
 * - Show speaking indicators
 * - Display correct UI states
 * - Know when local player should be speaking
 *
 * @param gameSessionState - The current game session state from database
 * @param players - Array of game players (to find current user's seat)
 * @param userId - The current user's ID
 * @param isHost - Whether the current user is the host
 * @returns Speaking state information for UI rendering
 */
export function useSpeakingState(
  gameSessionState: GameSessionState | null,
  players: Tables<"game_players">[],
  userId: string,
  isHost: boolean
): {
  shouldBeSpeaking: boolean;
  isSpeakingRoundActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  currentSpeakerSeat: number | null;
  mySeatNumber: number | null;
} {
  return useMemo(() => {
    // Find current user's seat number
    const myPlayer = players.find((p) => p.player_id === userId);
    const mySeatNumber = myPlayer?.seat_number ?? null;

    // Default state when no game session
    if (!gameSessionState) {
      return {
        shouldBeSpeaking: false,
        isSpeakingRoundActive: false,
        isPaused: false,
        isCompleted: false,
        currentSpeakerSeat: null,
        mySeatNumber,
      };
    }

    const speakingOrder = gameSessionState.speaking_order ?? [];
    const currentSpeakerIndex = gameSessionState.current_speaker_index ?? null;

    // Speaking round is active when:
    // - speaking_order has items AND
    // - current_speaker_index is a valid seat number (>= 1)
    const isSpeakingRoundActive =
      speakingOrder.length > 0 && SPEAKING_STATE.isActive(currentSpeakerIndex);

    // Paused state: negative seat number (not COMPLETED)
    const isPaused = SPEAKING_STATE.isPaused(currentSpeakerIndex);

    // Speaking round is completed when current_speaker_index is COMPLETED (-99)
    const isCompleted = SPEAKING_STATE.isCompleted(currentSpeakerIndex);

    // Determine if local player should be speaking
    const shouldBeSpeaking =
      !isHost &&
      isSpeakingRoundActive &&
      currentSpeakerIndex === mySeatNumber;

    return {
      shouldBeSpeaking,
      isSpeakingRoundActive,
      isPaused,
      isCompleted,
      currentSpeakerSeat: SPEAKING_STATE.isActive(currentSpeakerIndex)
        ? currentSpeakerIndex
        : null,
      mySeatNumber,
    };
  }, [gameSessionState, players, userId, isHost]);
}

/**
 * @deprecated Use useSpeakingState instead. This hook no longer controls muting.
 * Muting is now handled server-side via LiveKit's mutePublishedTrack API.
 *
 * This function is kept for backwards compatibility but does nothing.
 */
export function useSpeakingAutoMute(
  _room: unknown,
  _gameSessionState: GameSessionState | null,
  _players: Tables<"game_players">[],
  _userId: string,
  _isHost: boolean,
  _enabled: boolean = true
): void {
  // No-op: Muting is now handled server-side
  // This function is kept for backwards compatibility during migration
}
