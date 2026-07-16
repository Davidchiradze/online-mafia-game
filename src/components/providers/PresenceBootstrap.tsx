"use client";

import { useEffect, useRef } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PRESENCE } from "@convex/lib/constants";

/**
 * Site-wide presence heartbeat. Being authenticated and on ANY page counts as
 * "online" — everyone joins one shared room (`PRESENCE.GLOBAL_ROOM`). We send a
 * 60s heartbeat and a graceful disconnect on tab close; the server marks a
 * session offline after ~2.5x the interval of silence. Admins read the live
 * count via `api.presence.onlineNow`; the community chat sidebar via
 * `api.community.messages.onlineInCommunity` (both `listRoom`-based).
 *
 * WHY NOT `usePresence` FROM `@convex-dev/presence/react`:
 * that hook welds the heartbeat to a live `useQuery(presence.list)`
 * subscription. Mounted site-wide for every user, that subscription re-ran on
 * every presence change in the single global room — millions of function calls
 * for a list NOTHING in the app renders (the online panels use `listRoom`, not
 * `list`). So we keep only the write side here and never subscribe to `list`.
 *
 * Mounted once in the root layout. We only heartbeat once we have a profile,
 * because the heartbeat mutation derives identity from it — hooks can't be
 * called conditionally, so the gate lives in this outer component.
 */
export default function PresenceBootstrap() {
  const profile = useQuery(api.auth.profiles.currentProfile);
  if (!profile) return null;
  return <PresenceHeartbeat userId={profile._id} />;
}

function PresenceHeartbeat({ userId }: { userId: string }) {
  const convex = useConvex();
  const heartbeat = useMutation(api.presence.heartbeat);
  const disconnect = useMutation(api.presence.disconnect);
  // The disconnect token from the latest heartbeat, read by unload/cleanup.
  const sessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    // One session identity per mount; regenerated if the user changes.
    const sessionId = crypto.randomUUID();
    let alive = true;
    let inFlight = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const beat = async () => {
      if (inFlight) return; // heartbeats are idempotent; just skip overlaps
      inFlight = true;
      try {
        const { sessionToken } = await heartbeat({
          roomId: PRESENCE.GLOBAL_ROOM,
          userId,
          sessionId,
          interval: PRESENCE.HEARTBEAT_INTERVAL_MS,
        });
        if (alive) sessionTokenRef.current = sessionToken;
      } finally {
        inFlight = false;
      }
    };

    const start = () => {
      void beat();
      timer = setInterval(() => void beat(), PRESENCE.HEARTBEAT_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    start();

    // Prompt cleanup on tab close (no JWT is available during unload, so the
    // unguessable sessionToken authorizes removing exactly this session).
    const handleUnload = () => {
      if (!sessionTokenRef.current) return;
      navigator.sendBeacon(
        `${convex.url}/api/mutation`,
        new Blob(
          [
            JSON.stringify({
              path: "presence:disconnect",
              args: { sessionToken: sessionTokenRef.current },
            }),
          ],
          { type: "application/json" },
        ),
      );
    };

    // Pause heartbeats while the tab is hidden, resume when visible again.
    const handleVisibility = () => {
      if (document.hidden) {
        stop();
        if (sessionTokenRef.current) {
          void disconnect({ sessionToken: sessionTokenRef.current });
        }
      } else {
        stop();
        start();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      alive = false;
      stop();
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (sessionTokenRef.current) {
        void disconnect({ sessionToken: sessionTokenRef.current });
      }
    };
  }, [userId, heartbeat, disconnect, convex.url]);

  return null;
}
