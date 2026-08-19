"use client";

import { cn } from "@/shared/lib/cn";
import { DEFAULT_VARIANT_ACCENT, badgeStyle } from "./accents";
import type { VariantBadgeOption, VariantControlSize } from "./types";

const BADGE_CLASS = {
  sm: "gap-1.5 rounded-[7px] px-[9px] py-1 text-[0.54rem] tracking-[0.12em]",
  md: "gap-[7px] rounded-lg px-2.5 py-[5px] text-[0.58rem] tracking-[0.14em]",
} as const satisfies Record<VariantControlSize, string>;

const GLYPH_CLASS = {
  sm: "text-[0.66rem]",
  md: "text-[0.72rem]",
} as const satisfies Record<VariantControlSize, string>;

const ICON_PX = { sm: 10, md: 12 } as const satisfies Record<
  VariantControlSize,
  number
>;

type VariantBadgeProps = {
  option: VariantBadgeOption;
  size?: VariantControlSize;
  className?: string;
};

/**
 * Form D — read-only badge for surfaces that report a variant rather than
 * choose one (match rows, room cards, the game header, archive rows).
 *
 * A `<span>`, not a disabled button: these appear in clickable rows, and a
 * button inside a link is both invalid and a second tab stop for something that
 * does nothing. Prefers `code` over `label` because the Orbitron uppercase
 * treatment is Latin-only — a Georgian label set in it renders as fallback
 * glyphs at 0.58rem.
 */
export default function VariantBadge({
  option,
  size = "md",
  className,
}: VariantBadgeProps) {
  const accent = option.accent ?? DEFAULT_VARIANT_ACCENT;
  const Icon = option.icon;

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center border font-orbitron font-bold uppercase leading-none",
        BADGE_CLASS[size],
        className,
      )}
      style={badgeStyle(accent)}
    >
      {option.glyph ? (
        <span aria-hidden className={GLYPH_CLASS[size]}>
          {option.glyph}
        </span>
      ) : Icon ? (
        <Icon aria-hidden size={ICON_PX[size]} strokeWidth={2.4} />
      ) : null}
      {option.code ?? option.label}
    </span>
  );
}
