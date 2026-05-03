"use client";

import React, { useState, useEffect } from "react";

type PhaseButtonVariant =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "secondary";

type PhaseButtonProps = {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  label?: string;
  variant?: PhaseButtonVariant;
  /** Native HTML title attribute — used for tooltip text on disabled state. */
  title?: string;
};

const variantStyles: Record<
  PhaseButtonVariant,
  { bg: string; border: string; shadow: string; hoverShadow: string }
> = {
  primary: {
    bg: "linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(37,99,235,0.35) 100%)",
    border: "rgba(59,130,246,0.5)",
    shadow: "0 0 20px rgba(59,130,246,0.3)",
    hoverShadow: "0 0 30px rgba(59,130,246,0.5)",
  },
  success: {
    bg: "linear-gradient(135deg, rgba(52,211,153,0.3) 0%, rgba(16,185,129,0.35) 100%)",
    border: "rgba(52,211,153,0.5)",
    shadow: "0 0 20px rgba(52,211,153,0.3)",
    hoverShadow: "0 0 30px rgba(52,211,153,0.5)",
  },
  warning: {
    bg: "linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(217,119,6,0.35) 100%)",
    border: "rgba(245,158,11,0.5)",
    shadow: "0 0 20px rgba(245,158,11,0.3)",
    hoverShadow: "0 0 30px rgba(245,158,11,0.5)",
  },
  danger: {
    bg: "linear-gradient(135deg, rgba(220,38,38,0.3) 0%, rgba(185,28,28,0.35) 100%)",
    border: "rgba(220,38,38,0.5)",
    shadow: "0 0 20px rgba(220,38,38,0.3)",
    hoverShadow: "0 0 30px rgba(220,38,38,0.5)",
  },
  secondary: {
    bg: "linear-gradient(135deg, rgba(100,116,139,0.3) 0%, rgba(71,85,105,0.35) 100%)",
    border: "rgba(100,116,139,0.5)",
    shadow: "0 0 20px rgba(100,116,139,0.3)",
    hoverShadow: "0 0 30px rgba(100,116,139,0.5)",
  },
};

/**
 * Unified phase action button with gradient background, glow effect, and inline spinner.
 */
const MOUNT_DELAY_MS = 1000;

export default function PhaseButton({
  onClick,
  isLoading,
  disabled = false,
  label = "Finish",
  variant = "primary",
  title,
}: PhaseButtonProps) {
  const [isMountDisabled, setIsMountDisabled] = useState(true);
  const style = variantStyles[variant];

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMountDisabled(false);
    }, MOUNT_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return (
    <button
      type="button"
      disabled={isLoading || disabled || isMountDisabled}
      onClick={onClick}
      title={title}
      className="w-full px-6 py-3 rounded-xl cursor-pointer text-[0.85rem] text-white border-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 [@media(max-height:900px)]:px-5 [@media(max-height:900px)]:py-2.5 [@media(max-height:900px)]:text-[0.8rem] [@media(max-height:760px)]:px-4 [@media(max-height:760px)]:py-2 [@media(max-height:760px)]:text-xs"
      style={{
        background: style.bg,
        borderColor: style.border,
        boxShadow: style.shadow,
        fontFamily: "var(--font-orbitron), sans-serif",
        fontWeight: 700,
      }}
      onMouseEnter={(e) => {
        if (!isLoading && !disabled) {
          e.currentTarget.style.boxShadow = style.hoverShadow;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = style.shadow;
      }}
    >
      {isLoading && (
        <span className="w-4 h-4 [@media(max-height:760px)]:w-3.5 [@media(max-height:760px)]:h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}
