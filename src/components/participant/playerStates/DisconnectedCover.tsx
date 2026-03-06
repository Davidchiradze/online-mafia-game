import { WifiOffIcon } from "@/assets/icons";

interface DisconnectedCoverProps {
  className?: string;
}

export default function DisconnectedCover({
  className = "",
}: DisconnectedCoverProps) {
  return (
    <div className={`absolute inset-0 z-10 ${className}`}>
      {/* Dark cold overlay */}
      <div className="absolute inset-0 bg-disconnected-overlay" />

      {/* CRT scanlines */}
      <div className="absolute inset-0 pointer-events-none bg-disconnected-scanlines" />

      {/* Horizontal glitch stripe — top */}
      <div className="absolute left-0 right-0 top-[28%] h-[3px] animate-pulse duration-2400 bg-disconnected-glitch-top" />
      {/* Horizontal glitch stripe — mid */}
      <div className="absolute left-0 right-0 top-[52%] h-[2px] animate-pulse duration-3100 delay-600 bg-disconnected-glitch-mid" />

      {/* Amber radial glow behind icon */}
      <div className="absolute inset-0 bg-disconnected-glow" />

      {/* Central connection-lost icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 pb-[26px]">
        <WifiOffIcon
          className="w-14 h-14 text-amber-500/90 drop-shadow-[0_0_12px_rgba(245,158,11,0.7)] opacity-90 [&_line]:text-amber-500/80"
        />

        {/* CONNECTION LOST label */}
        <div className="flex flex-col items-center gap-1">
          <span className="block font-orbitron text-[0.62rem] font-extrabold tracking-[0.18em] text-amber-500/90">
            CONNECTION LOST
          </span>
          <span className="block animate-pulse duration-1400 font-inter text-[0.58rem] font-medium tracking-[0.1em] text-amber-700/65">
            ● RECONNECTING...
          </span>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-disconnected-bottom-fade" />
    </div>
  );
}
