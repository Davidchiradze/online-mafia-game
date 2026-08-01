"use client";

import { useEffect, useState, useRef } from "react";
import {
  DAY_PHASE_SPEAKING,
  NOMINATED_PLAYERS_SPEAKING,
  FAREWELL_SPEECH,
} from "@/shared/lib/constants/game";
import { calculateRemainingTime } from "@/shared/lib/game/speakingOrder";
import { playSound } from "@/shared/lib/audio/audioUnlock";
import { useServerTime } from "@/shared/lib/time/serverTime";

/**
 * Get the speaking duration based on game phase.
 */
function getSpeakingDuration(gamePhase: string | null | undefined): number {
  switch (gamePhase) {
    case "nominated_players_speak":
      return NOMINATED_PLAYERS_SPEAKING.MAX_SPEAKING_TIME_MS;
    case "farewell_speech":
      return FAREWELL_SPEECH.MAX_SPEAKING_TIME_MS;
    case "day_phase":
    case "introduction_phase":
    default:
      return DAY_PHASE_SPEAKING.MAX_SPEAKING_TIME_MS;
  }
}

/**
 * How long before the end the countdown sound should start, by phase.
 * Each countdown clip already ends with the "time's up" gong, so the lead
 * time matches the clip length:
 *
 * - Self-justification (30s) uses the 5-second clip, started with 5s left.
 * - Longer speeches (60s) use the 10-second clip, started with 10s left.
 */
function getCountdownLeadMs(gamePhase: string | null | undefined): number {
  switch (gamePhase) {
    case "nominated_players_speak":
      return 5 * 1000;
    default:
      return 10 * 1000;
  }
}

/**
 * The countdown clip to play, by phase. Each clip ends with the "time's up"
 * gong, so no separate bell is needed.
 */
function getCountdownSoundSrc(gamePhase: string | null | undefined): string {
  switch (gamePhase) {
    case "nominated_players_speak":
      return "/audio/five-seconds-sound.m4a";
    default:
      return "/audio/ten-second-sound.mp3";
  }
}

/**
 * Hook to track speaking timer progress.
 * Used by ParticipantComponent to show progress bar on active speaker.
 * Plays a sound when time is up.
 */
export function useSpeakingProgress(
  speakerStartedAt: string | null | undefined,
  isActive: boolean,
  gamePhase?: string | null,
  /**
   * Overrides the phase's default length for this speaker only — used by the
   * Sports final-day carve-out, where a 3rd-foul-banned player gets a 30s day
   * speech instead of the phase's 60s (docs/sports-mafia.md §4.2).
   */
  durationOverrideMs?: number | null,
): number {
  const [progress, setProgress] = useState(0);
  const hasPlayedCountdownRef = useRef(false);
  const countdownAudioRef = useRef<HTMLAudioElement | null>(null);
  const getServerTime = useServerTime();

  // Reset the countdown flag (and stop any countdown audio) when speaker changes
  useEffect(() => {
    hasPlayedCountdownRef.current = false;
    if (countdownAudioRef.current) {
      countdownAudioRef.current.pause();
      countdownAudioRef.current = null;
    }
  }, [speakerStartedAt]);

  useEffect(() => {
    if (!isActive || !speakerStartedAt) {
      setProgress(0);
      // Stop the countdown clip if speaking is paused/stopped mid-window.
      if (countdownAudioRef.current) {
        countdownAudioRef.current.pause();
        countdownAudioRef.current = null;
      }
      return;
    }

    const duration = durationOverrideMs ?? getSpeakingDuration(gamePhase);
    const countdownLead = getCountdownLeadMs(gamePhase);

    const updateProgress = () => {
      const remaining = calculateRemainingTime(
        speakerStartedAt,
        duration,
        getServerTime(),
      );
      const elapsed = duration - remaining;
      const pct = (elapsed / duration) * 100;
      const clampedPct = Math.min(100, Math.max(0, pct));
      setProgress(clampedPct);

      // Start the end-of-speech countdown sound once we hit the lead window.
      if (
        !hasPlayedCountdownRef.current &&
        remaining > 0 &&
        remaining <= countdownLead
      ) {
        hasPlayedCountdownRef.current = true;
        countdownAudioRef.current = playSound(getCountdownSoundSrc(gamePhase));
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [
    isActive,
    speakerStartedAt,
    gamePhase,
    durationOverrideMs,
    getServerTime,
  ]);

  return progress;
}
