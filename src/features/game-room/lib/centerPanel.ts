/**
 * The centre cell of the participant ring is a bare surface: `PlayerCircle`
 * draws the chrome (`.center-panel`, radius, clip) and nothing else, because
 * the container-query host panel needs the full box — its own padding is part
 * of the type scale and cannot sit inside someone else's `p-3`.
 *
 * Everything that is NOT the host panel (the legacy per-phase stacks, the
 * winner banner, the player-side title + voting display) opts back into the
 * old padded, scrollable column with this class. Add your own `justify-*`.
 */
export const CENTER_PANEL_STACK_CLASS =
  "flex h-full w-full flex-col items-center gap-2 overflow-y-auto p-3";
