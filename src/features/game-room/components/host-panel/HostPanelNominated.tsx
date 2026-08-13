import type { HostPanelNominated as HostPanelNominatedModel } from "@/features/game-room/lib/hostPanel";

type HostPanelNominatedProps = {
  nominated: HostPanelNominatedModel;
};

/**
 * The nominated seats, as a standing fact rather than a warning.
 *
 * It persists through the whole day and self-justification run, so it gets its
 * own rose capsule and sits ABOVE the emerald speaking pills — the two are
 * different kinds of information and must never read as one row of chips.
 */
export default function HostPanelNominated({
  nominated,
}: HostPanelNominatedProps) {
  if (nominated.seats.length === 0) return null;

  return (
    <div className="host-panel__nominated">
      <span className="host-panel__nominated-label">{nominated.label}</span>
      <div className="host-panel__nominated-seats">
        {nominated.seats.map((seat) => (
          <span key={seat} className="host-panel__nominated-seat">
            {seat}
          </span>
        ))}
      </div>
    </div>
  );
}
