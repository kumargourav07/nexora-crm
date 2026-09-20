"use client";

import * as React from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowRight, CheckCircle2, Sparkles, Play } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroDashboard } from "./hero-dashboard";

const textRevealVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.12,
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

export function Hero() {
  return (
    <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 overflow-hidden">
      {/* Background Ambient Glows & Grid */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] sm:h-[500px] bg-radial-glow opacity-80 pointer-events-none blur-3xl -z-10"
        aria-hidden="true"
      />

      <Container size="xl" className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Hero Content (~40% on desktop) */}
          <div className="lg:col-span-5 space-y-6 sm:space-y-8 text-left">
            {/* Eyebrow Badge */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={textRevealVariants}
            >
              <Badge variant="primary" size="md" dot className="font-mono text-xs shadow-sm">
                THE 360° CRM FOR MODERN BUSINESSES
              </Badge>
            </motion.div>

            {/* Main Display Heading */}
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={textRevealVariants}
              className="space-y-2"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.08]">
                One CRM.{" "}
                <span className="block bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  Your entire business, connected.
                </span>
              </h1>
            </motion.div>

            {/* Supporting Copy */}
            <motion.p
              custom={2}
              initial="hidden"
              animate="visible"
              variants={textRevealVariants}
              className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl"
            >
              Capture leads, manage your workforce, automate billing, and connect every important lead source — all from one intelligent platform.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              custom={3}
              initial="hidden"
              animate="visible"
              variants={textRevealVariants}
              className="flex flex-wrap items-center gap-3.5 pt-1"
            >
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  const el = document.getElementById("contact");
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
                rightIcon={<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />}
                className="group shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-200"
              >
                Get a Demo
              </Button>
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-foreground bg-surface border border-border/80 hover:bg-surface-elevated hover:border-blue-500/40 transition-all duration-200 group"
              >
                <Play className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20 group-hover:scale-110 transition-transform" />
                <span>Explore CRM</span>
              </Link>
            </motion.div>

            {/* Trust Indicator Line */}
            <motion.div
              custom={4}
              initial="hidden"
              animate="visible"
              variants={textRevealVariants}
              className="border-t border-border/60 pt-6 space-y-3"
            >
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Built for growing sales &amp; operations teams</span>
              </p>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Lead Management
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  HRMS
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Invoicing
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right Column: CRM Dashboard Visual (~60% on desktop) */}
          <div className="lg:col-span-7 w-full">
            <HeroDashboard />
          </div>
        </div>
      </Container>
    </section>
  );
}
