"use client";

import { useEffect, useState, useCallback, RefObject } from "react";

/**
 * Hook to manage fullscreen state for a container element.
 * Handles enter/exit fullscreen and listens for fullscreen change events.
 */
export function useFullscreen(containerRef: RefObject<HTMLDivElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const enterFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) return;
    try {
      await containerRef.current.requestFullscreen();
    } catch {
      // noop - fullscreen may not be supported
    }
  }, [containerRef]);

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

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  };
}

