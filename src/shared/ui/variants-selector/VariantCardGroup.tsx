"use client";

import { cn } from "@/shared/lib/cn";
import VariantCard from "./VariantCard";
import type { VariantCardDensity, VariantOption } from "./types";

/** Narrowest a card may get before the grid drops a column. */
const DEFAULT_MIN_CARD_WIDTH = 240;

type VariantCardGroupProps<TValue extends string> = {
  options: readonly VariantOption<TValue>[];
  /** `null` renders nothing selected — a genuine "not chosen yet" state. */
  value: TValue | null;
  onChange: (value: TValue) => void;
  density?: VariantCardDensity;
  /** Card density only; row density is always one column. */
  minCardWidth?: number;
  /** Required: a radiogroup with no accessible name is unusable by screen reader. */
  label: string;
  className?: string;
};

/**
 * Form A — the card grid, for where the choice is the point.
 *
 * `auto-fit` + `minmax(min(width, 100%), 1fr)` rather than fixed breakpoints:
 * the group is dropped into a modal, a page and a sidebar at different widths,
 * and the `min()` is what stops a single card overflowing a container narrower
 * than `minCardWidth`.
 *
 * Native buttons carry the roles, so tab reaches every option. That is a
 * deliberate trade against roving-tabindex: this repo has no radiogroup
 * primitive, and a half-built one that traps arrow keys is worse than tab.
 */
export default function VariantCardGroup<TValue extends string>({
  options,
  value,
  onChange,
  density = "card",
  minCardWidth = DEFAULT_MIN_CARD_WIDTH,
  label,
  className,
}: VariantCardGroupProps<TValue>) {
  const isRow = density === "row";

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("grid", isRow ? "gap-2" : "gap-3.5", className)}
      style={
        isRow
          ? undefined
          : {
              gridTemplateColumns: `repeat(auto-fit, minmax(min(${minCardWidth}px, 100%), 1fr))`,
            }
      }
    >
      {options.map((option) => (
        <VariantCard
          key={option.value}
          option={option}
          selected={option.value === value}
          onSelect={onChange}
          density={density}
        />
      ))}
    </div>
  );
}
