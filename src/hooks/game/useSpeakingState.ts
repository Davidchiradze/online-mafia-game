"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  DAY_PHASE_SPEAKING,
  NOMINATED_PLAYERS_SPEAKING,
  FAREWELL_SPEECH,
} from "@/lib/constants/game";
import { calculateRemainingTime } from "@/lib/game/speakingOrder";

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
 * Play a "time's up" bell sound.
 */
function playTimeUpSound(): void {
  try {
    const audio = new Audio("/audio/bell-sound.mp3");
    audio.volume = 0.5;
    void audio.play();
  } catch {
    // Audio not supported or blocked - fail silently
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
  gamePhase?: string | null
): number {
  const [progress, setProgress] = useState(0);
  const hasPlayedSoundRef = useRef(false);

  // Reset sound flag when speaker changes
  useEffect(() => {
    hasPlayedSoundRef.current = false;
  }, [speakerStartedAt]);

  const handleTimeUp = useCallback(() => {
    if (!hasPlayedSoundRef.current) {
      hasPlayedSoundRef.current = true;
      playTimeUpSound();
    }
  }, []);

  useEffect(() => {
    if (!isActive || !speakerStartedAt) {
      setProgress(0);
      return;
    }

    const duration = getSpeakingDuration(gamePhase);

    const updateProgress = () => {
      const remaining = calculateRemainingTime(speakerStartedAt, duration);
      const elapsed = duration - remaining;
      const pct = (elapsed / duration) * 100;
      const clampedPct = Math.min(100, Math.max(0, pct));
      setProgress(clampedPct);

      // Play sound when time is up
      if (clampedPct >= 100) {
        handleTimeUp();
      }
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [isActive, speakerStartedAt, gamePhase, handleTimeUp]);

  return progress;
}

