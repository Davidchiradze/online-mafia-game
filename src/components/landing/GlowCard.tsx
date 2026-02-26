"use client";

import { motion } from "motion/react";
import { ReactNode } from "react";

interface GlowCardProps {
  children: ReactNode;
  glowColor?: string;
  className?: string;
  animationDelay?: number;
}

/**
 * Dark glass card with subtle border glow effect.
 * Use for: feature cards, player stat cards, game room cards, testimonials, etc.
 */
export function GlowCard({
  children,
  glowColor = "rgba(220,38,38,0.12)",
  className = "",
  animationDelay = 0,
}: GlowCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: animationDelay }}
      className={`group relative rounded-2xl border border-white/[0.06] backdrop-blur-sm p-8 hover:border-white/[0.12] transition-all duration-500 ${className}`}
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${glowColor}, transparent 70%), rgba(255,255,255,0.02)`,
      }}
    >
      {children}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${glowColor}, transparent 70%)`,
        }}
      />
    </motion.div>
  );
}
