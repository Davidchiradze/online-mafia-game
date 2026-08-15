import type { HostPanelSpeaker } from "@/features/game-room/lib/hostPanel";

type HostPanelSpeakersProps = {
  speakers: readonly HostPanelSpeaker[];
};

/**
 * Who holds the floor, and who follows.
 *
 * During introduction and day those are the only two facts the host acts on,
 * so they get two large pills — emerald for the live speaker, amber for the
 * one on deck — instead of a full order run. The seat number is the biggest
 * thing in the data zone because it is what the host reads at a glance.
 */
export default function HostPanelSpeakers({
  speakers,
}: HostPanelSpeakersProps) {
  if (speakers.length === 0) return null;

  return (
    <div className="host-panel__speakers">
      {speakers.map((speaker) => (
        <div
          key={speaker.role}
          className={`host-panel__speaker host-panel__speaker--${speaker.role}`}
        >
          <span className="host-panel__speaker-label">{speaker.label}</span>
          <span className="host-panel__speaker-seat">#{speaker.seat}</span>
        </div>
      ))}
    </div>
  );
}
