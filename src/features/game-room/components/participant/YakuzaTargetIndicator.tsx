"use client";

/**
 * YakuzaTargetIndicator
 * Sumi ink brushstroke, red hanko death seal with 死 kanji,
 * sakura petals, and 山口組 label. No background, no borders.
 */
export default function YakuzaTargetIndicator() {
  const petals = [
    { x: 42, y: 44, s: 0.9, r: -18 }, { x: 54, y: 62, s: 0.65, r: 25 },
    { x: 238, y: 40, s: 0.85, r: 12 }, { x: 248, y: 60, s: 0.7, r: -30 },
    { x: 36, y: 128, s: 0.6, r: 40 }, { x: 246, y: 135, s: 0.75, r: -20 },
    { x: 50, y: 162, s: 0.7, r: 15 }, { x: 240, y: 158, s: 0.65, r: -10 },
    { x: 88, y: 28, s: 0.55, r: 35 }, { x: 196, y: 25, s: 0.6, r: -25 },
    { x: 72, y: 174, s: 0.5, r: 20 }, { x: 210, y: 170, s: 0.58, r: -15 },
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
          <filter id="yt-ink" x="-8%" y="-8%" width="116%" height="116%">
            <feGaussianBlur stdDeviation="1.4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="yt-seal-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix type="matrix"
              values="1.8 0 0 0 0.05  0 0 0 0 0  0 0 0 0 0  0 0 0 0.85 0"
              in="blur" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Sumi ink brushstroke */}
        <path d="M 52 28 C 86 54 114 74 140 95 C 166 116 196 138 232 166"
          stroke="rgba(60,10,100,0.55)" strokeWidth="28" strokeLinecap="round" fill="none" />
        <path d="M 52 28 C 86 54 114 74 140 95 C 166 116 196 138 232 166"
          stroke="rgba(80,20,140,0.38)" strokeWidth="14" strokeLinecap="round" fill="none"
          filter="url(#yt-ink)" />
        <path d="M 52 28 C 86 54 114 74 140 95 C 166 116 196 138 232 166"
          stroke="rgba(110,30,180,0.20)" strokeWidth="5" strokeLinecap="round" fill="none" />

        {/* Red hanko seal */}
        <g transform="rotate(8, 140, 96)">
          <circle cx="140" cy="96" r="50"
            fill="rgba(180,0,0,0.15)"
            stroke="rgba(210,30,30,0.88)" strokeWidth="3.5"
            filter="url(#yt-seal-glow)" />
          <circle cx="140" cy="96" r="44"
            fill="rgba(160,0,0,0.10)"
            stroke="rgba(210,30,30,0.55)" strokeWidth="1.2" />
          <circle cx="140" cy="96" r="40"
            fill="none"
            stroke="rgba(210,30,30,0.25)" strokeWidth="0.7" />

          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const r1 = 37, r2 = 42;
            return (
              <line key={i}
                x1={140 + Math.cos(angle) * r1} y1={96 + Math.sin(angle) * r1}
                x2={140 + Math.cos(angle) * r2} y2={96 + Math.sin(angle) * r2}
                stroke="rgba(220,40,40,0.6)" strokeWidth="1.5" strokeLinecap="round" />
            );
          })}

          <text x="140" y="115"
            textAnchor="middle"
            fontFamily="'Hiragino Mincho Pro', 'Noto Serif JP', 'Yu Mincho', Georgia, serif"
            fontSize="56" fontWeight="900"
            fill="rgba(200,0,0,0.18)"
            style={{ filter: "blur(6px)" }}>
            死
          </text>
          <text x="140" y="115"
            textAnchor="middle"
            fontFamily="'Hiragino Mincho Pro', 'Noto Serif JP', 'Yu Mincho', Georgia, serif"
            fontSize="56" fontWeight="900"
            fill="rgba(225,35,35,0.92)">
            死
          </text>
        </g>

        <circle cx="140" cy="96" r="56"
          fill="rgba(160,0,0,0.08)">
          <animate attributeName="opacity" values="0.6;0.15;0.6" dur="2.4s" repeatCount="indefinite" />
        </circle>

        {/* Sakura petals */}
        {petals.map(({ x, y, s, r }, i) => (
          <g key={i} transform={`translate(${x},${y}) scale(${s}) rotate(${r})`} opacity="0.62">
            {[0, 72, 144, 216, 288].map((a, j) => {
              const rad = (a * Math.PI) / 180;
              return (
                <ellipse key={j}
                  cx={Math.cos(rad) * 5.5} cy={Math.sin(rad) * 5.5}
                  rx="3.8" ry="2.2"
                  transform={`rotate(${a + 18}, ${Math.cos(rad) * 5.5}, ${Math.sin(rad) * 5.5})`}
                  fill="rgba(210,160,200,0.65)" />
              );
            })}
            <circle cx="0" cy="0" r="1.6" fill="rgba(230,180,210,0.75)" />
          </g>
        ))}

        {/* 山口組 label */}
        <text x="140" y="16" textAnchor="middle"
          fontFamily="'Hiragino Mincho Pro', 'Noto Serif JP', Georgia, serif"
          fontSize="8" fontWeight="700" fill="rgba(130,60,200,0.7)" letterSpacing="5">
          山口組
        </text>
      </svg>
    </div>
  );
}
