"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { LandingLogo } from "./LandingLogo";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
];

export function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/30 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <LandingLogo size="md" />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-gray-400 hover:text-white transition-colors tracking-[0.1em] uppercase font-sans text-[0.75rem] font-medium"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="px-5 py-2 rounded-lg border border-white/20 text-white/80 hover:text-white hover:border-white/40 backdrop-blur-sm transition-all font-sans text-[0.85rem] font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all font-sans text-[0.85rem] font-semibold"
          >
            Play Now
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white cursor-pointer"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle mobile menu"
        >
          {mobileOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-xl border-t border-white/5 px-6 py-6 space-y-4">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block text-gray-400 hover:text-white transition-colors font-sans text-[0.9rem] font-medium"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            <Link
              href="/auth/signin"
              className="flex-1 px-4 py-2.5 rounded-lg border border-white/20 text-white/80 text-center font-sans text-[0.85rem] font-medium"
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white text-center font-sans text-[0.85rem] font-semibold"
              onClick={() => setMobileOpen(false)}
            >
              Play Now
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
