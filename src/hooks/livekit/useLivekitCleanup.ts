"use client";

import { useEffect, useRef } from "react";
import { Room as LiveKitRoom, RoomEvent, ConnectionState } from "livekit-client";

type CleanupFn = () => Promise<void> | void;

/**
 * Calls `onCleanup` and disconnects the LiveKit room when the component
 * unmounts, or when the browser tab is closed / refreshed.
 *
 * Tracks whether the room was ever connected (via hasConnectedRef) to
 * distinguish between spurious React remounts (never connected → skip cleanup)
 * and real navigation away (was connected → always clean up, even if already
 * disconnected by the time the effect teardown runs).
 */
export function useLivekitCleanup(room: LiveKitRoom, onCleanup: CleanupFn) {
  const onCleanupRef = useRef<CleanupFn>(onCleanup);
  const hasConnectedRef = useRef(false);

  // Keep the ref current so stale closures are never called
  useEffect(() => {
    onCleanupRef.current = onCleanup;
  }, [onCleanup]);

  // Track whether we ever successfully connected
  useEffect(() => {
    const handleConnected = () => {
      hasConnectedRef.current = true;
    };

    room.on(RoomEvent.Connected, handleConnected);

    // Also catch the case where the room is already connected when this runs
    if (room.state === ConnectionState.Connected) {
      hasConnectedRef.current = true;
    }

    return () => {
      room.off(RoomEvent.Connected, handleConnected);
    };
  }, [room]);

  // Unmount cleanup (React navigation, soft route changes)
  // Only runs if we ever connected, so spurious remounts are ignored
  useEffect(() => {
    return () => {
      if (hasConnectedRef.current) {
        void onCleanupRef.current();
        room.disconnect();
      }
    };
  }, [room]);

  // Hard-leave cleanup (tab close, page refresh, browser back)
  // Note: async work is not guaranteed to complete in beforeunload,
  // so we synchronously disconnect the WebRTC transport so LiveKit's
  // server detects the drop quickly. The Convex mutation is attempted
  // best-effort.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasConnectedRef.current) {
        void onCleanupRef.current();
        room.disconnect();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room]);
}
