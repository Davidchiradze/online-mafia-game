import {
  CalendarCheck,
  CreditCard,
  Gamepad2,
  History,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export type NavigationSidebarItem = {
  labelKey: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

export const NAVIGATION_SIDEBAR_ITEMS: NavigationSidebarItem[] = [
  { labelKey: "lobby", href: "/lobby", icon: Gamepad2 },
  { labelKey: "matchHistory", href: "/match-history", icon: History },
  { labelKey: "leaderboard", href: "/leaderboard", icon: Trophy },
  { labelKey: "subscriptions", href: "/subscriptions", icon: CreditCard },
  {
    labelKey: "bookSpace",
    href: "https://www.mafia.ge/ka/user/tables",
    icon: CalendarCheck,
    external: true,
  },
];
