import {
  Gamepad2,
  History,
  MessageSquare,
  Trophy,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export type NavigationSidebarItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const NAVIGATION_SIDEBAR_ITEMS: NavigationSidebarItem[] = [
  { label: "Lobby", href: "/lobby", icon: Gamepad2 },
  { label: "Community Chat", href: "/community-chat", icon: MessageSquare },
  { label: "Profile", href: "/profile", icon: UserCircle },
  { label: "Match History", href: "/match-history", icon: History },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
];
