import type { SeatChipTone } from "@/features/game-room/lib/hostPanel";

type SeatChipProps = {
  seat: number;
  tone: SeatChipTone;
};

/**
 * One seat in an ordered run. Four tones rather than two greens, so "picking
 * now", "next", "done" and "not reached yet" are told apart at a glance
 * instead of by reading the numbers.
 *
 * `data-active` is how the collapsed rail finds the seat on the clock without
 * threading a ref through the run — see `useCenteredActiveRail`.
 */
export default function SeatChip({ seat, tone }: SeatChipProps) {
  return (
    <div
      className={`seat-chip seat-chip--${tone}`}
      data-active={tone === "active" ? "true" : undefined}
    >
      {seat}
    </div>
  );
}
