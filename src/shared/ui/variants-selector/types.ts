import type { LucideIcon } from "lucide-react";
import type { VariantAccent } from "./accents";

/**
 * One selectable option, shared by all four surfaces of the kit.
 *
 * Deliberately domain-free: the kit knows nothing about game types. A caller
 * builds these once (see `useGameVariantOptions` for the game-variant adapter)
 * and every surface reads the same objects, so an option's accent and glyph are
 * defined in exactly one place and cannot drift between the create-game modal
 * and a match row.
 *
 * `TValue` is threaded through the group components so `value` / `onChange`
 * stay typed to the caller's own union rather than widening to `string`.
 */
export type VariantOption<TValue extends string = string> = {
  value: TValue;
  /** Primary, localized. The one line every surface shows. */
  label: string;
  /** Short Latin uppercase name for the Orbitron line and read-only badges. */
  code?: string;
  /** Card-density body copy. Falls back to `meta` when absent. */
  description?: string;
  /** Compact one-liner for row density, e.g. "12 seats · Rated". */
  meta?: string;
  /** Identity color. Omitted options render neutral. */
  accent?: VariantAccent;
  /** Lucide icon for the tile. Ignored when `glyph` is set. */
  icon?: LucideIcon;
  /** Text glyph used instead of an icon, e.g. `死`. Wins over `icon`. */
  glyph?: string;
  disabled?: boolean;
  /** Tooltip explaining the disabled state — a dimmed control with no reason is a dead end. */
  disabledReason?: string;
};

/**
 * What a read-only badge needs. A subset so callers that have no selection to
 * make (a match row, a room card) can pass a literal instead of assembling a
 * full option with a `value` nothing will ever read.
 */
export type VariantBadgeOption = Pick<
  VariantOption,
  "label" | "code" | "accent" | "icon" | "glyph"
>;

/** Card density: `card` is a tall tile with copy, `row` a compact list item. */
export type VariantCardDensity = "card" | "row";

/** Control scale. `sm` for dense toolbars and table rows, `md` for page-level. */
export type VariantControlSize = "sm" | "md";
