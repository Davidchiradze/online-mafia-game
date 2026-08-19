"use client";

import { cn } from "@/shared/lib/cn";
import {
  DEFAULT_VARIANT_ACCENT,
  segmentIndicatorStyle,
} from "./accents";
import type { VariantControlSize, VariantOption } from "./types";

const SEGMENT_CLASS = {
  sm: "px-1 py-2 text-[0.78rem]",
  md: "px-1.5 py-[9px] text-[0.82rem]",
  lg: "px-4 py-3 text-[0.95rem]",
} as const satisfies Record<VariantControlSize, string>;

type VariantSegmentedProps<TValue extends string> = {
  options: readonly VariantOption<TValue>[];
  value: TValue;
  onChange: (value: TValue) => void;
  size?: VariantControlSize;
  /** Required: a tablist with no accessible name is unusable by screen reader. */
  label: string;
  className?: string;
};

/**
 * Form B — segmented control, for where the choice switches a dataset
 * (a leaderboard, a stats header) rather than committing to anything.
 *
 * One sliding pill carries the accent and is the only thing that animates, so
 * swapping a 50-row board underneath never reads as a page change. The pill is
 * absolutely positioned over an equal-column grid, which is why the columns are
 * `minmax(0, 1fr)`: `auto` columns size to their labels, the pill's `calc()`
 * assumes they are equal, and the two disagree the moment one label is longer.
 *
 * A disabled option renders dimmed and inert rather than being dropped —
 * an option that vanishes when unavailable makes the control's width jump and
 * hides that the variant exists at all.
 */
export default function VariantSegmented<TValue extends string>({
  options,
  value,
  onChange,
  size = "md",
  label,
  className,
}: VariantSegmentedProps<TValue>) {
  const activeIndex = options.findIndex((option) => option.value === value);
  const active = activeIndex < 0 ? undefined : options[activeIndex];
  const accent = active?.accent ?? DEFAULT_VARIANT_ACCENT;

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "relative grid rounded-[14px] bg-black/45 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-1 left-1 top-1 rounded-[11px] transition-[transform,background,box-shadow,opacity] duration-[260ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={segmentIndicatorStyle(accent, activeIndex, options.length)}
      />
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          disabled={option.disabled}
          title={option.disabled ? option.disabledReason : undefined}
          onClick={() => onChange(option.value)}
          className={cn(
            "relative z-[1] truncate rounded-[11px] font-sans font-semibold transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
            SEGMENT_CLASS[size],
            option.disabled
              ? "cursor-not-allowed text-zinc-700"
              : option.value === value
                ? "text-zinc-50"
                : "text-zinc-500 hover:text-zinc-200",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
