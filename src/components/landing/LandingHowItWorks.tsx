"use client";

import { motion } from "motion/react";
import {
  UserPlus,
  Shuffle,
  MessageCircle,
  Trophy,
  LucideIcon,
} from "lucide-react";
import { GlowCard } from "./GlowCard";
import { SectionHeader } from "./SectionHeader";

interface Step {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
}

interface Testimonial {
  name: string;
  role: string;
  text: string;
  avatar: string;
}

const steps: Step[] = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create or Join",
    description:
      "Sign up in seconds, then create a private room or jump into a public lobby.",
  },
  {
    icon: Shuffle,
    step: "02",
    title: "Get Your Role",
    description:
      "Roles are assigned secretly — Mafia, Detective, Doctor, or Civilian. No one knows who's who.",
  },
  {
    icon: MessageCircle,
    step: "03",
    title: "Day & Night Phases",
    description:
      "Debate by day, eliminate by night. Use voice chat to argue, accuse, and defend.",
  },
  {
    icon: Trophy,
    step: "04",
    title: "Win or Betray",
    description:
      "The Mafia wins by eliminating all civilians. Town wins by exposing the Mafia. Who do you trust?",
  },
];

const testimonials: Testimonial[] = [
  {
    name: "Koshka",
    role: "",
    text: "Cool website blat",
    avatar: "from-red-500 to-pink-600",
  },
  {
    name: "Jordan K.",
    role: "Casual Gamer",
    text: "My friend group plays every weekend. Private rooms and custom rules make it endlessly fun.",
    avatar: "from-blue-500 to-cyan-600",
  },
  {
    name: "Sam T.",
    role: "Streamer",
    text: "I've streamed hundreds of hours. The role variety and strategic depth keep viewers hooked.",
    avatar: "from-purple-500 to-violet-600",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="relative py-28 px-6 bg-[#0a0a12]">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

      <div className="max-w-6xl mx-auto">
        <SectionHeader
          label="How It Works"
          title={
            <>
              From Lobby to{" "}
              <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                Victory
              </span>
            </>
          }
        />
        {/* Steps */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-32">
          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative text-center p-6"
            >
              <span className="block text-red-500/20 mb-4 font-orbitron font-black text-5xl">
                {step.step}
              </span>
              <div className="w-14 h-14 rounded-xl border border-white/10 bg-white/[0.03] flex items-center justify-center mx-auto mb-5">
                <step.icon className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-white mb-2 font-orbitron font-semibold text-base">
                {step.title}
              </h3>
              <p className="text-gray-500 font-sans text-[0.85rem] leading-[1.7]">
                {step.description}
              </p>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-[3.5rem] right-0 translate-x-1/2 w-12 h-px bg-gradient-to-r from-red-500/20 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
