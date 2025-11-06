"use client";

import React from "react";

type ReadyButtonProps = {
  isReady: boolean;
  onReady: () => void | Promise<void>;
  onUnready: () => void | Promise<void>;
  className?: string;
  labelReady?: string; // when not ready (action to become ready)
  labelUnready?: string; // when ready (action to unready)
};

export default function ReadyButton({
  isReady,
  onReady,
  onUnready,
  className,
  labelReady = "Ready",
  labelUnready = "Not Ready",
}: ReadyButtonProps) {
  return (
    <button
      type="button"
      onClick={() => (isReady ? onUnready() : onReady())}
      className={
        (className || "") +
        " rounded-md px-4 py-2 text-sm font-medium shadow-lg border border-white/10 transition whitespace-nowrap " +
        (isReady
          ? "bg-gray-600 hover:bg-gray-500 text-white"
          : "bg-emerald-600 hover:bg-emerald-500 text-white")
      }
    >
      {isReady ? labelUnready : labelReady}
    </button>
  );
}
