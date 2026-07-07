"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Microphone permission state.
 * - `unknown`   — not yet determined (SSR / initial mount / Permissions API unavailable)
 * - `prompt`    — user hasn't decided; a getUserMedia call will show the browser prompt
 * - `granted`   — user allowed the mic; LiveKit can enable it silently
 * - `denied`    — user blocked the mic; CANNOT be re-prompted, user must unblock in browser settings
 */
export type MicPermissionState = "unknown" | "prompt" | "granted" | "denied";

/**
 * Tracks and warms up the browser microphone permission.
 *
 * Why this exists: LiveKit only asks for the mic lazily, the first time
 * `setMicrophoneEnabled(true)` runs — which is the moment the player's turn
 * starts. If the prompt is missed or blocked then, they lose their speaking
 * slot with no recovery path. This hook lets us request permission ahead of
 * time (on a user gesture) and detect a `denied` state so we can guide the
 * user to fix it.
 *
 * Browsers do not allow forcing/auto-accepting the prompt; once `denied`, only
 * the user can unblock it via site settings.
 */
export function useMicPermission() {
  const [state, setState] = useState<MicPermissionState>("unknown");
  const [isRequesting, setIsRequesting] = useState(false);
  // Keep a ref so the Permissions API onchange listener never overwrites a
  // freshly-granted state with a stale value during teardown.
  const stateRef = useRef<MicPermissionState>("unknown");

  const update = useCallback((next: MicPermissionState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  // Observe the browser's permission state where supported (Chromium, recent
  // Firefox/Safari). Firefox support is partial, so getUserMedia below remains
  // the source of truth.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      // No Permissions API — assume we can prompt and let requestAccess decide.
      update("prompt");
      return;
    }

    let status: PermissionStatus | null = null;
    let cancelled = false;

    const onChange = () => {
      if (status) update(status.state as MicPermissionState);
    };

    navigator.permissions
      // `microphone` isn't in the TS PermissionName union in all lib versions.
      .query({ name: "microphone" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        status = result;
        update(result.state as MicPermissionState);
        result.addEventListener("change", onChange);
      })
      .catch(() => {
        // Query rejected (unsupported name) — fall back to prompt.
        if (!cancelled) update("prompt");
      });

    return () => {
      cancelled = true;
      if (status) status.removeEventListener("change", onChange);
    };
  }, [update]);

  /**
   * Triggers the native permission prompt (must be called from a user gesture).
   * Immediately releases the captured track — we only want the permission
   * grant, LiveKit will open its own track when it's the player's turn.
   */
  const requestAccess = useCallback(async (): Promise<MicPermissionState> => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      update("denied");
      return "denied";
    }

    setIsRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need the stream — releasing it stops the mic indicator.
      stream.getTracks().forEach((track) => track.stop());
      update("granted");
      return "granted";
    } catch (err) {
      // NotAllowedError (blocked/dismissed) or SecurityError → denied.
      // NotFoundError (no device) also lands here; treated as denied so the
      // user is prompted to check their hardware.
      const name = err instanceof Error ? err.name : "";
      const denied = name === "NotAllowedError" || name === "SecurityError";
      update(denied ? "denied" : "prompt");
      return denied ? "denied" : "prompt";
    } finally {
      setIsRequesting(false);
    }
  }, [update]);

  return { state, isRequesting, requestAccess };
}
