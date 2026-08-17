import type { HostPanelMeta as HostPanelMetaModel } from "@/features/game-room/lib/hostPanel";
import HostPanelMetaPill from "./HostPanelMetaPill";

type HostPanelMetaProps = {
  meta: readonly HostPanelMetaModel[];
};

/**
 * The night summary: what the night has recorded so far.
 *
 * One pill per acting role (Japanese: M / Y / H) or per living mafia (Sports:
 * each private pick, host-only). The pill glows while its role is the one
 * choosing, so the host can see at a glance whose turn is open and which
 * decisions have already landed.
 *
 * This is the full-panel run — it wraps. The collapsed compositions render the
 * same pills through `HostPanelDataLine` instead.
 */
export default function HostPanelMeta({ meta }: HostPanelMetaProps) {
  if (meta.length === 0) return null;

  return (
    <div className="host-panel__meta">
      {meta.map((item) => (
        <HostPanelMetaPill key={item.id} item={item} />
      ))}
    </div>
  );
}
