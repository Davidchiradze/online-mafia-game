"use client";

import { cn } from "@/shared/lib/cn";
import {
  DEFAULT_VARIANT_ACCENT,
  accentLight,
  iconTileStyle,
  selectedSurfaceStyle,
  selectionDotStyle,
} from "./accents";
import type { VariantCardDensity, VariantOption } from "./types";

const TILE_CLASS = {
  card: "h-11 w-11 rounded-xl text-[1.4rem]",
  row: "h-[34px] w-[34px] rounded-[9px] text-base",
} as const satisfies Record<VariantCardDensity, string>;

const ICON_PX = { card: 22, row: 17 } as const satisfies Record<
  VariantCardDensity,
  number
>;

type VariantCardProps<TValue extends string> = {
  option: VariantOption<TValue>;
  selected: boolean;
  onSelect: (value: TValue) => void;
  /**
   * `card` — tall tile, code line, description, radio dot. Use where the choice
   * IS the task. `row` — compact list item, `meta` only, no dot. Use where the
   * choice is one field among several in a form.
   */
  density?: VariantCardDensity;
  className?: string;
};

/**
 * One selectable variant, at either density.
 *
 * The two densities are the same component on purpose: they differ only in how
 * much of the option they show, and splitting them produced two files that
 * drifted on accent and focus treatment. Exported on its own so a caller with a
 * single option (a confirm step, a landing page hero) is not forced through
 * `VariantCardGroup`.
 */
export default function VariantCard<TValue extends string>({
  option,
  selected,
  onSelect,
  density = "card",
  className,
}: VariantCardProps<TValue>) {
  const accent = option.accent ?? DEFAULT_VARIANT_ACCENT;
  const Icon = option.icon;
  const isRow = density === "row";
  // Row density prefers the terse `meta`, card density the fuller
  // `description`; either falls back to the other so an option only has to
  // supply the one line that fits how it is actually rendered.
  const body = isRow
    ? (option.meta ?? option.description)
    : (option.description ?? option.meta);

  const tile = (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border leading-none transition-shadow duration-[180ms]",
        TILE_CLASS[density],
      )}
      style={iconTileStyle(accent, selected)}
    >
      {option.glyph ? (
        <span className="font-semibold" style={{ color: accentLight(accent) }}>
          {option.glyph}
        </span>
      ) : Icon ? (
        <Icon
          size={ICON_PX[density]}
          strokeWidth={1.8}
          style={{ color: accentLight(accent) }}
        />
      ) : null}
    </span>
  );

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={option.disabled}
      title={option.disabled ? option.disabledReason : undefined}
      onClick={() => onSelect(option.value)}
      className={cn(
        "relative flex overflow-hidden border border-white/[0.08] bg-white/[0.025] text-left",
        "transition-all duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
        "disabled:cursor-not-allowed disabled:opacity-45",
        isRow
          ? "items-center gap-3 rounded-xl p-3"
          : "flex-col gap-3.5 rounded-2xl px-[18px] pb-4 pt-[18px] enabled:hover:-translate-y-0.5",
        !selected &&
          "enabled:hover:border-white/15 enabled:hover:bg-white/[0.05]",
        className,
      )}
      style={selected ? selectedSurfaceStyle(accent) : undefined}
    >
      {isRow ? (
        tile
      ) : (
        <span className="flex items-center justify-between gap-2.5">
          {tile}
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 rounded-full border border-white/[0.14] transition-all duration-[180ms]"
            style={selectionDotStyle(accent, selected)}
          />
        </span>
      )}
      <span className="grid gap-[5px]">
        <span
          className={cn(
            "font-sans font-semibold text-zinc-50",
            isRow ? "text-[0.88rem]" : "text-[1.06rem]",
          )}
        >
          {option.label}
        </span>
        {!isRow && option.code ? (
          <span className="font-orbitron text-[0.6rem] font-bold tracking-[0.16em] text-zinc-500">
            {option.code}
          </span>
        ) : null}
        {body ? (
          <span
            className={cn(
              "leading-relaxed text-zinc-400",
              isRow ? "text-[0.72rem]" : "text-[0.76rem]",
            )}
          >
            {body}
          </span>
        ) : null}
      </span>
    </button>
  );
}
