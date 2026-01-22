"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface MobileReadyResult {
  isMobileReadyVisible: boolean;
  handleTileClick: () => void;
}

/**
 * Hook to manage mobile ready button visibility on tile tap.
 */
export function useMobileReady(
  isLocal: boolean,
  isTargetHost: boolean
): MobileReadyResult {
  const [isMobileReadyVisible, setIsMobileReadyVisible] =
    useState<boolean>(false);
  const mobileReadyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTileClick = useCallback(() => {
    // Only applicable for the local participant who isn't the host
    if (!isLocal || isTargetHost) return;
    // Show Ready button briefly on mobile/tap interactions
    setIsMobileReadyVisible(true);
    if (mobileReadyTimeoutRef.current)
      clearTimeout(mobileReadyTimeoutRef.current);
    mobileReadyTimeoutRef.current = setTimeout(() => {
      setIsMobileReadyVisible(false);
    }, 3000);
  }, [isLocal, isTargetHost]);

  useEffect(() => {
    return () => {
      if (mobileReadyTimeoutRef.current)
        clearTimeout(mobileReadyTimeoutRef.current);
    };
  }, []);

  return {
    isMobileReadyVisible,
    handleTileClick,
  };
}

