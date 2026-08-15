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
  /** Shown to a signed-out guest browsing a guest-viewable page. */
  guestVisible?: boolean;
};

export const NAVIGATION_SIDEBAR_ITEMS: NavigationSidebarItem[] = [
  { labelKey: "lobby", href: "/lobby", icon: Gamepad2, guestVisible: true },
  { labelKey: "matchHistory", href: "/match-history", icon: History },
  {
    labelKey: "leaderboard",
    href: "/leaderboard",
    icon: Trophy,
    guestVisible: true,
  },
  { labelKey: "subscriptions", href: "/subscriptions", icon: CreditCard },
  {
    labelKey: "bookSpace",
    href: "https://www.mafia.ge/ka/user/tables",
    icon: CalendarCheck,
    external: true,
    guestVisible: true,
  },
];
