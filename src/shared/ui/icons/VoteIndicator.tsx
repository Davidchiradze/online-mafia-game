import React from "react";

import type { IconProps } from "./MicOn";

export default function VoteIndicatorIcon({ title, ...props }: IconProps) {
  return (
    <svg
      width="134"
      height="134"
      viewBox="0 0 134 134"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <path id="arcVotedTopNew" d="M 21 67 A 46 46 0 0 1 113 67" />
        <pattern id="inkTexture" width="8" height="8" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="0.8" fill="rgba(0,0,0,0.4)" />
          <circle cx="6" cy="6" r="0.6" fill="rgba(0,0,0,0.3)" />
          <circle cx="4" cy="7" r="0.5" fill="rgba(0,0,0,0.25)" />
        </pattern>
      </defs>

      {/* Solid dark background circle */}
      <circle cx="67" cy="67" r="64" fill="rgba(30,5,5,0.88)" stroke="rgba(40,0,0,0.95)" strokeWidth="2" />

      {/* Bold outer ring */}
      <circle cx="67" cy="67" r="60" stroke="rgba(220,38,38,1)" strokeWidth="6" />
      <circle cx="67" cy="67" r="56" stroke="rgba(255,60,60,0.65)" strokeWidth="2" />

      {/* Inner decorative dashed ring */}
      <circle cx="67" cy="67" r="52" stroke="rgba(255,100,100,0.85)" strokeWidth="2" strokeDasharray="8 4" />

      {/* "VOTED" text on arc */}
      <text fontSize="13" letterSpacing="8" fill="rgba(255,180,180,1)" style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 900 }}>
        <textPath href="#arcVotedTopNew" startOffset="7%">VOTED</textPath>
      </text>

      {/* Decorative side lines */}
      <line x1="24" y1="65" x2="40" y2="65" stroke="rgba(220,38,38,1)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="94" y1="65" x2="110" y2="65" stroke="rgba(220,38,38,1)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Shadow layer */}
      <polyline points="41,69 58,88 93,47" stroke="rgba(0,0,0,0.8)" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
      {/* Base red layer */}
      <polyline points="41,69 58,88 93,47" stroke="rgba(220,38,38,1)" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
      {/* Bright highlight layer */}
      <polyline points="41,69 58,88 93,47" stroke="rgba(255,100,100,1)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      {/* Core white highlight */}
      <polyline points="41,69 58,88 93,47" stroke="rgba(255,230,230,0.7)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Corner accent dots */}
      <circle cx="67" cy="6"   r="4.5" fill="rgba(255,60,60,1)" stroke="rgba(30,5,5,0.8)" strokeWidth="1.5" />
      <circle cx="67" cy="128" r="4.5" fill="rgba(255,60,60,1)" stroke="rgba(30,5,5,0.8)" strokeWidth="1.5" />
      <circle cx="6"  cy="67"  r="4.5" fill="rgba(255,60,60,1)" stroke="rgba(30,5,5,0.8)" strokeWidth="1.5" />
      <circle cx="128" cy="67" r="4.5" fill="rgba(255,60,60,1)" stroke="rgba(30,5,5,0.8)" strokeWidth="1.5" />

      {/* Ink texture overlay */}
      <circle cx="67" cy="67" r="60" fill="url(#inkTexture)" opacity="0.15" />
    </svg>
  );
}
