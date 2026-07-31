"use client";

import { useTranslations } from "next-intl";

interface DeadCoverProps {
  className?: string;
}

export default function DeadCover({ className = "" }: DeadCoverProps) {
  const tg = useTranslations("game");
  return (
    <div className={`absolute inset-0 z-10 pointer-events-none ${className}`}>
      {/* Blood-red atmospheric overlay */}
      <div className="absolute inset-0 bg-dead-overlay" />

      {/* X crossing lines */}
      <div className="absolute inset-0 opacity-[0.18]">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 280 200"
          preserveAspectRatio="none"
        >
          <line
            x1="20"
            y1="20"
            x2="260"
            y2="180"
            stroke="#8b0000"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="260"
            y1="20"
            x2="20"
            y2="180"
            stroke="#8b0000"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Red radial glow */}
      <div className="absolute inset-0 bg-dead-glow" />

      {/* Central skull */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex flex-col items-center -mt-3">
          <div
            className="absolute inset-0 m-auto animate-ping bg-dead-ping rounded-full"
            style={{ width: "90px", height: "90px" }}
          />
          <svg
            width="72"
            height="72"
            viewBox="0 0 100 100"
            fill="none"
            className="opacity-85 drop-shadow-[0_0_14px_rgba(180,0,0,0.7)]"
          >
            <ellipse
              cx="50"
              cy="42"
              rx="30"
              ry="28"
              fill="rgba(139,0,0,0.7)"
              stroke="rgba(200,0,0,0.8)"
              strokeWidth="1.5"
            />
            <rect
              x="32"
              y="62"
              width="36"
              height="14"
              rx="4"
              fill="rgba(100,0,0,0.8)"
              stroke="rgba(180,0,0,0.6)"
              strokeWidth="1"
            />
            <rect
              x="34"
              y="64"
              width="7"
              height="8"
              rx="1"
              fill="rgba(200,0,0,0.5)"
              stroke="rgba(220,0,0,0.4)"
              strokeWidth="0.5"
            />
            <rect
              x="43"
              y="64"
              width="7"
              height="9"
              rx="1"
              fill="rgba(200,0,0,0.5)"
              stroke="rgba(220,0,0,0.4)"
              strokeWidth="0.5"
            />
            <rect
              x="52"
              y="64"
              width="7"
              height="8"
              rx="1"
              fill="rgba(200,0,0,0.5)"
              stroke="rgba(220,0,0,0.4)"
              strokeWidth="0.5"
            />
            <ellipse
              cx="37"
              cy="42"
              rx="9"
              ry="10"
              fill="rgba(5,0,0,0.9)"
              stroke="rgba(160,0,0,0.6)"
              strokeWidth="1"
            />
            <ellipse
              cx="63"
              cy="42"
              rx="9"
              ry="10"
              fill="rgba(5,0,0,0.9)"
              stroke="rgba(160,0,0,0.6)"
              strokeWidth="1"
            />
            <ellipse cx="37" cy="42" rx="4" ry="5" fill="rgba(180,0,0,0.3)" />
            <ellipse cx="63" cy="42" rx="4" ry="5" fill="rgba(180,0,0,0.3)" />
            <path
              d="M47 53 L50 47 L53 53 Z"
              fill="rgba(5,0,0,0.8)"
              stroke="rgba(140,0,0,0.5)"
              strokeWidth="0.8"
            />
            <path
              d="M50 18 L52 30 L48 38"
              stroke="rgba(220,0,0,0.4)"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d="M68 25 L62 34"
              stroke="rgba(180,0,0,0.3)"
              strokeWidth="0.8"
              fill="none"
              strokeLinecap="round"
            />
          </svg>

          {/* ELIMINATED label */}
          <div className="mt-2 px-3 py-1 relative bg-dead-label border-t border-b border-red-900/40">
            <span className="block font-orbitron text-[0.6rem] font-black tracking-[0.25em] text-red-700/75 text-shadow-red-glow">
              {tg("eliminated")}
            </span>
          </div>
        </div>
      </div>

      {/* Bullet holes */}
      <div className="absolute top-10 right-6 opacity-50">
        <svg width="16" height="16" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="4"
            fill="rgba(0,0,0,0.9)"
            stroke="rgba(139,0,0,0.7)"
            strokeWidth="1.5"
          />
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="rgba(139,0,0,0.3)"
            strokeWidth="1"
          />
          <path
            d="M10 3 L10 0M10 17 L10 20M3 10 L0 10M17 10 L20 10M4.6 4.6 L2.4 2.4M15.4 15.4 L17.6 17.6M15.4 4.6 L17.6 2.4M4.6 15.4 L2.4 17.6"
            stroke="rgba(139,0,0,0.4)"
            strokeWidth="0.8"
          />
        </svg>
      </div>
      <div className="absolute top-14 left-8 opacity-35">
        <svg width="12" height="12" viewBox="0 0 20 20">
          <circle
            cx="10"
            cy="10"
            r="4"
            fill="rgba(0,0,0,0.9)"
            stroke="rgba(139,0,0,0.6)"
            strokeWidth="1.5"
          />
          <circle
            cx="10"
            cy="10"
            r="7"
            fill="none"
            stroke="rgba(139,0,0,0.25)"
            strokeWidth="1"
          />
          <path
            d="M10 3 L10 0M10 17 L10 20M3 10 L0 10M17 10 L20 10"
            stroke="rgba(139,0,0,0.3)"
            strokeWidth="0.8"
          />
        </svg>
      </div>
    </div>
  );
}
