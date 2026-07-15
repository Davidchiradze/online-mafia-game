"use client";

/**
 * Positions a night-action button at the bottom-center of the participant tile.
 * Hidden by default, revealed on group hover/focus; stays visible while selected.
 * Shared by `NightActionButtons` (yakuza/doctor/right-hand) and `MafiaKillControl`.
 */
export default function NightActionWrapper({
  children,
  isSelected,
}: {
  children: React.ReactNode;
  isSelected: boolean;
}) {
  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 justify-center ${
        isSelected
          ? "flex"
          : "hidden group-hover:flex group-focus-within:flex"
      }`}
    >
      {children}
    </div>
  );
}
