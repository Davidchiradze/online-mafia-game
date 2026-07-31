/**
 * The Sports 3rd-foul speaking ban as it applies to ONE participant tile
 * (docs/sports-mafia.md §4.2). Pure derivation over context state — the rules
 * themselves live in `lib/game/speakingBan`; this hook only feeds them the
 * viewer's session, the corrected alive count, and this tile's player.
 *
 * Always `false` / `null` for Japanese, which never stamps
 * `foulSpeakingBanRound`.
 */

"use client";

import { useMemo } from "react";
import { useGameRoom } from "@/lib/context/gameRoomContext";
import { DAY_PHASE_SPEAKING } from "@/shared/lib/constants/game";
import {
  countAliveSeatedPlayers,
  hasShortenedFinalDaySpeech,
  isSeatMutedThisRound,
} from "@/shared/lib/game/speakingBan";

type ConvexGamePlayer = NonNullable<
  ReturnType<typeof useGameRoom>["players"]
>[number];

export interface ParticipantSpeakingBanResult {
  /**
   * This player is muted from their day speech this round. They stay in the
   * speaking order as a visible-but-inactive stop; the host clicks Next past
   * them. Scoped to `day_phase` — a killed player's farewell speech, a nominee's
   * self-justification and best move are never muted.
   */
  isSpeakingBanned: boolean;
  /**
   * Speech length override for the final-day carve-out: on the last day phase
   * (≤ 4 seated players alive) a banned player speaks anyway, for 30s instead of
   * 60s. `null` whenever the normal phase duration applies.
   */
  finalDaySpeechMs: number | null;
}

export function useParticipantSpeakingBan(
  player: ConvexGamePlayer,
): ParticipantSpeakingBanResult {
  const { gameSessionState, players, maxPlayers } = useGameRoom();

  return useMemo(() => {
    if (!gameSessionState) {
      return { isSpeakingBanned: false, finalDaySpeechMs: null };
    }

    // The host seat and seatless post-start joiners must not count toward the
    // ≤ 4 carve-out threshold — see `countAliveSeatedPlayers`.
    const args = [
      player,
      gameSessionState.currentNightNumber,
      countAliveSeatedPlayers(players, maxPlayers),
      gameSessionState.gamePhase,
    ] as const;

    return {
      isSpeakingBanned: isSeatMutedThisRound(...args),
      finalDaySpeechMs: hasShortenedFinalDaySpeech(...args)
        ? DAY_PHASE_SPEAKING.FINAL_DAY_BANNED_TIME_MS
        : null,
    };
  }, [gameSessionState, players, player, maxPlayers]);
}
