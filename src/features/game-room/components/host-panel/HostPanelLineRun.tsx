"use client";

import {
  hostPanelRailCursor,
  type HostPanelMeta as HostPanelMetaModel,
  type SeatChip as SeatChipModel,
} from "@/features/game-room/lib/hostPanel";
import { useCenteredActiveRail } from "@/features/game-room/hooks/game/useCenteredActiveRail";
import SeatChip from "./SeatChip";
import HostPanelMetaPill from "./HostPanelMetaPill";

type HostPanelLineRunProps = {
  chips: readonly SeatChipModel[];
  meta: readonly HostPanelMetaModel[];
};

/**
 * The collapsed rail: seats and label→value pills on one line that scrolls
 * sideways instead of shrinking its contents into unreadability.
 *
 * Shared by the compact and bar compositions, which differ only in how the
 * chips were trimmed before they got here — `hostPanelRunChips` keeps the
 * ordered run alone, `hostPanelCollapsedChips` flattens the nominated seats and
 * speakers in too. Both hand the result to the same rail so the run looks and
 * behaves the same at both sizes.
 *
 * Chips and meta share the run because no phase has both: a night has a summary
 * and no ordered run, a day has an ordered run and no summary.
 *
 * The rail scrolls itself to keep whatever is on the clock centred — see
 * `useCenteredActiveRail`.
 */
export default function HostPanelLineRun({
  chips,
  meta,
}: HostPanelLineRunProps) {
  const railRef = useCenteredActiveRail(hostPanelRailCursor(chips, meta));

  if (chips.length === 0 && meta.length === 0) return null;

  return (
    <div ref={railRef} className="host-panel__line-run">
      {/* Keyed by position, not by seat: the same seat legitimately appears
          twice here — once rose because it is nominated, once emerald because
          it holds the floor — and a shared key makes React reconcile the two
          against each other. */}
      {chips.map((chip, index) => (
        <SeatChip
          key={`${chip.tone}-${String(chip.seat)}-${String(index)}`}
          seat={chip.seat}
          tone={chip.tone}
        />
      ))}
      {meta.map((item) => (
        <HostPanelMetaPill key={item.id} item={item} />
      ))}
    </div>
  );
}
