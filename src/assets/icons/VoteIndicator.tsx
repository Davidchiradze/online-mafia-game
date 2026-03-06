import React from "react";

import type { IconProps } from "./MicOn";

export default function VoteIndicatorIcon({ title, ...props }: IconProps) {
  return (
    <svg
      width="124"
      height="124"
      viewBox="0 0 124 124"
      fill="none"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <circle
        cx="62"
        cy="62"
        r="58"
        stroke="rgba(220,38,38,0.95)"
        strokeWidth="4.5"
      />
      <circle
        cx="62"
        cy="62"
        r="50"
        stroke="rgba(220,38,38,0.55)"
        strokeWidth="1.5"
        strokeDasharray="5 3"
      />
      <defs>
        <path id="arcVotedTop" d="M 16 62 A 46 46 0 0 1 108 62" />
      </defs>
      <text
        fontSize="11.5"
        letterSpacing="7"
        fill="rgba(255,130,130,0.95)"
        style={{ fontFamily: "Orbitron, sans-serif", fontWeight: 900 }}
      >
        <textPath href="#arcVotedTop" startOffset="7%">
          VOTED
        </textPath>
      </text>
      <line
        x1="20"
        y1="60"
        x2="34"
        y2="60"
        stroke="rgba(220,38,38,0.65)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1="90"
        y1="60"
        x2="104"
        y2="60"
        stroke="rgba(220,38,38,0.65)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <polyline
        points="36,64 53,82 88,42"
        stroke="rgba(80,0,0,0.5)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="36,64 53,82 88,42"
        stroke="rgba(255,80,80,1)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="36,64 53,82 88,42"
        stroke="rgba(255,210,210,0.45)"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="62" cy="7" r="3" fill="rgba(220,38,38,0.85)" />
      <circle cx="62" cy="117" r="3" fill="rgba(220,38,38,0.85)" />
      <circle cx="7" cy="62" r="3" fill="rgba(220,38,38,0.85)" />
      <circle cx="117" cy="62" r="3" fill="rgba(220,38,38,0.85)" />
    </svg>
  );
}
