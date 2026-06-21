"use client";

import usePresence from "@convex-dev/presence/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { PRESENCE } from "@convex/lib/constants";

/**
 * Site-wide presence heartbeat. Being authenticated and on ANY page counts as
 * "online" — everyone joins one shared room (`PRESENCE.GLOBAL_ROOM`). The
 * `usePresence` hook sends a 60s heartbeat and a graceful disconnect on tab
 * close; the server marks a session offline after ~2.5x the interval of
 * silence. Admins read the live count via `api.presence.onlineNow`.
 *
 * Mounted once in the root layout. We only render the heartbeat once we have a
 * profile, because the heartbeat mutation derives identity from it — hooks
 * can't be called conditionally, so the gate lives in this outer component.
 */
export default function PresenceBootstrap() {
  const profile = useQuery(api.auth.profiles.currentProfile);
  if (!profile) return null;
  return <PresenceHeartbeat userId={profile._id} />;
}

function PresenceHeartbeat({ userId }: { userId: string }) {
  usePresence(
    api.presence,
    PRESENCE.GLOBAL_ROOM,
    userId,
    PRESENCE.HEARTBEAT_INTERVAL_MS,
  );
  return null;
}
