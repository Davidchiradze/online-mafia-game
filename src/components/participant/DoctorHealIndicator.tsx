"use client";

/**
 * DoctorHealIndicator
 * Emerald protective seal with medical cross, vine tendrils,
 * leaf buds, and floating light motes. No background, no borders.
 */
export default function DoctorHealIndicator() {
  const motes = [
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
          <filter id="dh-seal-glow" x="-35%" y="-35%" width="170%" height="170%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feColorMatrix type="matrix"
              values="0 0 0 0 0.08  0.8 0 0 0 0.75  0 0 0 0 0.35  0 0 0 0.85 0"
              in="blur" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="dh-brush" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1.0" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Vine tendrils */}
        <path d="M 102 96 Q 80 82 62 88 Q 44 94 38 82"
          stroke="rgba(22,163,74,0.38)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M 80 85 Q 72 72 64 72"
          stroke="rgba(22,163,74,0.25)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 70 90 Q 58 96 50 108"
          stroke="rgba(22,163,74,0.25)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 178 96 Q 200 82 218 88 Q 236 94 242 82"
          stroke="rgba(22,163,74,0.38)" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M 200 85 Q 208 72 216 72"
          stroke="rgba(22,163,74,0.25)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 210 90 Q 222 96 230 108"
          stroke="rgba(22,163,74,0.25)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M 140 58 Q 130 42 122 36 Q 114 30 108 38"
          stroke="rgba(22,163,74,0.32)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M 140 58 Q 150 42 158 36 Q 166 30 172 38"
          stroke="rgba(22,163,74,0.32)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <path d="M 140 136 Q 130 152 118 156 Q 106 160 102 152"
          stroke="rgba(22,163,74,0.28)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M 140 136 Q 150 152 162 156 Q 174 160 178 152"
          stroke="rgba(22,163,74,0.28)" strokeWidth="1.1" fill="none" strokeLinecap="round" />

        {/* Leaf buds */}
        {[
          { cx: 62, cy: 88, r: 1.6 }, { cx: 38, cy: 82, r: 1.3 }, { cx: 64, cy: 72, r: 1.2 },
          { cx: 218, cy: 88, r: 1.6 }, { cx: 242, cy: 82, r: 1.3 }, { cx: 216, cy: 72, r: 1.2 },
          { cx: 108, cy: 38, r: 1.4 }, { cx: 172, cy: 38, r: 1.4 },
          { cx: 102, cy: 152, r: 1.3 }, { cx: 178, cy: 152, r: 1.3 },
        ].map(({ cx, cy, r }, i) => (
          <circle key={i} cx={cx} cy={cy} r={r} fill="rgba(52,211,153,0.55)" />
        ))}

        {/* Emerald protective seal */}
        <circle cx="140" cy="96" r="54"
          fill="rgba(16,185,129,0.07)">
          <animate attributeName="opacity" values="0.5;0.12;0.5" dur="2.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="140" cy="96" r="50"
          fill="rgba(0,60,30,0.25)"
          stroke="rgba(16,185,129,0.85)" strokeWidth="3.2"
          filter="url(#dh-seal-glow)" />
        <circle cx="140" cy="96" r="44"
          fill="none" stroke="rgba(16,185,129,0.5)" strokeWidth="1.2" />
        <circle cx="140" cy="96" r="40"
          fill="none" stroke="rgba(16,185,129,0.22)" strokeWidth="0.7" />

        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 30 * Math.PI) / 180;
          const r1 = 37, r2 = 42;
          return (
            <line key={i}
              x1={140 + Math.cos(angle) * r1} y1={96 + Math.sin(angle) * r1}
              x2={140 + Math.cos(angle) * r2} y2={96 + Math.sin(angle) * r2}
              stroke="rgba(52,211,153,0.58)" strokeWidth="1.5" strokeLinecap="round" />
          );
        })}

        {/* Medical cross */}
        <rect x="128" y="67" width="24" height="58" rx="4" fill="rgba(5,80,40,0.30)" />
        <rect x="111" y="84" width="58" height="24" rx="4" fill="rgba(5,80,40,0.30)" />
        <rect x="129" y="68" width="22" height="56" rx="3.5" fill="rgba(16,185,129,0.16)" />
        <rect x="112" y="85" width="56" height="22" rx="3.5" fill="rgba(16,185,129,0.16)" />
        <rect x="131" y="70" width="18" height="52" rx="3"
          fill="rgba(16,185,129,0.82)" filter="url(#dh-brush)" />
        <rect x="114" y="87" width="52" height="18" rx="3"
          fill="rgba(16,185,129,0.82)" filter="url(#dh-brush)" />
        <rect x="131" y="70" width="18" height="52" rx="3" fill="rgba(167,243,208,0.14)">
          <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <rect x="114" y="87" width="52" height="18" rx="3" fill="rgba(167,243,208,0.14)">
          <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2.2s" repeatCount="indefinite" />
        </rect>
        <rect x="133" y="71" width="7" height="50" rx="2" fill="rgba(255,255,255,0.14)" />
        <rect x="115" y="89" width="50" height="7" rx="2" fill="rgba(255,255,255,0.14)" />
        <rect x="133" y="89" width="14" height="14" rx="2" fill="rgba(0,40,20,0.35)" />
        <circle cx="140" cy="96" r="5" fill="rgba(52,211,153,0.6)" />
        <circle cx="140" cy="96" r="2.5" fill="rgba(167,243,208,0.8)">
          <animate attributeName="opacity" values="0.6;1;0.6" dur="2.2s" repeatCount="indefinite" />
        </circle>

        {/* Floating light motes */}
        {motes.map(({ x, y }, i) => (
          <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4}
            fill="rgba(52,211,153,0.55)">
            <animate attributeName="opacity"
              values="0.1;0.6;0.1"
              dur={`${1.6 + (i * 0.28) % 2.2}s`}
              begin={`${(i * 0.18) % 1.4}s`}
              repeatCount="indefinite" />
          </circle>
        ))}
      </svg>
    </div>
  );
}
