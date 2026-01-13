"use client";

import { useEffect, useRef } from "react";
import { Room as LiveKitRoom } from "livekit-client";
import type { GameSessionState } from "@/types/game/type";
import type { Tables } from "@/db/supabase/database.types";

/**
 * Hook that automatically mutes/unmutes the local participant's microphone
 * based on the game session state.
 *
 * Logic:
 * 1. In lobby (no game session): everyone can talk
 * 2. Game started but no active speaking round:
 *    - If in a free-talk phase (introduction_phase, day_phase) with completed speaking round (-1): can talk
 *    - Otherwise: muted by default
 * 3. Active speaking round (speaking_order.length > 0 && current_speaker_index >= 1):
 *    - If current_speaker_index === mySeatNumber → unmute
 *    - Otherwise → mute
 *
 * This approach is resilient to reconnections since the state comes from the database
 * (via Supabase Realtime) rather than LiveKit metadata.
 *
 * @param room - The LiveKit Room instance
 * @param gameSessionState - The current game session state from database
 * @param players - Array of game players (to find current user's seat)
 * @param userId - The current user's ID
 * @param isHost - Whether the current user is the host (hosts are never auto-muted)
 * @param enabled - Whether to enable this behavior (default: true)
 */
export function useSpeakingAutoMute(
  room: LiveKitRoom | null | undefined,
  gameSessionState: GameSessionState | null,
  players: Tables<"game_players">[],
  userId: string,
  isHost: boolean,
  enabled: boolean = true
) {
  // Track previous mute state to avoid redundant updates
  const prevShouldMuteRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!room || !enabled || isHost) return;

    // Find current user's seat number
    const myPlayer = players.find((p) => p.player_id === userId);
    const mySeatNumber = myPlayer?.seat_number ?? null;

    // No game session yet (lobby) → everyone can talk
    if (!gameSessionState) {
      if (prevShouldMuteRef.current !== false) {
        prevShouldMuteRef.current = false;
        void room.localParticipant.setMicrophoneEnabled(true);
      }
      return;
    }

    // Can't determine seat after game started - stay muted for safety
    if (mySeatNumber === null) {
      if (prevShouldMuteRef.current !== true) {
        prevShouldMuteRef.current = true;
        void room.localParticipant.setMicrophoneEnabled(false);
      }
      return;
    }

    // Determine if there's an active speaking round
    const speakingOrder = gameSessionState.speaking_order ?? [];
    const currentSpeakerIndex = gameSessionState.current_speaker_index ?? null;
    const currentPhase = gameSessionState.game_phase;

    // Speaking round is active when:
    // - speaking_order has items AND
    // - current_speaker_index is a valid seat number (>= 1)
    const isSpeakingRoundActive =
      speakingOrder.length > 0 &&
      currentSpeakerIndex !== null &&
      currentSpeakerIndex >= 1;

    // Speaking round is completed when current_speaker_index is -1
    const isSpeakingRoundCompleted = currentSpeakerIndex === -1;

    let shouldMute: boolean;

    if (isSpeakingRoundActive) {
      // During speaking round: only current speaker is unmuted
      shouldMute = currentSpeakerIndex !== mySeatNumber;
    } else {
      // Game started but not in a speaking turn → muted by default
      shouldMute = true;
    }

    // Avoid redundant updates
    if (prevShouldMuteRef.current === shouldMute) return;
    prevShouldMuteRef.current = shouldMute;

    // Set microphone state
    void room.localParticipant.setMicrophoneEnabled(!shouldMute);
  }, [room, gameSessionState, players, userId, isHost, enabled]);
}
