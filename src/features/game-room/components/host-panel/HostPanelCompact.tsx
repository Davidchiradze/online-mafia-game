import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import HostPanelEyebrow from "./HostPanelEyebrow";
import HostPanelTitle from "./HostPanelTitle";
import HostPanelCompactData from "./HostPanelCompactData";
import HostPanelActions from "./HostPanelActions";

type HostPanelCompactProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * Same three zones, composed down. The title drops into the flexing zone so it
 * can absorb the shrink alongside the surviving data blocks, while the eyebrow
 * row and the 44px action keep their own fixed tracks.
 */
export default function HostPanelCompact({
  descriptor,
}: HostPanelCompactProps) {
  return (
    <div className="host-panel__stack">
      <HostPanelEyebrow eyebrow={descriptor.eyebrow} timer={descriptor.timer} />
      <div className="host-panel__data">
        <HostPanelTitle title={descriptor.title} />
        <HostPanelCompactData descriptor={descriptor} />
      </div>
      <HostPanelActions actions={descriptor.actions} />
    </div>
  );
}
