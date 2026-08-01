"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * Manages fullscreen state for a given container element.
 * Falls back to `document.documentElement` when no ref is provided.
 */
export function useFullscreen<T extends HTMLElement = HTMLElement>(
  containerRef?: RefObject<T | null>,
) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fallbackRef = useRef<HTMLElement>(null);

  const getElement = useCallback((): HTMLElement | null => {
    if (containerRef?.current) return containerRef.current;
    if (typeof document !== "undefined") return document.documentElement;
    return fallbackRef.current;
  }, [containerRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const enterFullscreen = useCallback(async () => {
    const el = getElement();
    if (!el || document.fullscreenElement) return;
    try {
      await el.requestFullscreen();
    } catch {
      // Browser may block programmatic fullscreen
    }
  }, [getElement]);

  const exitFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // noop
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (isFullscreen) {
      void exitFullscreen();
    } else {
      void enterFullscreen();
    }
  }, [isFullscreen, enterFullscreen, exitFullscreen]);

  return { isFullscreen, toggleFullscreen, enterFullscreen, exitFullscreen };
}
