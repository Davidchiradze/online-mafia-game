"use client";

import { useEffect, useRef, useState } from "react";

const NOTIFICATION_DURATION_MS = 2000;

/**
 * Detects when a player's foul count increases and returns a temporary
 * boolean flag to show a flash notification. Skips the initial render
 * so reconnects/page loads don't trigger a false notification.
 */
export function useFoulNotification(foulCount: number): boolean {
  const [showNotification, setShowNotification] = useState(false);
  const prevFoulsRef = useRef(foulCount);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      prevFoulsRef.current = foulCount;
      return;
    }

    if (foulCount > prevFoulsRef.current) {
      setShowNotification(true);
      const timer = setTimeout(
        () => setShowNotification(false),
        NOTIFICATION_DURATION_MS,
      );
      prevFoulsRef.current = foulCount;
      return () => clearTimeout(timer);
    }

    prevFoulsRef.current = foulCount;
  }, [foulCount]);

  return showNotification;
}
