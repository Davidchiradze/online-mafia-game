"use client";

import { Check, X } from "lucide-react";
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

const readyStyle = {
  bg: "linear-gradient(135deg, #475569 0%, #334155 100%)",
  border: "rgba(148,163,184,0.55)",
  shadow: "0 0 16px rgba(100,116,139,0.35)",
};

const notReadyStyle = {
  bg: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  border: "rgba(52,211,153,0.6)",
  shadow: "0 0 16px rgba(52,211,153,0.35)",
};

/**
 * Ready / Cancel toggle for players in the lobby.
 * Matches the game's PhaseButton aesthetic: gradient fill, colored glow,
 * Orbitron font, 2px border.
 */
export default function ReadyButton({
  isReady,
  onReady,
  onUnready,
  className = "",
  labelReady = "Ready",
  labelUnready = "Cancel",
  disabled = false,
}: ReadyButtonProps) {
  const style = isReady ? readyStyle : notReadyStyle;

  const content = useMemo(() => {
    if (disabled) {
      return (
        <span className="w-3.5 h-3.5 md:w-4 md:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
      );
    }
    return (
      <>
        {isReady ? (
          <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
        ) : (
          <Check className="h-3 w-3 md:h-3.5 md:w-3.5" />
        )}
        <span>{isReady ? labelUnready : labelReady}</span>
      </>
    );
  }, [isReady, labelUnready, labelReady, disabled]);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (isReady) {
          void onUnready();
        } else {
          void onReady();
        }
      }}
      disabled={disabled}
      className={`
        ${className}
        gap-1 md:gap-1.5
        px-3 py-1.5 md:px-4 md:py-2
        text-xs md:text-sm text-white
        rounded-xl border-2
        whitespace-nowrap
        transition duration-200
        active:scale-95
        disabled:cursor-not-allowed disabled:opacity-60
      `}
      style={{
        background: style.bg,
        borderColor: style.border,
        boxShadow: style.shadow,
        fontFamily: "var(--font-orbitron), sans-serif",
        fontWeight: 700,
      }}
    >
      {content}
    </button>
  );
}
