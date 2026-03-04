"use client";

interface SpeakingProgressBarProps {
  progress: number;
}

export default function SpeakingProgressBar({
  progress,
}: SpeakingProgressBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden z-30">
      <div
        className="h-full relative overflow-hidden"
        style={{
          width: `${100 - progress}%`,
          transition: "width 0.3s ease-out",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, #22c55e 0%, #10b981 50%, #22c55e 100%)",
            boxShadow: "0 0 10px rgba(34,197,94,0.6)",
          }}
        />
      </div>
    </div>
  );
}
