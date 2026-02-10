import React from "react";

type PhaseTitleProps = {
  title: string;
  subtitle?: string;
};

/**
 * Phase title displayed above host controls.
 */
export default function PhaseTitle({ title, subtitle }: PhaseTitleProps) {
  return (
    <div className="text-center mb-1">
      <h3 className="text-sm font-bold text-white tracking-wide">
        {title}
      </h3>
      {subtitle && (
        <p className="text-xs text-emerald-400 mt-0.5 font-medium">{subtitle}</p>
      )}
    </div>
  );
}
