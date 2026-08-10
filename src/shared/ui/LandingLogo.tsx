import { Crosshair } from "lucide-react";

interface LandingLogoProps {
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { icon: "w-7 h-7", crosshair: "w-3.5 h-3.5", text: "text-sm" },
  md: { icon: "w-9 h-9", crosshair: "w-5 h-5", text: "text-lg" },
  lg: { icon: "w-11 h-11", crosshair: "w-6 h-6", text: "text-xl" },
};

export function LandingLogo({ size = "md" }: LandingLogoProps) {
  const s = sizes[size];
  return (
    <div className="flex items-center gap-2">
      <div
        className={`${s.icon} rounded-lg bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-[0_0_20px_rgba(220,38,38,0.4)]`}
      >
        <Crosshair className={`${s.crosshair} text-white`} />
      </div>
      <span
        className={`text-white tracking-[0.2em] uppercase font-orbitron font-bold ${s.text}`}
      >
        Mafia
      </span>
    </div>
  );
}
