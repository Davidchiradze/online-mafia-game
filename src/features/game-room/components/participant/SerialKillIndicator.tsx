"use client";

/**
 * SerialKillIndicator
 * Three amber claw slashes, a faceted brass seal holding the single tally
 * stroke of the one-shot kill, and drifting embers. No background, no borders.
 *
 * Amber is the faction hue (`src/shared/lib/constants/factions.ts`). The seal is
 * a rotated square rather than a circle for the same reason the colour differs:
 * on a small tile, shape carries further than hue, so this cannot be mistaken
 * for the yakuza's round hanko or the doctor's round ward.
 *
 * One tally stroke, not a count — the Serial Killer fires once per GAME
 * (docs/variants/serial_killer/rules.md §5).
 *
 * WHO SEES THIS is decided by `shouldShowSerialKillIndicator` in
 * `lib/serialKillerTarget.ts`, never here. This component is pure paint.
 */
export default function SerialKillIndicator() {
  // Perpendicular offsets along the claw's normal, so the three cuts stay
  // parallel instead of fanning out.
  const claws = [
    { dx: -29, dy: 28 },
    { dx: 0, dy: 0 },
    { dx: 29, dy: -28 },
  ];

  const embers = [
    { x: 46, y: 52 }, { x: 62, y: 34 }, { x: 240, y: 46 }, { x: 226, y: 64 },
    { x: 40, y: 120 }, { x: 244, y: 124 }, { x: 54, y: 156 }, { x: 233, y: 150 },
    { x: 88, y: 26 }, { x: 198, y: 22 }, { x: 74, y: 172 }, { x: 213, y: 166 },
    { x: 110, y: 20 }, { x: 176, y: 178 }, { x: 34, y: 90 }, { x: 246, y: 96 },
  ];

  const CLAW = "M 48 26 C 92 62 128 98 168 150";

  return (
    <div className="absolute inset-0 z-[28] pointer-events-none overflow-hidden rounded-xl">
      <svg
        className="w-full h-full"
        viewBox="0 0 280 200"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter id="sk-cut" x="-6%" y="-6%" width="112%" height="112%">
            <feGaussianBlur stdDeviation="1.1" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="sk-seal-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix type="matrix"
              values="1.6 0 0 0 0.15  1.0 0 0 0 0.5  0 0 0 0 0.05  0 0 0 0.85 0"
              in="blur" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Three claw slashes */}
        {claws.map(({ dx, dy }, i) => (
          <g key={i} transform={`translate(${dx},${dy})`} opacity={i === 1 ? 1 : 0.82}>
            <path d={CLAW}
              stroke="rgba(120,62,0,0.26)" strokeWidth="22" strokeLinecap="round" fill="none" />
            <path d={CLAW}
              stroke="rgba(180,100,0,0.34)" strokeWidth="13" strokeLinecap="round" fill="none" />
            <path d={CLAW}
              stroke="rgba(245,158,11,0.85)" strokeWidth="7" strokeLinecap="round" fill="none"
              filter="url(#sk-cut)" />
            <path d={CLAW}
              stroke="rgba(254,215,140,0.30)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          </g>
        ))}

        {/* Faceted brass seal */}
        <g transform="rotate(45, 140, 96)">
          <rect x="98" y="54" width="84" height="84" rx="9"
            fill="rgba(70,38,0,0.32)"
            stroke="rgba(251,191,36,0.88)" strokeWidth="3.4"
            filter="url(#sk-seal-glow)" />
          <rect x="105" y="61" width="70" height="70" rx="7"
            fill="none" stroke="rgba(251,191,36,0.52)" strokeWidth="1.2" />
          <rect x="111" y="67" width="58" height="58" rx="5"
            fill="none" stroke="rgba(251,191,36,0.22)" strokeWidth="0.7" />
        </g>

        {/* Corner ticks on the seal's axes */}
        {[
          { x: 140, y: 36 }, { x: 140, y: 156 },
          { x: 80, y: 96 }, { x: 200, y: 96 },
        ].map(({ x, y }, i) => (
          <circle key={i} cx={x} cy={y} r="2.4" fill="rgba(252,211,77,0.7)" />
        ))}

        <rect x="86" y="42" width="108" height="108" rx="14"
          fill="rgba(245,158,11,0.07)">
          <animate attributeName="opacity" values="0.55;0.12;0.55" dur="2.3s" repeatCount="indefinite" />
        </rect>

        {/* The single tally stroke — one shot, one mark */}
        <g transform="rotate(-8, 140, 96)">
          <rect x="134" y="66" width="12" height="60" rx="4" fill="rgba(60,30,0,0.45)" />
          <rect x="135.5" y="68" width="9" height="56" rx="3.5"
            fill="rgba(251,191,36,0.9)" filter="url(#sk-cut)" />
          <rect x="137" y="70" width="3.5" height="52" rx="1.6"
            fill="rgba(255,255,255,0.22)" />
          <rect x="135.5" y="68" width="9" height="56" rx="3.5" fill="rgba(254,240,190,0.16)">
            <animate attributeName="opacity" values="0.15;0.55;0.15" dur="2.3s" repeatCount="indefinite" />
          </rect>
        </g>

        {/* Drifting embers */}
        {embers.map(({ x, y }, i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4}
            fill="rgba(251,191,36,0.6)">
            <animate attributeName="opacity"
              values="0.1;0.65;0.1"
              dur={`${1.5 + (i * 0.31) % 2.1}s`}
              begin={`${(i * 0.21) % 1.5}s`}
              repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}
