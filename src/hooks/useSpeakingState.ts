"use client";

import { useEffect, useState } from "react";
import { DAY_PHASE_SPEAKING } from "@/lib/constants/game";
import { calculateRemainingTime } from "@/lib/game/speakingOrder";
import type { GameSessionState } from "@/types/game/type";

/**
 * Hook to track speaking timer progress.
 * Used by ParticipantComponent to show progress bar on active speaker.
 */
export function useSpeakingProgress(
  speakerStartedAt: string | null | undefined,
  isActive: boolean
): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isActive || !speakerStartedAt) {
      setProgress(0);
      return;
    }

    const updateProgress = () => {
      const remaining = calculateRemainingTime(
        speakerStartedAt,
        DAY_PHASE_SPEAKING.MAX_SPEAKING_TIME_MS
      );
      const elapsed = DAY_PHASE_SPEAKING.MAX_SPEAKING_TIME_MS - remaining;
      const pct = (elapsed / DAY_PHASE_SPEAKING.MAX_SPEAKING_TIME_MS) * 100;
      setProgress(Math.min(100, Math.max(0, pct)));
    };

    updateProgress();
    const interval = setInterval(updateProgress, 100);
    return () => clearInterval(interval);
  }, [isActive, speakerStartedAt]);

  return progress;
}
