"use client";

import { ReactNode, useEffect, useState } from "react";

interface FlipCardProps {
  /** Content for the front face of the card */
  front: ReactNode;
  /** Content for the back face of the card */
  back: ReactNode;
  /** Whether the card is flipped to show the back */
  isFlipped: boolean;
  /** Delay before flip animation starts (in ms) */
  flipDelay?: number;
  /** Duration of the flip animation (in ms) */
  flipDuration?: number;
  /** Custom className for the card container */
  className?: string;
  /** Custom className for the front face */
  frontClassName?: string;
  /** Custom className for the back face */
  backClassName?: string;
  /** Card width */
  width?: string;
  /** Card height */
  height?: string;
}

/**
 * FlipCard - A reusable 3D flip card component
 *
 * Features:
 * - Smooth 3D Y-axis rotation animation
 * - Configurable flip delay and duration
 * - Accepts arbitrary front/back content
 * - Proper perspective and backface visibility handling
 */
export default function FlipCard({
  front,
  back,
  isFlipped,
  flipDelay = 0,
  flipDuration = 800,
  className = "",
  frontClassName = "",
  backClassName = "",
  width = "280px",
  height = "400px",
}: FlipCardProps) {
  const [showFlipped, setShowFlipped] = useState(false);

  // Handle delayed flip
  useEffect(() => {
    if (isFlipped) {
      const timer = setTimeout(() => {
        setShowFlipped(true);
      }, flipDelay);
      return () => clearTimeout(timer);
    } else {
      setShowFlipped(false);
    }
  }, [isFlipped, flipDelay]);

  return (
    <div
      className={`relative ${className}`}
      style={{
        width,
        height,
        perspective: "1000px",
      }}
    >
      <div
        className="relative w-full h-full transition-transform ease-out"
        style={{
          transformStyle: "preserve-3d",
          transitionDuration: `${flipDuration}ms`,
          transform: showFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Front Face */}
        <div
          className={`
            absolute inset-0 w-full h-full
            rounded-2xl overflow-hidden
            ${frontClassName}
          `}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
          }}
        >
          {front}
        </div>

        {/* Back Face */}
        <div
          className={`
            absolute inset-0 w-full h-full
            rounded-2xl overflow-hidden
            ${backClassName}
          `}
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {back}
        </div>
      </div>
    </div>
  );
}
