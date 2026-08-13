import { Crosshair } from "lucide-react";
import type { HostPanelMeta } from "@/features/game-room/lib/hostPanel";

type HostPanelMetaPillProps = {
  item: HostPanelMeta;
};

/**
 * One night-summary pill: a role or a mafia seat, and what they picked.
 *
 * Shared by the full data zone and the collapsed line, so the night summary
 * looks like itself at every size — only the container-query clamps change.
 */
export default function HostPanelMetaPill({ item }: HostPanelMetaPillProps) {
  return (
    <div
      className={`host-panel__meta-pill host-panel__meta-pill--${item.tone}${
        item.isActive ? " host-panel__meta-pill--active" : ""
      }`}
    >
      <span className="host-panel__meta-label">{item.label}</span>
      {item.icon === "target" && (
        <Crosshair
          className="host-panel__meta-icon"
          strokeWidth={2.5}
          aria-hidden
        />
      )}
      <span className="host-panel__meta-value">{item.value}</span>
    </div>
  );
}
