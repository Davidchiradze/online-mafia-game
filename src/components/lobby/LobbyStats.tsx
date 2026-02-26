import { Users, Gamepad2, Activity, Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LobbyStatsData = {
  totalPlayers: number;
  totalSpectators: number;
  activeRooms: number;
  playing: number;
};

const STAT_CARDS: Array<{
  key: keyof LobbyStatsData;
  icon: LucideIcon;
  label: string;
  gradient: string;
  border: string;
  glow: string;
  iconColor: string;
  bg: string;
}> = [
  {
    key: "totalPlayers",
    icon: Users,
    label: "Players in Rooms",
    gradient: "from-blue-500/20 to-blue-600/20",
    border: "border-blue-400/20",
    glow: "rgba(59,130,246,0.15)",
    iconColor: "text-blue-400",
    bg: "rgba(59,130,246,0.06)",
  },
  {
    key: "totalSpectators",
    icon: Eye,
    label: "Spectating",
    gradient: "from-cyan-500/20 to-cyan-600/20",
    border: "border-cyan-400/20",
    glow: "rgba(6,182,212,0.15)",
    iconColor: "text-cyan-400",
    bg: "rgba(6,182,212,0.06)",
  },
  {
    key: "activeRooms",
    icon: Gamepad2,
    label: "Active Rooms",
    gradient: "from-purple-500/20 to-purple-600/20",
    border: "border-purple-400/20",
    glow: "rgba(168,85,247,0.15)",
    iconColor: "text-purple-400",
    bg: "rgba(168,85,247,0.06)",
  },
  {
    key: "playing",
    icon: Activity,
    label: "Games Playing",
    gradient: "from-red-500/20 to-red-600/20",
    border: "border-red-400/20",
    glow: "rgba(220,38,38,0.15)",
    iconColor: "text-red-400",
    bg: "rgba(220,38,38,0.06)",
  },
];

export default function LobbyStats({ stats }: { stats: LobbyStatsData }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {STAT_CARDS.map(({ key, icon: Icon, label, gradient, border, glow, iconColor, bg }) => (
        <div
          key={key}
          className={`flex items-center gap-4 p-4 rounded-xl border ${border} backdrop-blur-sm`}
          style={{
            background: `linear-gradient(135deg, ${bg} 0%, transparent 100%)`,
            boxShadow: `0 4px 20px ${glow}`,
          }}
        >
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} border ${border} flex items-center justify-center shrink-0`}
            style={{ boxShadow: `0 0 16px ${glow}` }}
          >
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
          <div>
            <div className="text-white font-orbitron font-bold text-2xl leading-tight">
              {stats[key]}
            </div>
            <div className="text-gray-500 font-sans text-xs">{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
