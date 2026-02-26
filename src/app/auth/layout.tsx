import Link from "next/link";
import { LandingLogo } from "@/components/landing/LandingLogo";
import { Eye, Crosshair, Users } from "lucide-react";

const roleCards = [
  {
    label: "Mafia",
    icon: Crosshair,
    description: "Eliminate by night",
    gradient: "from-red-950/80 to-[#0a0a12]",
    border: "border-red-500/20",
    glow: "rgba(220,38,38,0.15)",
    iconColor: "text-red-400",
    rotate: "-rotate-6",
    z: "z-0",
    translate: "-translate-x-6 translate-y-2",
  },
  {
    label: "Civilian",
    icon: Users,
    description: "Find the impostor",
    gradient: "from-slate-800/60 to-[#0a0a12]",
    border: "border-white/10",
    glow: "rgba(148,163,184,0.08)",
    iconColor: "text-slate-400",
    rotate: "rotate-0",
    z: "z-10",
    translate: "translate-y-0",
  },
  {
    label: "Detective",
    icon: Eye,
    description: "Expose the truth",
    gradient: "from-blue-950/80 to-[#0a0a12]",
    border: "border-blue-500/20",
    glow: "rgba(59,130,246,0.15)",
    iconColor: "text-blue-400",
    rotate: "rotate-6",
    z: "z-0",
    translate: "translate-x-6 translate-y-2",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0a0a12] flex">
      {/* Global atmospheric glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-red-900/20 blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-purple-900/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.022]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* ── Left panel (desktop) ── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] relative flex-col items-center justify-center p-12 border-r border-white/[0.04] gap-16">

        {/* Logo top-left */}
        <div className="absolute top-10 left-10">
          <Link href="/">
            <LandingLogo size="md" />
          </Link>
        </div>

        {/* Role cards */}
        <div className="relative flex items-end justify-center h-64 w-full">
          {roleCards.map((card) => (
            <div
              key={card.label}
              className={`absolute w-44 h-56 rounded-2xl border ${card.border} bg-gradient-to-b ${card.gradient} backdrop-blur-sm ${card.rotate} ${card.translate} ${card.z} flex flex-col items-center justify-center gap-3 shadow-2xl transition-transform duration-300`}
              style={{
                boxShadow: `0 8px 40px ${card.glow}, 0 2px 8px rgba(0,0,0,0.6)`,
              }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: `radial-gradient(ellipse at 50% 0%, ${card.glow}, transparent 80%)`, border: `1px solid ${card.border.replace("border-", "")}` }}
              >
                <card.icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <span className={`font-orbitron font-bold text-sm tracking-wider ${card.iconColor}`}>
                {card.label}
              </span>
              <span className="font-sans text-[0.7rem] text-gray-600 tracking-wide uppercase">
                {card.description}
              </span>
            </div>
          ))}
        </div>

        {/* Copy */}
        <div className="text-center max-w-xs">
          <h2
            className="text-white font-orbitron font-extrabold leading-[1.15] tracking-tight mb-3"
            style={{ fontSize: "clamp(1.6rem, 2.5vw, 2.2rem)" }}
          >
            Who&apos;s the{" "}
            <span className="bg-gradient-to-r from-red-500 to-orange-400 bg-clip-text text-transparent">
              Mafia?
            </span>
          </h2>
          <p className="text-gray-600 font-sans text-sm leading-relaxed">
            Hidden roles, live voice chat, and one question — who do you trust?
          </p>
        </div>

        {/* Copyright */}
        <p className="absolute bottom-8 text-gray-800 font-sans text-xs">
          &copy; 2026 Mafia Online
        </p>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative z-10">
        {/* Mobile logo */}
        <div className="absolute top-6 left-6 lg:hidden">
          <Link href="/">
            <LandingLogo size="sm" />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
