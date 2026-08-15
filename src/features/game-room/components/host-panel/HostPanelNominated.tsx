import {
  hostPanelNominatedSeats,
  type HostPanelNominated as HostPanelNominatedModel,
} from "@/features/game-room/lib/hostPanel";

type HostPanelNominatedProps = {
  nominated: HostPanelNominatedModel;
};

/**
 * The nominated seats, as a standing fact rather than a warning.
 *
 * It persists through the whole day and self-justification run, so it gets its
 * own rose capsule and sits apart from the emerald speaking pills — above them
 * in the panel, beside them on a compact cell. The two are different kinds of
 * information and must never read as one row of chips.
 */
export default function HostPanelNominated({
  nominated,
}: HostPanelNominatedProps) {
  const seats = hostPanelNominatedSeats(nominated);
  if (seats.length === 0) return null;

  const label = (
    <span key="label" className="host-panel__nominated-label">
      {nominated.label}
    </span>
  );
  const seatPills = (
    <div key="seats" className="host-panel__nominated-seats">
      {seats.map((seat) => (
        <span key={seat} className="host-panel__nominated-seat">
          {seat}
        </span>
      ))}
    </div>
  );

  return (
    <div className="host-panel__nominated">
      {nominated.seatsFirst ? [seatPills, label] : [label, seatPills]}
    </div>
  );
}
