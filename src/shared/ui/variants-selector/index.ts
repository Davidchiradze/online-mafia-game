/**
 * Variant selector kit — one option shape, four surfaces.
 *
 * | Form | Component | Use where |
 * | --- | --- | --- |
 * | A cards | `VariantCardGroup` / `VariantCard` | the choice IS the task (create-game, onboarding) |
 * | B segmented | `VariantSegmented` | the choice switches a dataset (leaderboard, stats header) |
 * | C chips | `VariantChips` / `VariantChip` | the choice is one filter among several (match history, admin) |
 * | D badge | `VariantBadge` | read-only reporting (match rows, room cards, game header) |
 *
 * The kit is domain-free — it never names a game type. `useGameVariantOptions`
 * (`@/shared/hooks/useGameVariantOptions`) is the adapter that turns this
 * repo's variants into `VariantOption`s; anything else with a small labelled
 * enum can build its own.
 *
 * A barrel here rather than the `shared/ui` root, which deliberately has none:
 * these seven modules are one unit, and the alternative is callers importing
 * `accents` and `types` by path to compose a single control.
 */

export { default as VariantCard } from "./VariantCard";
export { default as VariantCardGroup } from "./VariantCardGroup";
export { default as VariantSegmented } from "./VariantSegmented";
export { default as VariantChip } from "./VariantChip";
export { default as VariantChips } from "./VariantChips";
export { default as VariantBadge } from "./VariantBadge";

export {
  DEFAULT_VARIANT_ACCENT,
  VARIANT_ACCENTS,
  accentLight,
  accentRgba,
  type VariantAccent,
} from "./accents";

export type {
  VariantBadgeOption,
  VariantCardDensity,
  VariantControlSize,
  VariantOption,
} from "./types";
