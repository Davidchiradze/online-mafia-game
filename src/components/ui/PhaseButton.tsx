"use client";

import React from "react";

type PhaseButtonProps = {
  onClick: () => void;
  isLoading: boolean;
  disabled?: boolean;
  label?: string;
  variant?: "primary" | "secondary" | "danger";
};

/**
 * Unified phase action button with inline spinner.
 * Fixed dimensions prevent layout shift during loading.
 */
export default function PhaseButton({
  onClick,
  isLoading,
  disabled = false,
  label = "Finish",
  variant = "primary",
}: PhaseButtonProps) {
  const base =
    "relative min-w-[120px] h-10 rounded-lg font-semibold text-sm px-6 shadow-md transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2";

  const variants = {
    primary:
      "bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white shadow-emerald-500/25",
    secondary:
      "bg-slate-600 hover:bg-slate-500 active:bg-slate-700 text-white shadow-slate-600/25",
    danger:
      "bg-rose-500 hover:bg-rose-400 active:bg-rose-600 text-white shadow-rose-500/25",
  };

  return (
    <button
      type="button"
      className={`${base} ${variants[variant]}`}
      disabled={isLoading || disabled}
      onClick={onClick}
    >
      {isLoading && (
        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
      )}
      <span>{label}</span>
    </button>
  );
}
