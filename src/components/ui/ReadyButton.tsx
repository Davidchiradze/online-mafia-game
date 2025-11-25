"use client";

import { Loader } from "lucide-react";
import React, { useMemo } from "react";

type ReadyButtonProps = {
  isReady: boolean;
  onReady: () => void | Promise<void>;
  onUnready: () => void | Promise<void>;
  className?: string;
  labelReady?: string; // when not ready (action to become ready)
  labelUnready?: string; // when ready (action to unready)
  disabled?: boolean;
};

export default function ReadyButton({
  isReady,
  onReady,
  onUnready,
  className,
  labelReady = "Ready",
  labelUnready = "Not Ready",
  disabled = false,
}: ReadyButtonProps) {
  const content = useMemo(() => {
    if (disabled) return <Loader className="animate-spin h-5 w-5" />;
    return isReady ? labelUnready : labelReady;
  }, [isReady, labelUnready, labelReady, disabled]);
  return (
    <button
      type="button"
      onClick={() => (isReady ? onUnready() : onReady())}
      disabled={disabled}
      className={
        (disabled ? "opacity-50 cursor-not-allowed" : "") +
        (className || "") +
        "rounded-md px-4 py-2 text-sm font-medium shadow-lg border border-white/10 transition whitespace-nowrap " +
        (isReady
          ? "bg-gray-600 hover:bg-gray-500 text-white"
          : "bg-emerald-600 hover:bg-emerald-500 text-white")
      }
    >
      {content}
    </button>
  );
}
