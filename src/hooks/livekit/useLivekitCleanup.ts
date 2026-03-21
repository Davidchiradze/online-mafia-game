"use client";

import { useEffect, useRef } from "react";
import { Room as LiveKitRoom } from "livekit-client";

type CleanupFn = () => Promise<void> | void;

/**
 * Calls `onCleanup` and disconnects the LiveKit room when the component
 * unmounts, or when the browser tab is closed / refreshed.
 *
 * A ref is used so the cleanup always sees the latest version of `onCleanup`
 * without needing it as an effect dependency (avoids spurious re-runs).
 */
export function useLivekitCleanup(room: LiveKitRoom, onCleanup: CleanupFn) {
  const onCleanupRef = useRef<CleanupFn>(onCleanup);

  // Keep the ref current so stale closures are never called
  useEffect(() => {
    onCleanupRef.current = onCleanup;
  }, [onCleanup]);

  // Unmount cleanup (React navigation, soft route changes)
  useEffect(() => {
    return () => {
      void onCleanupRef.current();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hard-leave cleanup (tab close, page refresh, browser back)
  // Note: async work is not guaranteed to complete in beforeunload,
  // so we synchronously disconnect the WebRTC transport so LiveKit's
  // server detects the drop quickly. The Convex mutation is attempted
  // best-effort.
  useEffect(() => {
    const handleBeforeUnload = () => {
      void onCleanupRef.current();
      // Synchronous disconnect so the browser closes the WebRTC tracks
      // before the page is torn down.
      room.disconnect();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [room]);
}
