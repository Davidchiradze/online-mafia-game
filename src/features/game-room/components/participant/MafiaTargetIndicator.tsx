"use client";

/**
 * MafiaTargetIndicator
 * Brush-stroke X death mark with ink splatter and wax seal.
 * No background, no borders — just the central mark over the player tile.
 */
export default function MafiaTargetIndicator() {
  const splatter = [
    { x: 134, y: 93, r: 3.0 }, { x: 148, y: 103, r: 2.0 }, { x: 130, y: 106, r: 3.8 },
    { x: 151, y: 90, r: 2.2 }, { x: 137, y: 86, r: 1.6 }, { x: 155, y: 110, r: 3.0 },
    { x: 125, y: 97, r: 1.8 }, { x: 158, y: 93, r: 1.4 }, { x: 133, y: 112, r: 2.4 },
    { x: 148, y: 82, r: 2.0 }, { x: 122, y: 91, r: 2.8 }, { x: 160, y: 104, r: 1.6 },
    { x: 68, y: 42, r: 1.8 }, { x: 56, y: 33, r: 1.2 }, { x: 79, y: 52, r: 2.4 },
    { x: 214, y: 152, r: 1.6 }, { x: 224, y: 163, r: 2.0 }, { x: 202, y: 142, r: 1.4 },
    { x: 212, y: 42, r: 2.0 }, { x: 224, y: 32, r: 1.4 }, { x: 200, y: 50, r: 2.6 },
    { x: 66, y: 155, r: 1.8 }, { x: 54, y: 167, r: 1.2 }, { x: 80, y: 144, r: 2.2 },
  ];

  return (
    <div className="absolute inset-0 z-[28] pointer-events-none overflow-hidden rounded-xl">
      <svg
        className="w-full h-full"
        viewBox="0 0 280 200"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <filter id="mt-brush" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="mt-drip-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feColorMatrix type="matrix"
              values="1.5 0 0 0 0.1  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0"
              in="blur" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Brush-stroke X */}
        <path d="M 48 22 C 94 59 118 79 140 98 C 162 117 186 137 234 172"
          stroke="rgba(140,0,0,0.22)" strokeWidth="38" strokeLinecap="round" fill="none" />
        <path d="M 48 22 C 94 59 118 79 140 98 C 162 117 186 137 234 172"
          stroke="rgba(180,0,0,0.30)" strokeWidth="26" strokeLinecap="round" fill="none" />
        <path d="M 48 22 C 94 59 118 79 140 98 C 162 117 186 137 234 172"
          stroke="rgba(210,25,25,0.88)" strokeWidth="18" strokeLinecap="round" fill="none"
          filter="url(#mt-brush)" />
        <path d="M 50 23 C 95 60 118 80 140 98 C 162 116 186 136 233 171"
          stroke="rgba(255,90,90,0.22)" strokeWidth="6" strokeLinecap="round" fill="none" />

        <path d="M 234 22 C 186 59 162 79 140 98 C 118 117 94 137 48 172"
          stroke="rgba(140,0,0,0.22)" strokeWidth="38" strokeLinecap="round" fill="none" />
        <path d="M 234 22 C 186 59 162 79 140 98 C 118 117 94 137 48 172"
          stroke="rgba(180,0,0,0.30)" strokeWidth="26" strokeLinecap="round" fill="none" />
        <path d="M 234 22 C 186 59 162 79 140 98 C 118 117 94 137 48 172"
          stroke="rgba(210,25,25,0.88)" strokeWidth="18" strokeLinecap="round" fill="none"
          filter="url(#mt-brush)" />
        <path d="M 232 23 C 185 60 162 80 140 98 C 118 116 94 136 50 171"
          stroke="rgba(255,90,90,0.22)" strokeWidth="6" strokeLinecap="round" fill="none" />

        {/* Ink tips */}
        {[
          { cx: 44, cy: 20 }, { cx: 236, cy: 20 },
          { cx: 44, cy: 174 }, { cx: 236, cy: 174 },
        ].map(({ cx, cy }, i) => (
          <g key={i}>
            <ellipse cx={cx} cy={cy} rx="5" ry="7"
              transform={`rotate(${i < 2 ? 30 : -30}, ${cx}, ${cy})`}
              fill="rgba(185,15,15,0.7)" />
            <ellipse cx={cx} cy={cy} rx="2.5" ry="3.5"
              transform={`rotate(${i < 2 ? 30 : -30}, ${cx}, ${cy})`}
              fill="rgba(220,30,30,0.5)" />
          </g>
        ))}

        {/* Ink splatter */}
        {splatter.map(({ x, y, r }, i) => (
          <circle key={i} cx={x} cy={y} r={r}
            fill="rgba(185,15,15,0.65)"
            opacity={0.4 + (i % 5) * 0.1} />
        ))}

        {/* Centre wax seal */}
        <circle cx="140" cy="98" r="16"
          stroke="rgba(200,20,20,0.72)" strokeWidth="1.6"
          fill="rgba(0,0,0,0.55)" filter="url(#mt-drip-glow)">
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="1.8s" repeatCount="indefinite" />
        </circle>
        <text x="140" y="103" textAnchor="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize="14" fontWeight="900" fill="rgba(220,30,30,0.85)">M</text>
      </svg>
    </div>
  );
}
