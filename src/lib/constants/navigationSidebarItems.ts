import {
  CreditCard,
  Gamepad2,
  History,
  MessageSquare,
  Trophy,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

export type NavigationSidebarItem = {
  labelKey: string;
  href: string;
  icon: LucideIcon;
};

export const NAVIGATION_SIDEBAR_ITEMS: NavigationSidebarItem[] = [
  { labelKey: "lobby", href: "/lobby", icon: Gamepad2 },
  { labelKey: "matchHistory", href: "/match-history", icon: History },
  { labelKey: "communityChat", href: "/community-chat", icon: MessageSquare },
  { labelKey: "leaderboard", href: "/leaderboard", icon: Trophy },
  { labelKey: "subscriptions", href: "/subscriptions", icon: CreditCard },
];
