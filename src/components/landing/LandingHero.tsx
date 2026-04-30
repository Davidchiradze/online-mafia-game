"use client";

import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { GlowButton } from "./GlowButton";
import { GlassButton } from "./GlassButton";

const HERO_IMG = "https://www.mafia.ge/templates/newassets/img/mafiabg.jpg";
const HERO_IMG_ALT = "https://www.mafia.ge/templates/newassets/img/mafiabg.jpg";

export function LandingHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image layers */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMG}
          alt="Noir city street with volumetric fog"
          className="w-full h-full object-cover scale-110"
        />
      </div>
      <div className="absolute inset-0 mix-blend-soft-light opacity-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={HERO_IMG_ALT}
          alt="Dark city skyline"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-[#0a0a12]/50 to-[#0a0a12]" />
      <div className="absolute inset-0 bg-gradient-to-r from-red-950/30 via-transparent to-purple-950/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a12] via-transparent to-transparent opacity-80" />

      {/* Volumetric light */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          background:
            "conic-gradient(from 200deg at 30% 20%, rgba(220,38,38,0.12) 0deg, transparent 40deg, transparent 160deg, rgba(147,51,234,0.08) 200deg, transparent 240deg)",
        }}
      />

      {/* Atmospheric haze */}
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 90%, rgba(220,38,38,0.18) 0%, transparent 50%), radial-gradient(ellipse at 20% 50%, rgba(100,100,140,0.1) 0%, transparent 40%), radial-gradient(ellipse at 80% 40%, rgba(147,51,234,0.08) 0%, transparent 40%)",
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0,0,0,0.5) 100%)",
        }}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className={`absolute rounded-full ${
              i % 3 === 0
                ? "w-1.5 h-1.5 bg-red-500/30"
                : i % 3 === 1
                  ? "w-1 h-1 bg-purple-400/20"
                  : "w-0.5 h-0.5 bg-white/15"
            }`}
            style={{ left: `${8 + i * 7.5}%`, top: `${15 + ((i * 17) % 60)}%` }}
            animate={{
              y: [-30, 30, -30],
              x: [-10, 10, -10],
              opacity: [0.1, 0.5, 0.1],
            }}
            transition={{
              duration: 5 + (i % 4) * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        {/* Live badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 backdrop-blur-sm mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-amber-400 uppercase tracking-widest font-sans font-semibold text-[0.7rem]">
            Beta — Early Access
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-white mb-6 font-orbitron font-extrabold leading-[1.1] tracking-tight"
          style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)" }}
        >
          Trust No One.
          <br />
          <span className="bg-gradient-to-r from-red-500 via-red-400 to-orange-400 bg-clip-text text-transparent">
            Survive the Night.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-gray-400 max-w-2xl mx-auto mb-10 font-sans font-normal leading-relaxed"
          style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)" }}
        >
          The ultimate social deduction game. Outsmart your friends with live
          voice chat, hidden roles, and ruthless strategy. Who&apos;s the Mafia
          among you?
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <GlassButton href="/auth/signin">Sign In</GlassButton>
          <GlowButton href="/auth/signup">
            Create Account
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </GlowButton>
        </motion.div>

        {/* Social proof */}
        {/* <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1 }}
          className="mt-12 flex items-center justify-center gap-3 text-gray-500"
        >
          <div className="flex -space-x-2">
            {avatarGradients.map((bg, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-full bg-gradient-to-br ${bg} border-2 border-black/50 flex items-center justify-center`}
              >
                <Users className="w-3.5 h-3.5 text-white/80" />
              </div>
            ))}
          </div>
          <span className="font-sans text-[0.85rem]">
            <span className="text-white">12,400+</span> players online now
          </span>
        </motion.div> */}
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a12] via-[#0a0a12]/80 to-transparent" />
    </section>
  );
}
