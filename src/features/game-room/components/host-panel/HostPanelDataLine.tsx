import {
  hostPanelCollapsedChips,
  hostPanelCompactLine,
  type HostPanelDescriptor,
} from "@/features/game-room/lib/hostPanel";
import SeatChip from "./SeatChip";

type HostPanelDataLineProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The data zone collapsed to ONE line, for the `compact` and `bar`
 * compositions: a short window of chips centred on the active one, then the
 * single string that matters most. Rendering less is what makes a 48px hole
 * readable — scaling the full zone down just produces unreadable text.
 */
export default function HostPanelDataLine({
  descriptor,
}: HostPanelDataLineProps) {
  const chips = hostPanelCollapsedChips(descriptor);
  const line = hostPanelCompactLine(descriptor);
  if (chips.length === 0 && !line) return null;

  return (
    <div className="host-panel__line">
      {chips.length > 0 && (
        <div className="flex shrink-0 gap-1">
          {chips.map((chip) => (
            <SeatChip key={chip.seat} seat={chip.seat} tone={chip.tone} />
          ))}
        </div>
      )}
      {line && (
        <span className="host-panel__line-text text-slate-400">{line}</span>
      )}
    </div>
  );
}
