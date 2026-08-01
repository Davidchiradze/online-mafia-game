"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface GlassButtonProps {
  href?: string;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  fullWidth?: boolean;
}

/**
 * Glass/frosted outline button for secondary actions.
 * Use for: Sign In, Learn More, Cancel, etc.
 */
export function GlassButton({
  href,
  onClick,
  children,
  className = "",
  fullWidth = false,
}: GlassButtonProps) {
  const base = `group relative px-8 py-3.5 rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/10 hover:border-white/30 transition cursor-pointer flex items-center justify-center gap-2 font-sans text-base font-medium ${fullWidth ? "w-full" : "w-full sm:w-auto"} ${className}`;

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
