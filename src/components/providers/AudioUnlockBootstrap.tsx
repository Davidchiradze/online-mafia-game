"use client";

import { useEffect } from "react";
import { initAudioUnlock } from "@/lib/audio/audioUnlock";

/**
 * Registers the iOS Safari audio-unlock listeners on app load. Renders
 * nothing. See `src/lib/audio/audioUnlock.ts` for the why.
 */
export default function AudioUnlockBootstrap() {
  useEffect(() => {
    initAudioUnlock();
  }, []);

  return null;
}
