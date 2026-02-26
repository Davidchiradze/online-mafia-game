"use client";

import { Mic, ShieldAlert, Lock, LucideIcon } from "lucide-react";
import { GlowCard } from "./GlowCard";
import { SectionHeader } from "./SectionHeader";

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  accent: string;
  glowColor: string;
}

const features: Feature[] = [
  {
    icon: Mic,
    title: "Live Voice Chat",
    description:
      "Speak, argue, and deceive in real-time. Voice reveals what text can't — hear the tension, catch the lies.",
    accent: "from-red-500 to-orange-500",
    glowColor: "rgba(239,68,68,0.15)",
  },
  {
    icon: ShieldAlert,
    title: "Real-Time Roles",
    description:
      "Detective, Doctor, Citizen — each role has unique powers. Adapt your strategy every round as secrets unfold.",
    accent: "from-purple-500 to-blue-500",
    glowColor: "rgba(147,51,234,0.15)",
  },
  {
    icon: Lock,
    title: "Private Game Rooms",
    description:
      "Create invite-only lobbies for friends or join public matches.",
    accent: "from-emerald-500 to-cyan-500",
    glowColor: "rgba(16,185,129,0.15)",
  },
];

export function LandingFeatures() {
  return (
    <section id="features" className="relative py-28 px-6 bg-[#0a0a12]">
      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-6xl mx-auto">
        <SectionHeader
          label="Core Features"
          title={
            <>
              Built for{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Deception
              </span>
            </>
          }
        />

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <GlowCard
              key={feature.title}
              glowColor={feature.glowColor}
              animationDelay={index * 0.15}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.accent} flex items-center justify-center mb-6 shadow-lg`}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white mb-3 font-orbitron font-semibold text-[1.1rem]">
                {feature.title}
              </h3>
              <p className="text-gray-500 font-sans text-[0.9rem] leading-[1.7]">
                {feature.description}
              </p>
            </GlowCard>
          ))}
        </div>
      </div>
    </section>
  );
}
