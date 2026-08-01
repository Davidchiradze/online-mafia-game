import { EyeOff } from "lucide-react";
import { STARS } from "./constants";

interface DimmedCoverProps {
  className?: string;
}

export default function DimmedCover({ className = "" }: DimmedCoverProps) {
  return (
    <div
      className={`absolute inset-0 z-[5] pointer-events-none ${className}`}
    >
      {/* Blurred dark overlay on top of video */}
      <div className="absolute inset-0 backdrop-blur-sm bg-black/60" />

      {/* Subtle night atmosphere */}
      <div className="absolute inset-0 bg-night-dim" />

      {/* Small blood moon hint */}
      <div className="absolute top-2 right-3">
        <div className="animate-pulse duration-3000 w-3.5 h-3.5 bg-dim-moon rounded-full blur-[3px]" />
      </div>

      {/* Sparse stars */}
      {STARS.slice(0, 5).map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse duration-3000"
          style={{
            left: `${star.x}px`,
            top: `${star.y}px`,
            width: `${star.size * 0.7}px`,
            height: `${star.size * 0.7}px`,
            background: "rgba(200,210,240,0.3)",
            boxShadow: "0 0 2px rgba(160,180,220,0.2)",
            animationDelay: star.delay,
          }}
        />
      ))}

      {/* Centered crossed-eye marker */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex items-center justify-center p-1.5 rounded-full border border-white/20 bg-black/60 text-white/80 shadow-[0_0_16px_rgba(0,0,0,0.4)]">
          <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={2} />
        </span>
      </div>
    </div>
  );
}
