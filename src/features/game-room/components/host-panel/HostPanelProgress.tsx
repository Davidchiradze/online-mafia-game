import type { HostPanelProgress as HostPanelProgressModel } from "@/features/game-room/lib/hostPanel";

type HostPanelProgressProps = {
  progress: HostPanelProgressModel;
};

/** A "N of M" bar. Panel composition only — the collapsed line drops it. */
export default function HostPanelProgress({
  progress,
}: HostPanelProgressProps) {
  const { value, total } = progress;
  const percent = total > 0 ? Math.min(100, (value / total) * 100) : 0;

  return (
    <div
      className="host-panel__progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <div
        className="host-panel__progress-fill"
        style={{ width: `${String(percent)}%` }}
      />
    </div>
  );
}
