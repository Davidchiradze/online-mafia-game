"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface GlowButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Red gradient CTA button with glow effect.
 * Use for primary actions: Sign Up, Play Now, Join Game, etc.
 */
export function GlowButton({
  href,
  onClick,
  children,
  className = "",
  fullWidth = false,
}: GlowButtonProps) {
  const base = `group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-red-600 via-red-500 to-red-600 text-white font-semibold shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:shadow-[0_0_45px_rgba(220,38,38,0.65)] transition-all cursor-pointer flex items-center justify-center gap-2 font-sans text-base ${fullWidth ? "w-full" : "w-full sm:w-auto"} ${className}`;

  if (href) {
    return (
      <Link href={href} className={base}>
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={base}>
      {children}
    </button>
  );
}
