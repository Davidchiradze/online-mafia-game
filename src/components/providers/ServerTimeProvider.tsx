"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ServerTimeContext } from "@/lib/time/serverTime";

type Props = {
  /**
   * `Date.now()` captured in the Server Component that renders this
   * provider. Read from the Vercel Node runtime, so it reflects the
   * server's NTP-synced clock — not the user's (potentially wrong)
   * device clock.
   */
  initialServerTime: number;
  children: ReactNode;
};

/**
 * Measures the server-vs-device clock offset on first paint and exposes
 * it via `ServerTimeContext`. See `src/lib/time/serverTime.ts` for the
 * consumer hooks (`useServerTime`, `useServerTimeOffset`).
 *
 * The offset is captured on mount from the `initialServerTime` prop and
 * stays constant for the session — sufficient for timer math because
 * device clocks are typically *set* wrong (a static error), not
 * *running* wrong (drift). A full reload re-syncs via SSR.
 */
export default function ServerTimeProvider({
  initialServerTime,
  children,
}: Props) {
  const [serverTimeOffsetMs, setServerTimeOffsetMs] = useState(0);

  useEffect(() => {
    setServerTimeOffsetMs(initialServerTime - Date.now());
  }, [initialServerTime]);

  return (
    <ServerTimeContext.Provider value={{ serverTimeOffsetMs }}>
      {children}
    </ServerTimeContext.Provider>
  );
}
