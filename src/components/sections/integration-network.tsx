"use client";

import * as React from "react";
import { INTEGRATIONS_LIST } from "@/lib/constants/integrations";
import { CrmNode } from "./crm-node";
import { IntegrationNode } from "./integration-node";
import { ConnectionLines } from "./connection-lines";
import { gsap } from "@/lib/animations/gsap";
import { ArrowDown, Sparkles } from "lucide-react";

export function IntegrationNetwork() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const centralHubRef = React.useRef<HTMLDivElement>(null);
  const particleGroupRef = React.useRef<SVGGElement>(null);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 75%",
          toggleActions: "play none none none",
        },
        defaults: { ease: "power3.out" },
      });

      // 1. Connector Nodes Entrance
      tl.fromTo(
        ".connector-node-desktop, .connector-node-mobile",
        { opacity: 0, scale: 0.9, y: 15 },
        { opacity: 1, scale: 1, y: 0, duration: 0.6, stagger: 0.07 }
      );

      // 2. SVG Line drawing
      tl.fromTo(
        ".connector-svg-line",
        { strokeDashoffset: 400, opacity: 0 },
        { strokeDashoffset: 0, opacity: 0.8, duration: 0.8, stagger: 0.05, ease: "power2.out" },
        "-=0.4"
      );

      // 3. Central Node Reveal & Pulse
      tl.fromTo(
        ".connector-crm-hub",
        { opacity: 0, scale: 0.92 },
        { opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.4)" },
        "-=0.5"
      );

      // 4. Continuous Traveling Data Particles toward Center Hub
      gsap.to(".lead-data-particle", {
        opacity: 1,
        duration: 2.2,
        repeat: -1,
        stagger: 0.35,
        ease: "power1.inOut",
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Background Soft Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] sm:w-[750px] h-[350px] sm:h-[450px] bg-primary/10 blur-3xl rounded-full -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* =========================================
          DESKTOP / TABLET RADIAL NETWORK (>= 768px)
          ========================================= */}
      <div className="hidden md:block relative w-full h-[620px] lg:h-[680px] rounded-3xl border border-border/80 bg-surface/40 backdrop-blur-xl overflow-hidden shadow-2xl shadow-black/30">
        {/* SVG Curved / Straight Connection Paths Layer */}
        <ConnectionLines particleGroupRef={particleGroupRef} />

        {/* Central Hub Node (Centered at 50%, 50%) */}
        <div
          ref={centralHubRef}
          className="connector-crm-hub absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        >
          <CrmNode />
        </div>

        {/* Surrounding 8 Peripheral Connector Nodes */}
        {/* 1. Top Center: Facebook Lead Ads */}
        <div className="connector-node-desktop absolute top-6 left-1/2 -translate-x-1/2 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[0]} />
        </div>

        {/* 2. Top Left: Website Forms */}
        <div className="connector-node-desktop absolute top-14 left-8 lg:left-14 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[5]} />
        </div>

        {/* 3. Mid Left: IndiaMART */}
        <div className="connector-node-desktop absolute top-1/2 -translate-y-1/2 left-4 lg:left-8 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[1]} />
        </div>

        {/* 4. Bottom Left: Google Ads */}
        <div className="connector-node-desktop absolute bottom-14 left-8 lg:left-14 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[4]} />
        </div>

        {/* 5. Top Right: 99acres */}
        <div className="connector-node-desktop absolute top-14 right-8 lg:right-14 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[2]} />
        </div>

        {/* 6. Mid Right: Housing.com */}
        <div className="connector-node-desktop absolute top-1/2 -translate-y-1/2 right-4 lg:right-8 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[3]} />
        </div>

        {/* 7. Bottom Right: WhatsApp Business */}
        <div className="connector-node-desktop absolute bottom-14 right-8 lg:right-14 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[6]} />
        </div>

        {/* 8. Bottom Center: Custom Webhook API */}
        <div className="connector-node-desktop absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-48">
          <IntegrationNode integration={INTEGRATIONS_LIST[7]} />
        </div>
      </div>

      {/* =========================================
          MOBILE VERTICAL DATA-FLOW STREAM (< 768px)
          ========================================= */}
      <div className="block md:hidden space-y-4 rounded-2xl border border-border/80 bg-surface/70 p-4 shadow-xl">
        <div className="text-center space-y-1 pb-2 border-b border-border/50">
          <span className="text-[10px] font-mono font-bold text-primary uppercase">
            LIVE LEAD STREAM
          </span>
          <p className="text-xs text-muted-foreground">
            External lead sources stream directly into one central hub
          </p>
        </div>

        {/* Inbound Sources Grid */}
        <div className="grid grid-cols-2 gap-2">
          {INTEGRATIONS_LIST.slice(0, 4).map((item) => (
            <div key={item.id} className="connector-node-mobile">
              <IntegrationNode integration={item} />
            </div>
          ))}
        </div>

        {/* Downward Data Stream Arrow */}
        <div className="flex flex-col items-center justify-center py-2 space-y-1 text-primary">
          <div className="h-6 w-0.5 bg-gradient-to-b from-primary to-transparent" />
          <div className="flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[10px] font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            <span>Instant Auto-Sync</span>
          </div>
          <ArrowDown className="h-4 w-4 animate-bounce" />
        </div>

        {/* Central Hub Node on Mobile */}
        <div className="flex justify-center">
          <CrmNode className="w-full" />
        </div>

        {/* Second Batch of Sources Grid */}
        <div className="flex flex-col items-center justify-center py-2 space-y-1 text-primary">
          <ArrowDown className="h-4 w-4" />
          <span className="text-[10px] font-mono text-muted-foreground uppercase">
            Additional Connectors
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {INTEGRATIONS_LIST.slice(4, 8).map((item) => (
            <div key={item.id} className="connector-node-mobile">
              <IntegrationNode integration={item} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
