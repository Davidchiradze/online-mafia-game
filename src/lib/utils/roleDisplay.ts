import { JAPANESE_MAFIA_ROLES } from "@/lib/constants/game";

type RoleType = (typeof JAPANESE_MAFIA_ROLES)[number];

interface RoleDisplayConfig {
  emoji: string;
  color: string;
  bgGradient: string;
  borderColor: string;
}

/**
 * Role display configuration mapping
 * Provides visual styling for each role type
 */
export const ROLE_DISPLAY_CONFIG: Record<RoleType, RoleDisplayConfig> = {
  DON: {
    emoji: "👑",
    color: "text-red-400",
    bgGradient: "from-red-950 via-red-900 to-black",
    borderColor: "border-red-500/50",
  },
  MAFIA: {
    emoji: "🔫",
    color: "text-red-500",
    bgGradient: "from-red-900 via-gray-900 to-black",
    borderColor: "border-red-600/40",
  },
  MAFIA_RIGHT_HAND: {
    emoji: "🤝",
    color: "text-red-400",
    bgGradient: "from-red-900 via-amber-900/30 to-black",
    borderColor: "border-red-500/40",
  },
  SHOGUN: {
    emoji: "⚔️",
    color: "text-purple-400",
    bgGradient: "from-purple-950 via-purple-900 to-black",
    borderColor: "border-purple-500/50",
  },
  YAKUZA: {
    emoji: "🐉",
    color: "text-purple-500",
    bgGradient: "from-purple-900 via-gray-900 to-black",
    borderColor: "border-purple-600/40",
  },
  DETECTIVE: {
    emoji: "🔍",
    color: "text-blue-400",
    bgGradient: "from-blue-950 via-blue-900 to-black",
    borderColor: "border-blue-500/50",
  },
  CITIZEN: {
    emoji: "👤",
    color: "text-emerald-400",
    bgGradient: "from-emerald-950 via-emerald-900 to-black",
    borderColor: "border-emerald-500/50",
  },
  DOCTOR: {
    emoji: "💉",
    color: "text-cyan-400",
    bgGradient: "from-cyan-950 via-cyan-900 to-black",
    borderColor: "border-cyan-500/50",
  },
};

/**
 * Get role display configuration
 * Returns default config for unknown roles
 */
export function getRoleDisplayConfig(role: string): RoleDisplayConfig {
  const normalizedRole = role.toUpperCase() as RoleType;
  return (
    ROLE_DISPLAY_CONFIG[normalizedRole] ?? {
      emoji: "❓",
      color: "text-gray-400",
      bgGradient: "from-gray-900 via-gray-800 to-black",
      borderColor: "border-gray-500/50",
    }
  );
}

/**
 * Get role emoji
 */
export function getRoleEmoji(role: string): string {
  return getRoleDisplayConfig(role).emoji;
}

