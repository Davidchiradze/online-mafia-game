import { EyeOff } from "lucide-react";

interface MaskedCoverProps {
  className?: string;
}

/**
 * MaskedCover — overlay shown over a (non-blurred) video tile during the
 * detective's mafia check. The video stays fully visible; a centered
 * crossed-eye marker signals the player is not yet revealed.
 */
export default function MaskedCover({ className = "" }: MaskedCoverProps) {
  return (
    <div
      className={`absolute inset-0 z-[5] flex items-center justify-center pointer-events-none ${className}`}
    >
      <span className="flex items-center justify-center p-2 md:p-3 rounded-full border border-white/20 bg-black/60 text-white/80 shadow-[0_0_16px_rgba(0,0,0,0.4)]">
        <EyeOff className="h-5 w-5 md:h-7 md:w-7" strokeWidth={2} />
      </span>
    </div>
  );
}
