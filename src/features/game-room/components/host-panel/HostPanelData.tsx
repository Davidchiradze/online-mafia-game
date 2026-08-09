import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import SeatChipRow from "./SeatChipRow";
import HostPanelProgress from "./HostPanelProgress";

type HostPanelDataProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The middle zone — the only one that flexes, and the only one that may ever
 * scroll. Everything in it shrinks on the same container-query curve as the
 * title first; the scrollbar is the last resort, not the layout.
 */
export default function HostPanelData({ descriptor }: HostPanelDataProps) {
  const { chips, chipsLabel, progress, status } = descriptor;

  return (
    <div className="host-panel__data">
      {chips && <SeatChipRow label={chipsLabel} chips={chips} />}
      {progress && <HostPanelProgress progress={progress} />}
      {status && <span className="host-panel__status">{status}</span>}
    </div>
  );
}
