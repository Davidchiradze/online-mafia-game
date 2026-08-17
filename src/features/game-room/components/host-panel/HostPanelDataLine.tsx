import {
  hostPanelCollapsedChips,
  hostPanelCompactLine,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import HostPanelLineRun from "./HostPanelLineRun";

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
 * Sports' one-pill-per-mafia with a full table or a full voting queue — which
 * is why `HostPanelLineRun` keeps the active item scrolled into the middle.
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
      <HostPanelLineRun chips={chips} meta={meta} />
      {line && (
        <span className="host-panel__line-text text-slate-400">{line}</span>
      )}
    </div>
  );
}
