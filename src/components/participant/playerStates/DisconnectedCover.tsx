import { WifiOffIcon } from "@/assets/icons";

interface DisconnectedCoverProps {
  className?: string;
}

export default function DisconnectedCover({ className = "" }: DisconnectedCoverProps) {
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
