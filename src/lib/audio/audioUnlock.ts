"use client";

/**
 * iOS Safari audio unlock.
 *
 * Why this exists
 * ---------------
 * iOS Safari blocks `HTMLAudioElement.play()` unless the call originates
 * from (or has been "unlocked" by) a user gesture. Our game sounds fire
 * from timers and reactive queries — never from a tap — so on iPhones the
 * countdown gong, time's-up bell, and join-request chime were all silently
 * dropped. Desktop/Android Chrome are more permissive and play them fine.
 *
 * The fix is to prime each sound once on the first user interaction: play
 * it muted inside the gesture handler, then immediately pause and reset.
 * After that the element is "blessed" and can be played programmatically
 * for the rest of the session.
 *
 * Usage
 * -----
 * Call `initAudioUnlock()` once on app load (see `AudioUnlockBootstrap`),
 * and play sounds via `playSound(src)` instead of `new Audio(src).play()`.
 */

// Every sound we ever play programmatically must be primed here, because
// the iOS unlock is per-element: a blessed element does not bless others.
const KNOWN_SOUNDS = [
  "/audio/ten-second-sound.mp3",
  "/audio/five-seconds-sound.m4a",
  "/audio/new-request-notification.mp3",
];

const cache = new Map<string, HTMLAudioElement>();
let unlocked = false;

function getAudio(src: string): HTMLAudioElement {
  let el = cache.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    cache.set(src, el);
  }
  return el;
}

function unlock() {
  if (unlocked) return;
  unlocked = true;

  for (const src of KNOWN_SOUNDS) {
    const el = getAudio(src);
    el.muted = true;
    el
      .play()
      .then(() => {
        el.pause();
        el.currentTime = 0;
        el.muted = false;
      })
      .catch(() => {
        // Priming failed (e.g. file missing) — leave it usable anyway.
        el.muted = false;
      });
  }

  window.removeEventListener("pointerdown", unlock);
  window.removeEventListener("touchend", unlock);
  window.removeEventListener("keydown", unlock);
}

/**
 * Register one-shot listeners that unlock all known sounds on the first
 * user gesture. Safe to call repeatedly; only the first call has effect.
 */
export function initAudioUnlock(): void {
  if (typeof window === "undefined" || unlocked) return;
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("touchend", unlock);
  window.addEventListener("keydown", unlock);
}

/**
 * Play a primed sound. Returns the element so callers can pause it (e.g.
 * to stop a countdown mid-clip). Reuses a single element per source so the
 * iOS unlock carries across plays. Fails silently if audio is unavailable.
 */
export function playSound(src: string, volume = 0.5): HTMLAudioElement | null {
  try {
    const el = getAudio(src);
    el.muted = false;
    el.volume = volume;
    el.currentTime = 0;
    void el.play();
    return el;
  } catch {
    return null;
  }
}
