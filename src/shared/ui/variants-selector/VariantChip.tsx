"use client";

import { cn } from "@/shared/lib/cn";
import { VARIANT_ACCENTS, chipSelectedStyle, type VariantAccent } from "./accents";
import type { VariantControlSize } from "./types";

const CHIP_CLASS = {
  sm: "gap-[7px] px-[13px] py-[7px] text-[0.76rem]",
  md: "gap-2 px-3.5 py-2 text-[0.8rem]",
  lg: "gap-2.5 px-4 py-2.5 text-[0.875rem]",
} as const satisfies Record<VariantControlSize, string>;

type VariantChipProps = {
  label: string;
  /** `null` is the "all" member — a neutral wash, no variant identity. */
  accent: VariantAccent | null;
  selected: boolean;
  onClick: () => void;
  size?: VariantControlSize;
  className?: string;
};

/**
 * A single filter pill. Split out from `VariantChips` so the "all" member and
 * the per-variant members share one implementation instead of two near-copies
 * that drift on padding and selected treatment.
 *
 * At this size a 6px dot is the whole variant identity — no glyph, no accent
 * fill across the pill. A chip is one filter among several in a toolbar, and an
 * accent-filled pill competes with the content it filters.
 */
export default function VariantChip({
  label,
  accent,
  selected,
  onClick,
  size = "md",
  className,
}: VariantChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02]",
        "font-sans font-semibold text-zinc-400 transition-all duration-[180ms]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        !selected && "hover:border-white/15 hover:text-zinc-200",
        CHIP_CLASS[size],
        className,
      )}
      style={selected ? chipSelectedStyle(accent) : undefined}
    >
      {accent === null ? null : (
        <span
          aria-hidden
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: VARIANT_ACCENTS[accent].base }}
        />
      )}
      {label}
    </button>
  );
}
