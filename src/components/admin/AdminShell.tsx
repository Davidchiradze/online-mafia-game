"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

const NAV = [
  { href: "/admin", key: "nav.dashboard" as const, exact: true },
  { href: "/admin/users", key: "nav.users" as const, exact: false },
  { href: "/admin/games", key: "nav.games" as const, exact: false },
  { href: "/admin/archive", key: "nav.archive" as const, exact: false },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations("admin");
  const pathname = usePathname();

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      {/* Ambient glow backdrop — fixed so it stays put while content scrolls. */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-indigo-600/20 blur-[130px]" />
        <div className="absolute top-1/4 right-0 h-[26rem] w-[26rem] rounded-full bg-violet-600/15 blur-[130px]" />
        <div className="absolute bottom-0 left-0 h-[24rem] w-[24rem] rounded-full bg-emerald-600/10 blur-[130px]" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5 sm:px-6">
          <span className="font-orbitron bg-gradient-to-r from-indigo-300 via-violet-300 to-rose-300 bg-clip-text text-lg font-semibold text-transparent">
            {t("title")}
          </span>
          <nav className="flex items-center gap-1 overflow-x-auto">
            {NAV.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition-colors ${
                    active
                      ? "bg-white/10 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
