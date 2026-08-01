"use client";

import { motion } from "motion/react";

interface SectionHeaderProps {
  label: string;
  title: ReactNode;
  id?: string;
}

import { ReactNode } from "react";

/**
 * Reusable section header with animated label + title.
 * Used on landing page and can be adapted for in-game stat/info sections.
 */
export function SectionHeader({ label, title, id }: SectionHeaderProps) {
  return (
    <div className="text-center mb-16">
      <motion.span
        id={id}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="inline-block text-red-500 uppercase tracking-[0.3em] mb-4 font-orbitron text-[0.7rem] font-semibold"
      >
        {label}
      </motion.span>
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.1 }}
        className="text-white font-orbitron font-bold leading-tight"
        style={{ fontSize: "clamp(1.5rem, 3vw, 2.5rem)" }}
      >
        {title}
      </motion.h2>
    </div>
  );
}
