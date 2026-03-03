/**
 * ParticipantCover — full-tile overlay shown instead of video.
 *
 * Driven by a single `state` prop so the parent only needs to
 * map VisibilityState → CoverState without passing emoji strings
 * or multiple booleans.
 */

import { WifiOffIcon } from "@/assets/icons";

export type CoverState = "sleeping" | "dead" | "disconnected" | "dimmed";

interface ParticipantCoverProps {
  state: CoverState;
  className?: string;
}

export default function ParticipantCover({
  state,
  className = "",
}: ParticipantCoverProps) {
  if (state === "dead") {
    return (
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-gray-800 via-gray-900 to-black pointer-events-none ${className}`}
      >
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="text-5xl md:text-7xl grayscale opacity-80">💀</div>
          <div className="text-sm md:text-base text-gray-400 font-semibold uppercase tracking-wider">
            Dead
          </div>
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.6)_100%)] pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]" />
      </div>
    );
  }

  if (state === "disconnected") {
    return (
      <div
        className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 via-neutral-900 to-zinc-950 ${className}`}
      >
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <WifiOffIcon className="w-10 h-10 md:w-14 md:h-14 text-zinc-400 animate-pulse [&_line]:text-amber-400/80" />
            <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full bg-amber-500/90 animate-ping" />
            <span className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 rounded-full bg-amber-500" />
          </div>

          <div className="text-xs md:text-sm text-zinc-300 font-medium tracking-wide">
            Connection Lost
          </div>
        </div>

        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.08)_2px,rgba(255,255,255,0.08)_4px)]" />
      </div>
    );
  }

  if (state === "dimmed") {
    return (
      <div
        className={`absolute inset-0 z-[5] pointer-events-none ${className}`}
      >
        <div className="absolute inset-0 backdrop-blur-sm bg-slate-900/50" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl md:text-5xl opacity-80 animate-pulse">
            💤
          </span>
        </div>
      </div>
    );
  }

  // "sleeping" — default cover state (night phases, picking roles, etc.)
  return (
    <div
      className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-black ${className}`}
    >
      <div className="text-6xl md:text-8xl animate-pulse">💤</div>

      <div className="absolute inset-0 opacity-5 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />
    </div>
  );
}
