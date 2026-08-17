"use client";

import { X } from "lucide-react";
import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";
import HostPanelStack from "./HostPanelStack";

type HostPanelSheetProps = {
  descriptor: HostPanelDescriptor;
  closeLabel: string;
  onClose: () => void;
};

/**
 * The full panel, docked to the bottom of the viewport.
 *
 * When the cell collapses to a bar there is nowhere left to put the data zone,
 * so it moves here. It is `fixed` rather than absolutely positioned inside the
 * cell for two reasons: the ring cells clip their overflow, and overlaying the
 * grid means no tile reflows while the host is mid-action.
 */
export default function HostPanelSheet({
  descriptor,
  closeLabel,
  onClose,
}: HostPanelSheetProps) {
  return (
    <>
      <div
        className="fixed inset-0 z-30 bg-black/60"
        role="presentation"
        onClick={onClose}
      />
      <div className="host-panel-sheet center-panel">
        <div className="host-panel">
          <HostPanelStack descriptor={descriptor} />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          title={closeLabel}
          className="absolute right-2 top-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/5 text-slate-400 transition hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
