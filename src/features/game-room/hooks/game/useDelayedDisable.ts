"use client";

import { useEffect, useState } from "react";

/**
 * Returns true for `delayMs` after mount (and when `resetKey` changes),
 * then automatically flips to false.
 */
export function useDelayedDisable(
  delayMs: number,
  resetKey?: string | number | null,
): boolean {
  const [isDisabled, setIsDisabled] = useState(delayMs > 0);

  useEffect(() => {
    if (delayMs <= 0) {
      setIsDisabled(false);
      return;
    }

    setIsDisabled(true);
    const timer = setTimeout(() => {
      setIsDisabled(false);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs, resetKey]);

  return isDisabled;
}
