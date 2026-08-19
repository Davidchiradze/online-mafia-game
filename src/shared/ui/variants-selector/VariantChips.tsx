"use client";

import { cn } from "@/shared/lib/cn";
import VariantChip from "./VariantChip";
import { DEFAULT_VARIANT_ACCENT } from "./accents";
import type { VariantControlSize, VariantOption } from "./types";

type VariantChipsProps<TValue extends string> = {
  options: readonly VariantOption<TValue>[];
  /** `null` means the "all" member is active — only reachable with `allLabel`. */
  value: TValue | null;
  onChange: (value: TValue | null) => void;
  /**
   * Renders a leading "all" chip that selects `null`. Omit it to make the
   * choice required, in which case `onChange` never receives `null`.
   */
  allLabel?: string;
  size?: VariantControlSize;
  className?: string;
};

/**
 * Form C — chip row, for where the variant is one filter among several
 * (match history, admin archive).
 *
 * The "all" member is opt-in rather than assumed: a filter bar needs it, a
 * required choice must not offer it. Its value is `null` and not a sentinel
 * string so a caller's own union stays exhaustive and `null` is the only thing
 * that has to be handled.
 *
 * Disabled options are dropped rather than dimmed — the opposite of the
 * segmented control, which keeps them to hold its geometry. A chip row reflows
 * freely, and a filter that cannot filter is only noise in a toolbar.
 */
export default function VariantChips<TValue extends string>({
  options,
  value,
  onChange,
  allLabel,
  size = "md",
  className,
}: VariantChipsProps<TValue>) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {allLabel ? (
        <VariantChip
          label={allLabel}
          accent={null}
          selected={value === null}
          onClick={() => onChange(null)}
          size={size}
        />
      ) : null}
      {options
        .filter((option) => !option.disabled)
        .map((option) => (
          <VariantChip
            key={option.value}
            label={option.label}
            accent={option.accent ?? DEFAULT_VARIANT_ACCENT}
            selected={option.value === value}
            onClick={() => onChange(option.value)}
            size={size}
          />
        ))}
    </div>
  );
}
