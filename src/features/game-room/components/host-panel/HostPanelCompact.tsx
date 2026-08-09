import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import HostPanelEyebrow from "./HostPanelEyebrow";
import HostPanelTitle from "./HostPanelTitle";
import HostPanelDataLine from "./HostPanelDataLine";
import HostPanelActions from "./HostPanelActions";

type HostPanelCompactProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * Same three zones, composed down. The title drops into the flexing zone so it
 * can absorb the shrink alongside the one surviving data line, while the
 * eyebrow row and the 44px action keep their own fixed tracks.
 */
export default function HostPanelCompact({
  descriptor,
}: HostPanelCompactProps) {
  return (
    <div className="host-panel__stack">
      <HostPanelEyebrow eyebrow={descriptor.eyebrow} timer={descriptor.timer} />
      <div className="host-panel__data">
        <HostPanelTitle title={descriptor.title} />
        <HostPanelDataLine descriptor={descriptor} />
      </div>
      <HostPanelActions actions={descriptor.actions} />
    </div>
  );
}
