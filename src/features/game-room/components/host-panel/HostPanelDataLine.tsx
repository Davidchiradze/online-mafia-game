import {
  hostPanelCollapsedChips,
  hostPanelCompactLine,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import SeatChip from "./SeatChip";
import HostPanelMetaPill from "./HostPanelMetaPill";

type HostPanelDataLineProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The data zone collapsed to ONE line, for the `bar` composition: the seats
 * that matter, the night summary, and the single string that matters most.
 *
 * The bar is the only composition that flattens nominated seats and the
 * now/next speakers into a single chip run, because it is one 71px row with
 * the action beside it and there is no second row to give them. Its chevron
 * opens the full panel in a sheet, which is where the separation lives.
 * Compact has the height for the real blocks — see `HostPanelCompactData`.
 *
 * The night summary is NOT dropped here. On a phone the whole game is the
 * collapsed composition, so dropping it would mean the host never sees who the
 * mafia picked — the one thing the night exists to record. The pills are sized
 * to fit instead (three Japanese M/Y/H pills fit a bar's identity column), and
 * the run scrolls sideways for the cases that genuinely cannot fit, such as
 * Sports' one-pill-per-mafia with a full table.
 *
 * Chips and meta share the run because no phase has both: a night has a
 * summary and no ordered run, a day has an ordered run and no summary.
 */
export default function HostPanelDataLine({
  descriptor,
}: HostPanelDataLineProps) {
  const chips = hostPanelCollapsedChips(descriptor);
  const meta = descriptor.meta ?? [];
  const line = hostPanelCompactLine(descriptor);
  if (chips.length === 0 && meta.length === 0 && !line) return null;

  return (
    <div className="host-panel__line">
      {(chips.length > 0 || meta.length > 0) && (
        <div className="host-panel__line-run">
          {/* Keyed by position, not by seat: the same seat legitimately
              appears twice here — once rose because it is nominated, once
              emerald because it holds the floor — and a shared key makes
              React reconcile the two against each other. */}
          {chips.map((chip, index) => (
            <SeatChip
              key={`${chip.tone}-${String(chip.seat)}-${String(index)}`}
              seat={chip.seat}
              tone={chip.tone}
            />
          ))}
          {meta.map((item) => (
            <HostPanelMetaPill key={item.id} item={item} />
          ))}
        </div>
      )}
      {line && (
        <span className="host-panel__line-text text-slate-400">{line}</span>
      )}
    </div>
  );
}
