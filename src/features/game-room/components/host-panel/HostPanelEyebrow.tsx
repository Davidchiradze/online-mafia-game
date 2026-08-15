import type { HostPanelDescriptor } from "@/features/game-room/lib/hostPanel";

type HostPanelEyebrowProps = {
  eyebrow: string;
  timer?: HostPanelDescriptor["timer"];
};

/**
 * The kicker line: what part of the game this is, plus the live countdown when
 * the phase has one. Sits above the title in every composition, and is the one
 * piece of identity the bar keeps at full fidelity.
 */
export default function HostPanelEyebrow({
  eyebrow,
  timer,
}: HostPanelEyebrowProps) {
  return (
    <div className="host-panel__eyebrow-row">
      <span className="host-panel__eyebrow">{eyebrow}</span>
      {timer && (
        <span
          className={`host-panel__timer ${
            timer.isUrgent ? "badge-timer-urgent" : "badge-timer"
          }`}
          aria-live="polite"
        >
          {timer.label}
        </span>
      )}
    </div>
  );
}
