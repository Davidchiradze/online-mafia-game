"use client";

import { Loader, Check, X } from "lucide-react";
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
  className = "",
  labelReady = "Ready",
  labelUnready = "Cancel",
  disabled = false,
}: ReadyButtonProps) {
  const content = useMemo(() => {
    if (disabled)
      return <Loader className="animate-spin h-3.5 w-3.5 md:h-4 md:w-4" />;
    return (
      <span className="flex items-center gap-1 md:gap-1.5">
        {isReady ? (
          <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
        ) : (
          <Check className="h-3 w-3 md:h-3.5 md:w-3.5" />
        )}
        <span>{isReady ? labelUnready : labelReady}</span>
      </span>
    );
  }, [isReady, labelUnready, labelReady, disabled]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        isReady ? onUnready() : onReady();
      }}
      disabled={disabled}
      className={`
        ${className}
        ${disabled ? "opacity-60 cursor-not-allowed" : ""}
        px-2.5 py-1.5 md:px-3.5 md:py-2
        text-xs md:text-sm font-semibold
        rounded-lg
        whitespace-nowrap
        transition-all duration-200
        backdrop-blur-sm
        shadow-md
        ${
          isReady
            ? "bg-zinc-800/90 hover:bg-zinc-700/90 text-zinc-100 border-2 border-zinc-500/50 hover:border-zinc-400/60"
            : "bg-emerald-600/90 hover:bg-emerald-500/90 text-white border-2 border-emerald-400/50 hover:border-emerald-300/60"
        }
        ${!disabled && "active:scale-95"}
      `}
    >
      {content}
    </button>
  );
}
