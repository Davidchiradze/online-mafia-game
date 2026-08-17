import type { HostPanelAction } from "@/features/game-room/lib/hostPanel";
import HostPanelActionButton from "./HostPanelActionButton";

type HostPanelActionsProps = {
  actions: readonly HostPanelAction[];
};

/**
 * The pinned action zone. It is a fixed grid track, so it cannot be pushed out
 * of the cell by anything the data zone does — which is the whole reason the
 * shell is a grid and not a flex column.
 */
export default function HostPanelActions({ actions }: HostPanelActionsProps) {
  if (actions.length === 0) return null;

  return (
    <div className="host-panel__actions">
      {actions.map((action) => (
        <HostPanelActionButton key={action.id} action={action} />
      ))}
    </div>
  );
}
