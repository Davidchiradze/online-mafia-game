"use client";

/** Polar point on the seal's centre (140, 96). */
const pt = (deg: number, r: number): [number, number] => [
  140 + Math.cos((deg * Math.PI) / 180) * r,
  96 + Math.sin((deg * Math.PI) / 180) * r,
];

/**
 * SerialKillIndicator
 * Crimson aim: a crosshair reticle centred on the tile, inside the same r50
 * seal with 12 ticks that the mafia/yakuza/doctor indicators use. Fully
 * static — no animation. No background, no borders.
 *
 * The reticle is the tell, not the hue: crimson is close to the mafia and
 * yakuza reds, so on a small tile the crosshair is what separates this from
 * them. Static-vs-breathing is the second cue — every other indicator pulses.
 *
 * WHO SEES THIS is decided by `shouldShowSerialKillIndicator` in
 * `lib/serialKillerTarget.ts`, never here. This component is pure paint.
 */
export default function SerialKillIndicator() {
  // Reticle arms — gap at the centre, reaching to r30.
  const arms = [
    [140, 66, 140, 84], [140, 108, 140, 126],
    [110, 96, 128, 96], [152, 96, 170, 96],
  ];

  const specks = [
    { x: 44, y: 50 }, { x: 60, y: 35 }, { x: 242, y: 45 }, { x: 228, y: 62 },
    { x: 38, y: 118 }, { x: 246, y: 122 }, { x: 52, y: 155 }, { x: 235, y: 148 },
    { x: 85, y: 28 }, { x: 200, y: 24 }, { x: 72, y: 170 }, { x: 215, y: 168 },
    { x: 108, y: 22 }, { x: 175, y: 21 }, { x: 36, y: 88 }, { x: 248, y: 94 },
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
          <filter id="sk-seal-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix type="matrix"
              values="1.6 0 0 0 0.08  0 0 0 0 0  0 0 0 0 0  0 0 0 0.85 0"
              in="blur" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          {/* userSpaceOnUse: an objectBoundingBox region collapses on
              zero-width/height geometry and renders nothing. The reticle arms
              are exactly that — perfectly horizontal and vertical lines. */}
          <filter id="sk-edge" filterUnits="userSpaceOnUse" x="0" y="0" width="280" height="200">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Crimson seal */}
        <circle cx="140" cy="96" r="56" fill="rgba(185,15,15,0.09)" />
        <circle cx="140" cy="96" r="50"
          fill="rgba(40,0,0,0.26)"
          stroke="rgba(220,38,38,0.88)" strokeWidth="3.4"
          filter="url(#sk-seal-glow)" />
        <circle cx="140" cy="96" r="44"
          fill="none" stroke="rgba(220,38,38,0.4)" strokeWidth="1.2" />

        {Array.from({ length: 12 }).map((_, i) => {
          const [x1, y1] = pt(i * 30, 37);
          const [x2, y2] = pt(i * 30, 42);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(248,113,113,0.55)" strokeWidth="1.5" strokeLinecap="round" />
          );
        })}

        {/* Reticle ring and its diagonal ticks */}
        <circle cx="140" cy="96" r="30"
          fill="none" stroke="rgba(220,38,38,0.6)" strokeWidth="1.8" />

        {[45, 135, 225, 315].map((a, i) => {
          const [x1, y1] = pt(a, 24);
          const [x2, y2] = pt(a, 30);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(220,38,38,0.5)" strokeWidth="1.6" strokeLinecap="round" />
          );
        })}

        {arms.map(([x1, y1, x2, y2], i) => (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(60,0,0,0.55)" strokeWidth="5" strokeLinecap="round" />
            <line x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="rgba(220,38,38,0.9)" strokeWidth="2.2" strokeLinecap="round"
              filter="url(#sk-edge)" />
          </g>
        ))}

        <circle cx="140" cy="96" r="4.5" fill="rgba(60,0,0,0.6)" />
        <circle cx="140" cy="96" r="3" fill="rgba(248,113,113,0.95)" />

        {/* Powder burn */}
        {specks.map(({ x, y }, i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4}
            fill={`rgba(248,113,113,${(0.3 + (i % 4) * 0.08).toFixed(2)})`} />
        ))}
      </svg>
    </div>
  );
}
