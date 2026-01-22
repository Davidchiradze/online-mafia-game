"use client";

interface SpeakingProgressBarProps {
  progress: number;
}

/**
 * Progress bar showing remaining speaking time.
 */
export default function SpeakingProgressBar({
  progress,
}: SpeakingProgressBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700/50 z-30">
      <div
        className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
        style={{ width: `${100 - progress}%` }}
      />
    </div>
  );
}

