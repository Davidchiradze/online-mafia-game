"use client";

import { useEffect, useState } from "react";
import { useServerTime } from "@/shared/lib/time/serverTime";

export type Countdown = {
  /** Whole seconds remaining, clamped to >= 0. */
  secondsLeft: number;
  /** Milliseconds remaining, clamped to >= 0. */
  msLeft: number;
  /** True once the countdown has reached (or passed) zero. */
  isExpired: boolean;
};

/**
 * Server-corrected countdown from an absolute start timestamp.
 *
 * Given a server-issued `startMs` (ms epoch) and a `durationMs`, returns the
 * remaining time, ticking every `intervalMs`. Uses `useServerTime()` so the
 * countdown is immune to a wrong device clock (see `/docs/server-time.md`).
 *
 * Pass `startMs = null | undefined` to disable the countdown (returns 0 / expired).
 */
export function useCountdown(
  startMs: number | null | undefined,
  durationMs: number,
  intervalMs: number = 250,
): Countdown {
  const getServerTime = useServerTime();
  const [msLeft, setMsLeft] = useState(() =>
    startMs == null ? 0 : Math.max(0, durationMs - (getServerTime() - startMs)),
  );

  useEffect(() => {
    if (startMs == null) {
      setMsLeft(0);
      return;
    }

    const tick = () => {
      setMsLeft(Math.max(0, durationMs - (getServerTime() - startMs)));
    };

    tick();
    const interval = setInterval(tick, intervalMs);
    return () => clearInterval(interval);
  }, [startMs, durationMs, intervalMs, getServerTime]);

  return {
    msLeft,
    secondsLeft: Math.ceil(msLeft / 1000),
    isExpired: startMs != null && msLeft <= 0,
  };
}
