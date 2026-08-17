import { Crosshair } from "lucide-react";
import {
  hostPanelMetaPillClass,
  type HostPanelMeta,
} from "@/features/game-room/lib/hostPanel";

type HostPanelMetaPillProps = {
  item: HostPanelMeta;
};

/**
 * One label→value pill: a night-summary role, a mafia seat, or a vote tally
 * candidate.
 *
 * Shared by the full data zone and the collapsed line, so the same fact looks
 * like itself at every size — only the container-query clamps change. What
 * differs per pill is `emphasis`: a `strong` pill stacks label over value and
 * makes the value the headline, because in the vote tally the number is the
 * whole point rather than an annotation on a role name.
 */
export default function HostPanelMetaPill({ item }: HostPanelMetaPillProps) {
  return (
    <div
      className={hostPanelMetaPillClass(item)}
      data-active={item.isActive ? "true" : undefined}
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
