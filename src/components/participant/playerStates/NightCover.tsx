import { STARS, RAIN_A, RAIN_B } from "./constants";

interface NightCoverProps {
  className?: string;
}

export default function NightCover({ className = "" }: NightCoverProps) {
  return (
    <div className={`absolute inset-0 z-10 ${className}`}>
      {/* Deep oppressive night sky */}
      <div className="absolute inset-0 bg-night-sky" />

      {/* Blood-moon ambient bleed */}
      <div
        className="absolute -top-5 -right-2.5 w-[100px] h-[100px] bg-moon-ambient blur-[12px]"
      />

      {/* Rain streaks */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.18]">
        <svg width="100%" height="100%" viewBox="0 0 280 200" preserveAspectRatio="none">
          {RAIN_A.map((x, i) => (
            <line key={i} x1={x} y1={-5 + (i % 3) * 8} x2={x - 4} y2={40 + (i % 4) * 15} stroke="rgba(160,170,210,0.6)" strokeWidth="0.5" />
          ))}
          {RAIN_B.map((x, i) => (
            <line key={`b${i}`} x1={x} y1={50 + (i % 3) * 10} x2={x - 4} y2={100 + (i % 4) * 18} stroke="rgba(140,150,190,0.4)" strokeWidth="0.4" />
          ))}
        </svg>
      </div>

      {/* City skyline */}
      <div className="absolute bottom-0 left-0 right-0 h-20">
        <svg width="100%" height="80" viewBox="0 0 280 80" preserveAspectRatio="none">
          <rect x="0" y="52" width="20" height="28" fill="rgba(5,4,10,0.98)" />
          <rect x="4" y="44" width="12" height="9" fill="rgba(5,4,10,0.98)" />
          <rect x="20" y="56" width="16" height="24" fill="rgba(6,4,12,0.97)" />
          <rect x="36" y="36" width="14" height="44" fill="rgba(4,3,9,0.99)" />
          <rect x="39" y="30" width="3" height="7" fill="rgba(4,3,9,0.99)" />
          <circle cx="40" cy="29" r="1.2" fill="rgba(200,40,40,0.7)" />
          <rect x="50" y="44" width="22" height="36" fill="rgba(6,4,11,0.98)" />
          <rect x="54" y="37" width="14" height="8" fill="rgba(6,4,11,0.98)" />
          <rect x="72" y="55" width="12" height="25" fill="rgba(5,4,10,0.97)" />
          <rect x="84" y="38" width="18" height="42" fill="rgba(5,3,10,0.99)" />
          <rect x="87" y="31" width="4" height="8" fill="rgba(5,3,10,0.99)" />
          <circle cx="89" cy="30" r="1.2" fill="rgba(180,30,30,0.65)" />
          <rect x="102" y="48" width="14" height="32" fill="rgba(4,3,9,0.98)" />
          <rect x="116" y="40" width="20" height="40" fill="rgba(5,4,11,0.99)" />
          <rect x="119" y="32" width="5" height="9" fill="rgba(5,4,11,0.99)" />
          <rect x="136" y="55" width="16" height="25" fill="rgba(6,4,10,0.97)" />
          <rect x="152" y="42" width="12" height="38" fill="rgba(5,3,9,0.98)" />
          <rect x="164" y="35" width="24" height="45" fill="rgba(4,3,10,0.99)" />
          <rect x="168" y="27" width="6" height="9" fill="rgba(4,3,10,0.99)" />
          <circle cx="171" cy="26" r="1.2" fill="rgba(200,35,35,0.7)" />
          <rect x="188" y="50" width="18" height="30" fill="rgba(5,4,11,0.97)" />
          <rect x="206" y="38" width="14" height="42" fill="rgba(4,3,9,0.99)" />
          <rect x="220" y="45" width="16" height="35" fill="rgba(6,4,12,0.98)" />
          <rect x="236" y="32" width="20" height="48" fill="rgba(5,3,10,0.99)" />
          <rect x="239" y="24" width="5" height="9" fill="rgba(5,3,10,0.99)" />
          <circle cx="241" cy="23" r="1.2" fill="rgba(190,30,30,0.65)" />
          <rect x="256" y="46" width="14" height="34" fill="rgba(4,3,9,0.98)" />
          <rect x="266" y="40" width="14" height="40" fill="rgba(5,4,11,0.97)" />
          {/* Dim windows */}
          <rect x="55" y="47" width="3" height="2" fill="rgba(255,200,80,0.22)" />
          <rect x="61" y="47" width="3" height="2" fill="rgba(220,60,60,0.2)" />
          <rect x="87" y="41" width="3" height="2" fill="rgba(255,200,80,0.2)" />
          <rect x="87" y="47" width="3" height="2" fill="rgba(220,60,60,0.18)" />
          <rect x="117" y="44" width="3" height="2" fill="rgba(255,190,70,0.22)" />
          <rect x="166" y="39" width="3" height="2" fill="rgba(255,200,80,0.2)" />
          <rect x="172" y="45" width="3" height="2" fill="rgba(220,50,50,0.22)" />
          <rect x="237" y="36" width="3" height="2" fill="rgba(255,200,80,0.2)" />
          {/* Ground */}
          <rect x="0" y="74" width="280" height="6" fill="rgba(12,8,18,0.9)" />
          <rect x="0" y="76" width="280" height="2" fill="rgba(80,30,40,0.15)" />
        </svg>
      </div>

      {/* Ground fog */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-night-fog" />

      {/* Blood moon */}
      <div className="absolute top-2.5 right-5">
        <div className="absolute -inset-3 animate-pulse duration-3000 bg-night-moon-glow rounded-full blur-[6px]" />
        <svg width="28" height="28" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="10" fill="rgba(90,15,15,0.6)" stroke="rgba(180,40,40,0.5)" strokeWidth="0.8" />
          <circle cx="25" cy="17" r="8" fill="rgba(8,3,5,0.85)" />
          <circle cx="14" cy="22" r="1.5" fill="rgba(60,10,10,0.5)" />
          <circle cx="18" cy="17" r="1" fill="rgba(60,10,10,0.4)" />
        </svg>
      </div>

      {/* Stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse duration-3000"
          style={{
            left: `${star.x}px`,
            top: `${star.y}px`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: i % 3 === 0 ? "rgba(255,160,160,0.6)" : "rgba(200,210,240,0.55)",
            boxShadow: i % 3 === 0 ? "0 0 3px rgba(200,80,80,0.4)" : "0 0 2px rgba(160,180,220,0.4)",
            animationDelay: star.delay,
          }}
        />
      ))}

      {/* Armed hitman silhouette */}
      <div className="absolute bottom-[54px] left-1/2 -translate-x-1/2">
        <svg
          width="58"
          height="62"
          viewBox="0 0 58 62"
          fill="none"
          className="opacity-85 drop-shadow-[0_0_8px_rgba(180,20,20,0.35)]"
        >
          <ellipse cx="26" cy="59" rx="14" ry="2.5" fill="rgba(5,2,5,0.7)" />
          <path d="M18 42 L14 58 L18 58 L20 48 Z" fill="rgba(8,5,12,0.98)" />
          <path d="M28 42 L30 58 L34 58 L30 48 Z" fill="rgba(8,5,12,0.98)" />
          <rect x="12" y="55" width="8" height="4" rx="1.5" fill="rgba(5,3,8,0.99)" />
          <rect x="29" y="55" width="8" height="4" rx="1.5" fill="rgba(5,3,8,0.99)" />
          <path d="M14 24 L10 44 L20 44 L22 34 L24 44 L34 44 L32 28 Q26 32 20 32 Q16 30 14 24Z" fill="rgba(8,5,12,0.98)" />
          <path d="M10 30 L6 44 L12 44 L14 32Z" fill="rgba(10,6,14,0.9)" />
          <rect x="16" y="20" width="16" height="13" rx="2" fill="rgba(9,6,13,0.99)" />
          <path d="M16 20 L20 24 L24 20" stroke="rgba(30,15,35,0.8)" strokeWidth="1.5" fill="none" />
          <rect x="20" y="14" width="7" height="7" rx="1" fill="rgba(9,6,13,0.98)" />
          <ellipse cx="23" cy="11" rx="7" ry="6" fill="rgba(8,5,12,0.99)" />
          <ellipse cx="23" cy="7" rx="10" ry="2.5" fill="rgba(5,3,8,0.99)" stroke="rgba(40,20,50,0.5)" strokeWidth="0.5" />
          <rect x="14" y="4" width="18" height="5" rx="1.5" fill="rgba(5,3,8,0.99)" />
          <rect x="14" y="7.5" width="18" height="1" fill="rgba(80,20,20,0.6)" />
          <path d="M32 22 L44 14 L42 12 L30 20Z" fill="rgba(8,5,12,0.97)" />
          <rect x="40" y="9" width="14" height="5" rx="1" fill="rgba(6,4,10,0.99)" stroke="rgba(50,20,20,0.4)" strokeWidth="0.5" />
          <rect x="52" y="10.5" width="5" height="2" rx="0.5" fill="rgba(5,3,8,0.99)" />
          <circle cx="57" cy="11.5" r="1.5" fill="rgba(255,140,20,0.25)" />
          <path d="M16 24 L8 32 L10 34 L18 27Z" fill="rgba(8,5,12,0.95)" />
          <circle cx="25" cy="12" r="1" fill="rgba(180,30,30,0.7)" />
        </svg>
      </div>

      {/* Ground puddle reflection */}
      <div className="absolute bottom-[50px] left-1/2 -translate-x-1/2 w-[50px] h-2 bg-night-puddle blur-[3px]" />

      {/* NIGHT FALLS label */}
      <div className="absolute top-3 left-2.5">
        <span className="block font-orbitron text-[0.48rem] font-bold tracking-[0.2em] text-red-800/55 text-shadow-night">
          NIGHT FALLS
        </span>
      </div>

      {/* Top vignette */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-night-vignette" />
    </div>
  );
}
