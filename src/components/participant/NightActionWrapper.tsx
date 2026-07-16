"use client";

/**
 * Positions a night-action button at the bottom-center of the participant tile.
 * By default it is hover/focus-revealed and stays visible while selected — used
 * by `NightActionButtons` (yakuza/doctor/right-hand) and Japanese mafia kills.
 *
 * `alwaysVisible` (Sports §5) forces it permanently visible: the unanimous-vote
 * mafia model shows a kill button on every alive tile for the whole phase (the
 * tiles are covered, so there is nothing to hover-reveal over), disabling —
 * not hiding — them once the 5s window closes.
 */
export default function NightActionWrapper({
  children,
  isSelected,
  alwaysVisible = false,
}: {
  children: React.ReactNode;
  isSelected: boolean;
  alwaysVisible?: boolean;
}) {
  const visibility =
    alwaysVisible || isSelected
      ? "flex"
      : "hidden group-hover:flex group-focus-within:flex";
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 justify-center ${visibility}`}
    >
      {children}
    </div>
  );
}
