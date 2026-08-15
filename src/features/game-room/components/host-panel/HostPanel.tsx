"use client";

import { useHostPanelLayout } from "@/features/game-room/hooks/game/useHostPanelLayout";
import type {
  HostPanelDescriptor,
  HostPanelLayout,
} from "@/features/game-room/lib/hostPanel";
import HostPanelStack from "./HostPanelStack";
import HostPanelCompact from "./HostPanelCompact";
import HostPanelBar from "./HostPanelBar";

type HostPanelProps = {
  descriptor: HostPanelDescriptor;
  /** Pin a composition instead of measuring — for previews and tests. */
  layout?: HostPanelLayout;
};

/**
 * The host-controls shell: one panel, three compositions, chosen from the
 * panel's own measured box rather than from a page breakpoint.
 *
 * It fills the centre ring cell edge to edge — `PlayerCircle` draws the chrome
 * and hands over the whole box, because the padding here is part of the
 * container-query type scale and cannot sit inside someone else's.
 */
export default function HostPanel({ descriptor, layout }: HostPanelProps) {
  const { containerRef, layout: resolved } = useHostPanelLayout(layout);

  return (
    <div ref={containerRef} className={`host-panel host-panel--${resolved}`}>
      {resolved === "bar" && <HostPanelBar descriptor={descriptor} />}
      {resolved === "compact" && <HostPanelCompact descriptor={descriptor} />}
      {resolved === "panel" && <HostPanelStack descriptor={descriptor} />}
    </div>
  );
}
