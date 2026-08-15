import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import HostPanelEyebrow from "./HostPanelEyebrow";
import HostPanelTitle from "./HostPanelTitle";
import HostPanelData from "./HostPanelData";
import HostPanelActions from "./HostPanelActions";

type HostPanelStackProps = {
  descriptor: HostPanelDescriptor;
};

/**
 * The full three-zone composition — identity, data, action — used whenever the
 * cell can hold it, and by the sheet regardless of the cell that opened it.
 */
export default function HostPanelStack({ descriptor }: HostPanelStackProps) {
  return (
    <div className="host-panel__stack">
      <div className="host-panel__identity">
        <HostPanelEyebrow
          eyebrow={descriptor.eyebrow}
          timer={descriptor.timer}
        />
        <HostPanelTitle
          title={descriptor.title}
          accent={descriptor.titleAccent}
        />
      </div>
      <HostPanelData descriptor={descriptor} />
      <HostPanelActions actions={descriptor.actions} />
    </div>
  );
}
