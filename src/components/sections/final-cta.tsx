"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, MessageSquare, Sparkles, Users, Receipt } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { gsap } from "@/lib/animations/gsap";

export function FinalCta() {
  const sectionRef = React.useRef<HTMLElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (typeof window === "undefined" || !sectionRef.current) return;

    // Check reduced motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".cta-visual, .cta-eyebrow, .cta-heading, .cta-description, .cta-buttons",
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.65,
          stagger: 0.1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 80%",
            toggleActions: "play none none none",
            once: true,
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleScrollToContact = () => {
    const contactElement = document.getElementById("contact");
    if (contactElement) {
      contactElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="cta"
      ref={sectionRef}
      className="relative py-20 md:py-28 bg-surface/30 border-t border-border/50 scroll-mt-20 overflow-hidden"
    >
      {/* Background Ambient Radial Glow & Grid */}
      <div
        className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[800px] h-[350px] sm:h-[450px] bg-primary/10 blur-[100px] pointer-events-none rounded-full -z-10"
        aria-hidden="true"
      />

      <Container size="xl" className="relative z-10">
        <div
          ref={contentRef}
          className="relative rounded-3xl border border-border/80 bg-gradient-to-b from-surface/95 to-card/95 p-8 sm:p-12 lg:p-16 backdrop-blur-xl shadow-2xl shadow-black/40 overflow-hidden text-center"
        >
          {/* Subtle top accent border glow */}
          <div
            className="absolute -top-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
            aria-hidden="true"
          />

          {/* CRM Flow Architectural Backdrop Visual */}
          <div
            className="cta-visual max-w-lg mx-auto mb-8 hidden sm:flex items-center justify-center gap-3 sm:gap-6 text-xs text-muted-foreground select-none"
            aria-hidden="true"
          >
            <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 shadow-sm">
              <Users className="h-3.5 w-3.5" />
              <span className="font-semibold">Leads</span>
            </div>

            <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-emerald-500/40 via-primary/50 to-primary" />

            <div className="flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/20 px-4 py-2 text-foreground font-bold shadow-md shadow-primary/15">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span>NEXORA CRM</span>
            </div>

            <div className="h-px w-6 sm:w-10 bg-gradient-to-r from-primary via-indigo-500/50 to-indigo-500/40" />

            <div className="flex items-center gap-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-indigo-400 shadow-sm">
              <Receipt className="h-3.5 w-3.5" />
              <span className="font-semibold">Billing</span>
            </div>
          </div>

          {/* Eyebrow */}
          <div className="cta-eyebrow mb-4 inline-block">
            <Badge variant="primary" size="md" dot className="font-mono text-xs shadow-sm">
              READY TO MOVE FASTER?
            </Badge>
          </div>

          {/* Heading */}
          <h2 className="cta-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15] max-w-2xl mx-auto">
            Ready to bring everything into{" "}
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
              one CRM?
            </span>
          </h2>

          {/* Supporting Description */}
          <p className="cta-description text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto mt-4 sm:mt-5">
            Connect your leads, people, billing, and operations in one powerful workspace.
          </p>

          {/* CTA Action Buttons */}
          <div className="cta-buttons flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mt-8 pt-2">
            <motion.div
              whileHover={{ y: -2, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full sm:w-auto"
            >
              <Button
                variant="primary"
                size="lg"
                onClick={handleScrollToContact}
                rightIcon={
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                }
                className="group w-full sm:w-auto shadow-lg shadow-primary/25 hover:shadow-primary/40 px-7"
              >
                Book a Demo
              </Button>
            </motion.div>

            <motion.div
              whileHover={{ y: -2, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full sm:w-auto"
            >
              <Button
                variant="outline"
                size="lg"
                onClick={handleScrollToContact}
                leftIcon={<MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />}
                className="group w-full sm:w-auto hover:bg-surface-elevated hover:border-border-strong px-7"
              >
                Talk to Our Team
              </Button>
            </motion.div>
          </div>

          {/* Trust Guarantee Note */}
          <div className="mt-8 pt-6 border-t border-border/40 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              14-day zero commitment trial
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
              Free lead source onboarding
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              Enterprise-grade encryption
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
