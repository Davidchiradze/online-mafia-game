"use client";

import { useDelayedDisable } from "@/features/game-room/hooks/game/useDelayedDisable";
import type { HostPanelAction } from "@/features/game-room/lib/hostPanel";

type HostPanelActionButtonProps = {
  action: HostPanelAction;
};

/**
 * One action in the pinned action zone.
 *
 * Colour comes from the shared `.phase-btn-*` palette so the panel and the
 * not-yet-migrated stacks stay one design; SIZE comes from
 * `.host-panel__action`, which is a container-query clamp bottoming out at the
 * 44px touch floor.
 */
export default function HostPanelActionButton({
  action,
}: HostPanelActionButtonProps) {
  const { disableOnMountMs = 0, disabled = false, isLoading = false } = action;
  const isMountDisabled = useDelayedDisable(disableOnMountMs, action.id);

  return (
    <button
      type="button"
      onClick={action.onClick}
      title={action.title ?? action.label}
      disabled={disabled || isLoading || isMountDisabled}
      className={`host-panel__action phase-btn-${action.variant}`}
    >
      {isLoading && <span className="spinner spinner-sm" />}
      <span className="host-panel__action-label">{action.label}</span>
    </button>
  );
}
