import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import HostPanelNominated from "./HostPanelNominated";
import HostPanelSpeakers from "./HostPanelSpeakers";
import HostPanelNote from "./HostPanelNote";
import SeatChipRow from "./SeatChipRow";
import HostPanelProgress from "./HostPanelProgress";

type HostPanelDataProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The middle zone — the only one that flexes, and the only one that may ever
 * scroll. Everything in it shrinks on the same container-query curve as the
 * title first; the scrollbar is the last resort, not the layout.
 *
 * Block order is fixed and meaningful: standing facts (nominated) above live
 * state (who is speaking) above exceptions (the note) above the run and the
 * one-line status. Nothing reorders per phase, so the host's eye lands in the
 * same place every time.
 */
export default function HostPanelData({ descriptor }: HostPanelDataProps) {
  const { chips, chipsLabel, nominated, note, progress, speakers, status } =
    descriptor;

  return (
    <div className="host-panel__data">
      {nominated && <HostPanelNominated nominated={nominated} />}
      {speakers && <HostPanelSpeakers speakers={speakers} />}
      {note && <HostPanelNote note={note} />}
      {chips && <SeatChipRow label={chipsLabel} chips={chips} />}
      {progress && <HostPanelProgress progress={progress} />}
      {status && <span className="host-panel__status">{status}</span>}
    </div>
  );
}
