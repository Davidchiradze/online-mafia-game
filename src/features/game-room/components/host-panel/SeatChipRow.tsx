import type { SeatChip as SeatChipModel } from "@/features/game-room/lib/hostPanel";
import SeatChip from "./SeatChip";

type SeatChipRowProps = {
  label?: string;
  chips: readonly SeatChipModel[];
};

/** A labelled run of seat chips. Wraps rather than scrolls or ellipsises. */
export default function SeatChipRow({ label, chips }: SeatChipRowProps) {
  if (chips.length === 0) return null;

  return (
    <div className="host-panel__chips">
      {label && <span className="host-panel__chips-label">{label}</span>}
      <div className="host-panel__chips-run">
        {chips.map((chip) => (
          <SeatChip key={chip.seat} seat={chip.seat} tone={chip.tone} />
        ))}
      </div>
    </div>
  );
}
