const PARTICLES = [
  { x: 12, y: 25, size: 2.5, delay: "0s", dur: "4s", color: "rgba(140,120,255,0.5)" },
  { x: 45, y: 60, size: 1.8, delay: "1.2s", dur: "5s", color: "rgba(180,160,255,0.4)" },
  { x: 78, y: 15, size: 2, delay: "0.5s", dur: "4.5s", color: "rgba(120,200,255,0.45)" },
  { x: 130, y: 45, size: 3, delay: "2s", dur: "6s", color: "rgba(160,130,255,0.35)" },
  { x: 195, y: 30, size: 1.5, delay: "0.8s", dur: "3.5s", color: "rgba(100,180,255,0.5)" },
  { x: 230, y: 70, size: 2.2, delay: "1.5s", dur: "5.5s", color: "rgba(170,140,255,0.4)" },
  { x: 260, y: 20, size: 1.8, delay: "2.5s", dur: "4s", color: "rgba(130,160,255,0.45)" },
  { x: 55, y: 85, size: 2, delay: "3s", dur: "5s", color: "rgba(150,120,255,0.35)" },
  { x: 160, y: 80, size: 1.5, delay: "0.3s", dur: "4.2s", color: "rgba(120,170,255,0.4)" },
  { x: 100, y: 100, size: 2.5, delay: "1.8s", dur: "5.8s", color: "rgba(140,100,255,0.3)" },
  { x: 210, y: 110, size: 1.8, delay: "0.7s", dur: "3.8s", color: "rgba(180,150,255,0.35)" },
  { x: 35, y: 120, size: 2, delay: "2.2s", dur: "4.5s", color: "rgba(110,160,255,0.4)" },
];

const STARS = [
  { x: 14, y: 14, size: 1, delay: "0s", warm: false },
  { x: 40, y: 22, size: 1.3, delay: "1.1s", warm: true },
  { x: 65, y: 8, size: 0.9, delay: "0.6s", warm: false },
  { x: 95, y: 18, size: 1.1, delay: "1.8s", warm: true },
  { x: 120, y: 6, size: 1.3, delay: "0.3s", warm: false },
  { x: 150, y: 16, size: 0.8, delay: "2.2s", warm: true },
  { x: 180, y: 10, size: 1.1, delay: "0.9s", warm: false },
  { x: 210, y: 22, size: 1.2, delay: "1.5s", warm: true },
  { x: 245, y: 14, size: 0.9, delay: "0.4s", warm: false },
];

interface NightCoverProps {
  className?: string;
}

