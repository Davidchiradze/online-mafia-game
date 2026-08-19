import type { CSSProperties } from "react";

/**
 * Accent tokens + the selected-state styles for the variant selector kit.
 *
 * Tailwind cannot generate a class from a runtime value, and the whole premise
 * of this kit is that the accent is *data* an option carries — so the selected
 * states are inline `CSSProperties` built here, and the idle states stay plain
 * utility classes on the components. Keeping every accent-derived value in one
 * module is what makes the four surfaces (card, segmented, chip, badge) read as
 * one system instead of four coincidences.
 *
 * `base` is the saturated accent (borders, dots, glows); `light` is the
 * readable-on-dark tint (icon and badge text). Anything below ~0.6 alpha of
 * `base` fails contrast as text, which is why the two are separate tokens
 * rather than one hex plus opacity.
 */
export const VARIANT_ACCENTS = {
  purple: { base: "#a855f7", light: "#c4b5fd" },
  emerald: { base: "#10b981", light: "#34d399" },
  red: { base: "#dc2626", light: "#f87171" },
  blue: { base: "#3b82f6", light: "#93c5fd" },
  amber: { base: "#f59e0b", light: "#fcd34d" },
  neutral: { base: "#a1a1aa", light: "#e4e4e7" },
} as const;

export type VariantAccent = keyof typeof VARIANT_ACCENTS;

/** The default for an option that declares no accent of its own. */
export const DEFAULT_VARIANT_ACCENT: VariantAccent = "neutral";

/** `rgba()` from an accent's `base` hex — the only place hex is parsed. */
export function accentRgba(accent: VariantAccent, alpha: number): string {
  const channels = Number.parseInt(VARIANT_ACCENTS[accent].base.slice(1), 16);
  const r = (channels >> 16) & 255;
  const g = (channels >> 8) & 255;
  const b = channels & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Readable-on-dark tint — icon strokes, glyphs, badge text. */
export function accentLight(accent: VariantAccent): string {
  return VARIANT_ACCENTS[accent].light;
}

/**
 * Selected card / row surface: accent border, faint accent wash, accent bloom.
 * The extra `0 0 0 1px` ring is what reads as "chosen" at a glance without
 * thickening the border and shifting layout by a pixel.
 */
export function selectedSurfaceStyle(accent: VariantAccent): CSSProperties {
  return {
    borderColor: accentRgba(accent, 0.5),
    background: accentRgba(accent, 0.1),
    boxShadow: `0 0 0 1px ${accentRgba(accent, 0.33)}, 0 0 24px ${accentRgba(accent, 0.18)}`,
  };
}

/** The glyph/icon tile. Always accent-tinted; only the bloom is stateful. */
export function iconTileStyle(
  accent: VariantAccent,
  selected: boolean,
): CSSProperties {
  return {
    borderColor: accentRgba(accent, 0.35),
    background: accentRgba(accent, 0.1),
    boxShadow: selected ? `0 0 20px ${accentRgba(accent, 0.35)}` : undefined,
  };
}

/**
 * The radio dot on a card. Idle is a bare ring from utility classes, so this
 * returns nothing when unselected rather than fighting them.
 */
export function selectionDotStyle(
  accent: VariantAccent,
  selected: boolean,
): CSSProperties {
  if (!selected) return {};
  return {
    borderColor: VARIANT_ACCENTS[accent].base,
    background: VARIANT_ACCENTS[accent].base,
    boxShadow: `0 0 0 3px ${accentRgba(accent, 0.2)}, inset 0 0 0 3px rgba(0, 0, 0, 0.55)`,
  };
}

/**
 * The sliding pill behind the active segment — the only thing that moves when a
 * segmented control switches a dataset, so re-rendering a 50-row board below it
 * never reads as a page change.
 *
 * `p-1` on the track is `0.5rem` of total horizontal padding, hence the
 * `calc()`: each segment is an exact 1/count of the inner width, so a plain
 * `translateX(index * 100%)` lands the pill dead on.
 */
export function segmentIndicatorStyle(
  accent: VariantAccent,
  index: number,
  count: number,
): CSSProperties {
  return {
    width: `calc((100% - 0.5rem) / ${count})`,
    transform: `translateX(${index * 100}%)`,
    background: accentRgba(accent, 0.16),
    boxShadow: `0 0 0 1px ${accentRgba(accent, 0.45)}, 0 0 22px ${accentRgba(accent, 0.2)}`,
    // An out-of-range selection (value not in options) hides the pill instead of
    // parking it over segment 0 and lying about what is active.
    opacity: index < 0 ? 0 : 1,
  };
}

/**
 * A selected filter chip. `null` accent is the "all" member, which is a
 * neutral white wash on purpose — "all" is the absence of a variant, so giving
 * it an accent would invent a fourth variant identity.
 */
export function chipSelectedStyle(accent: VariantAccent | null): CSSProperties {
  if (accent === null) {
    return {
      borderColor: "rgba(255, 255, 255, 0.28)",
      background: "rgba(255, 255, 255, 0.09)",
      color: "#fafafa",
    };
  }
  return {
    borderColor: accentRgba(accent, 0.6),
    background: accentRgba(accent, 0.12),
    color: "#fafafa",
    boxShadow: `0 0 18px ${accentRgba(accent, 0.16)}`,
  };
}

/** Read-only badge — no states, so the accent is the entire style. */
export function badgeStyle(accent: VariantAccent): CSSProperties {
  return {
    borderColor: accentRgba(accent, 0.28),
    background: accentRgba(accent, 0.09),
    color: VARIANT_ACCENTS[accent].light,
  };
}
