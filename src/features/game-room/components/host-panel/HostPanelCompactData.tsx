import {
  hostPanelCompactLine,
  hostPanelRunChips,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import HostPanelNominated from "./HostPanelNominated";
import HostPanelSpeakers from "./HostPanelSpeakers";
import SeatChip from "./SeatChip";
import HostPanelMetaPill from "./HostPanelMetaPill";

type HostPanelCompactDataProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The data zone for the `compact` composition: the same BLOCKS the full panel
 * shows, laid out on a wrapping row instead of a column.
 *
 * Compact renders less, not smaller — but "less" was once "flatten everything
 * into one rail of dots", and that put the nominated seats, the seat holding
 * the floor and the seat on deck in a single undifferentiated run. A rose dot
 * beside a green dot is not a smaller version of a labelled capsule above two
 * speaker pills; it is a different, worse reading of the same state, and a
 * seat that is both nominated AND speaking appeared twice in it.
 *
 * So the nominated capsule and the now/next pills survive intact and only the
 * ordered run collapses. They sit side by side when the cell is wide enough
 * and stack when it is not, which is the same separation a desktop cell gives,
 * arrived at by wrapping rather than by a breakpoint.
 */
export default function HostPanelCompactData({
  descriptor,
}: HostPanelCompactDataProps) {
  const { meta = [], nominated, speakers = [] } = descriptor;
  const chips = hostPanelRunChips(descriptor);
  const line = hostPanelCompactLine(descriptor);
  const hasNominated = (nominated?.seats.length ?? 0) > 0;

  if (
    !hasNominated &&
    speakers.length === 0 &&
    chips.length === 0 &&
    meta.length === 0 &&
    !line
  ) {
    return null;
  }

  return (
    <div className="host-panel__line">
      {nominated && <HostPanelNominated nominated={nominated} />}
      <HostPanelSpeakers speakers={speakers} />
      {(chips.length > 0 || meta.length > 0) && (
        <div className="host-panel__line-run">
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