export default function NightCover({ className = "" }: NightCoverProps) {
  return (
    <div className={`absolute inset-0 z-10 ${className}`}>
      {/* Deep indigo/midnight gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(160deg, rgba(8,6,30,0.98) 0%, rgba(15,10,45,0.96) 30%, rgba(20,12,55,0.95) 55%, rgba(10,8,35,0.98) 100%)",
        }}
      />

      {/* Purple ambient glow from center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 60%, rgba(80,40,140,0.12) 0%, rgba(50,25,100,0.06) 40%, transparent 70%)",
        }}
      />

      {/* Floating luminous particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 ${p.size * 3}px ${p.color}, 0 0 ${p.size * 6}px ${p.color.replace(/[\d.]+\)$/, "0.15)")}`,
            animationDelay: p.delay,
            animationDuration: p.dur,
          }}
        />
      ))}

      {/* Silver crescent moon */}
      <div className="absolute" style={{ top: "8px", right: "18px" }}>
        <div
          className="absolute animate-pulse"
          style={{
            inset: "-10px",
            background: "radial-gradient(circle, rgba(140,160,255,0.15) 0%, transparent 65%)",
            borderRadius: "50%",
            filter: "blur(5px)",
            animationDuration: "4s",
          }}
        />
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="10" fill="rgba(180,190,230,0.4)" stroke="rgba(200,210,255,0.5)" strokeWidth="0.8" />
          <circle cx="26" cy="17" r="9" fill="rgba(8,6,30,0.95)" />
        </svg>
      </div>

      {/* Twinkling stars */}
      {STARS.map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${star.x}px`,
            top: `${star.y}px`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            background: star.warm ? "rgba(200,180,255,0.6)" : "rgba(180,200,255,0.7)",
            boxShadow: star.warm ? "0 0 3px rgba(180,160,255,0.4)" : "0 0 3px rgba(160,190,255,0.5)",
            animationDelay: star.delay,
            animationDuration: "3s",
          }}
        />
      ))}

      {/* Mysterious masked figure silhouette */}
      <div className="absolute" style={{ bottom: "48px", left: "50%", transform: "translateX(-50%)" }}>
        <svg
          width="54"
          height="58"
          viewBox="0 0 54 58"
          fill="none"
          style={{
            filter:
              "drop-shadow(0 0 12px rgba(80,50,160,0.4)) drop-shadow(0 2px 6px rgba(0,0,0,0.8))",
            opacity: 0.8,
          }}
        >
          {/* Ground shadow */}
          <ellipse cx="27" cy="56" rx="16" ry="2" fill="rgba(20,15,50,0.6)" />
          {/* Body — trench coat */}
          <path d="M17 38 L13 55 L17 55 L19 44 Z" fill="rgba(12,8,30,0.98)" />
          <path d="M30 38 L33 55 L37 55 L33 44 Z" fill="rgba(12,8,30,0.98)" />
          <path
            d="M13 22 L9 42 L19 42 L21 32 L23 42 L35 42 L33 26 Q27 30 21 30 Q16 28 13 22Z"
            fill="rgba(12,8,30,0.98)"
          />
          {/* Collar */}
          <path d="M13 22 L18 28 L21 23" stroke="rgba(50,35,90,0.5)" strokeWidth="1" fill="none" />
          <path d="M33 26 L28 30 L25 25" stroke="rgba(50,35,90,0.5)" strokeWidth="1" fill="none" />
          {/* Head */}
          <ellipse cx="23" cy="12" rx="7" ry="6.5" fill="rgba(10,7,25,0.99)" />
          {/* Fedora */}
          <ellipse cx="23" cy="7" rx="11" ry="2.5" fill="rgba(8,5,22,0.99)" stroke="rgba(60,40,120,0.4)" strokeWidth="0.5" />
          <rect x="14" y="4" width="18" height="5" rx="1.5" fill="rgba(8,5,22,0.99)" />
          <rect x="14" y="7.5" width="18" height="1" fill="rgba(100,60,180,0.4)" />
          {/* Glowing eyes — eerie purple */}
          <circle cx="20" cy="12" r="1.2" fill="rgba(140,80,255,0.8)" />
          <circle cx="26" cy="12" r="1.2" fill="rgba(140,80,255,0.8)" />
          <circle cx="20" cy="12" r="2.5" fill="none" stroke="rgba(140,80,255,0.2)" strokeWidth="0.5" />
          <circle cx="26" cy="12" r="2.5" fill="none" stroke="rgba(140,80,255,0.2)" strokeWidth="0.5" />
        </svg>
      </div>

      {/* Smoke wisps — indigo mist rising from bottom */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "70px" }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(0deg, rgba(15,10,40,0.8) 0%, rgba(20,15,50,0.4) 40%, rgba(25,18,60,0.15) 70%, transparent 100%)",
          }}
        />
        <svg width="100%" height="70" viewBox="0 0 280 70" preserveAspectRatio="none" style={{ opacity: 0.3 }}>
          <path
            d="M0 65 Q30 55 60 60 Q90 50 120 58 Q150 48 180 55 Q210 45 240 52 Q260 48 280 55 L280 70 L0 70Z"
            fill="rgba(60,40,120,0.3)"
          />
          <path
            d="M0 60 Q40 50 80 55 Q120 42 160 50 Q200 40 240 48 Q260 44 280 50 L280 70 L0 70Z"
            fill="rgba(40,25,80,0.25)"
          />
        </svg>
      </div>

      {/* NIGHT FALLS label — cool indigo */}
      <div className="absolute" style={{ top: "12px", left: "10px" }}>
        <span
          style={{
            fontFamily: "Orbitron, sans-serif",
            fontSize: "0.48rem",
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "rgba(140,130,220,0.6)",
            textShadow: "0 0 10px rgba(100,80,200,0.5)",
            display: "block",
          }}
        >
          NIGHT FALLS
        </span>
      </div>

      {/* Top vignette */}
      <div
        className="absolute top-0 left-0 right-0 h-14"
        style={{ background: "linear-gradient(180deg, rgba(8,6,28,0.7) 0%, transparent 100%)" }}
      />
    </div>
  );
}
