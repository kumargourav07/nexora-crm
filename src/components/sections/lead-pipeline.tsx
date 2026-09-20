"use client";

import * as React from "react";
import {
  Users,
  TrendingUp,
  Zap,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/animations/gsap";

interface PipelineCardData {
  company: string;
  contact: string;
  value: string;
  tag: string;
  initials: string;
  hot?: boolean;
}

interface ColumnData {
  name: string;
  count: number;
  stageColor: string;
  cards: PipelineCardData[];
}

const PIPELINE_COLUMNS: ColumnData[] = [
  {
    name: "New Lead",
    count: 2,
    stageColor: "border-blue-500/40 text-blue-400",
    cards: [
      {
        company: "Acme Realty",
        contact: "Rahul Sharma",
        value: "₹2.4L",
        tag: "Inbound",
        initials: "RS",
        hot: true,
      },
      {
        company: "ABC Infra",
        contact: "Rohan Das",
        value: "₹3.1L",
        tag: "Web Form",
        initials: "RD",
      },
    ],
  },
  {
    name: "Contacted",
    count: 2,
    stageColor: "border-sky-500/40 text-sky-400",
    cards: [
      {
        company: "Urban Homes",
        contact: "Priya Verma",
        value: "₹1.8L",
        tag: "Meeting Set",
        initials: "PV",
      },
      {
        company: "Green Homes",
        contact: "Sneha Roy",
        value: "₹2.2L",
        tag: "Call Done",
        initials: "SR",
      },
    ],
  },
  {
    name: "Qualified",
    count: 1,
    stageColor: "border-indigo-500/40 text-indigo-400",
    cards: [
      {
        company: "BuildSpace",
        contact: "Aman Gupta",
        value: "₹4.2L",
        tag: "High Intent",
        initials: "AG",
        hot: true,
      },
    ],
  },
  {
    name: "Proposal",
    count: 1,
    stageColor: "border-amber-500/40 text-amber-400",
    cards: [
      {
        company: "Prime Homes",
        contact: "Neha Kapoor",
        value: "₹3.5L",
        tag: "Reviewing",
        initials: "NK",
      },
    ],
  },
  {
    name: "Won",
    count: 1,
    stageColor: "border-emerald-500/40 text-emerald-400",
    cards: [
      {
        company: "TechCorp",
        contact: "Vikram Sen",
        value: "₹5.8L",
        tag: "Closed",
        initials: "VS",
      },
    ],
  },
];

export function LeadPipeline() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const cardHighlightRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
        defaults: { ease: "power3.out" },
      });

      // 1. Container & Stats fade in
      tl.fromTo(
        ".lead-stats-bar",
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6 }
      );

      // 2. Columns stagger reveal
      tl.fromTo(
        ".lead-pipeline-column",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08 },
        "-=0.4"
      );

      // 3. Highlight pulse on active high-value lead
      if (cardHighlightRef.current) {
        tl.fromTo(
          cardHighlightRef.current,
          { scale: 0.95, borderColor: "rgba(37, 99, 235, 0.2)" },
          {
            scale: 1,
            borderColor: "rgba(37, 99, 235, 0.8)",
            boxShadow: "0 0 20px rgba(37, 99, 235, 0.25)",
            duration: 0.6,
          },
          "-=0.2"
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="w-full space-y-4">
      {/* Top Demo Statistics Bar */}
      <div className="lead-stats-bar grid grid-cols-3 gap-2.5 sm:gap-4 rounded-xl border border-border/70 bg-surface/70 backdrop-blur-md p-3 sm:p-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" />
            <span>Total Leads</span>
          </div>
          <p className="text-base sm:text-xl font-bold tracking-tight text-foreground">
            12,482
          </p>
        </div>

        <div className="space-y-0.5 border-x border-border/50 px-2 sm:px-4">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            <span>Conversion Rate</span>
          </div>
          <p className="text-base sm:text-xl font-bold tracking-tight text-foreground">
            32.8%
          </p>
        </div>

        <div className="space-y-0.5 pl-1 sm:pl-2">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-400" />
            <span>Growth (MoM)</span>
          </div>
          <p className="text-base sm:text-xl font-bold tracking-tight text-emerald-400">
            +18.2%
          </p>
        </div>
      </div>

      {/* Kanban Pipeline Shell */}
      <div className="rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl p-3 sm:p-5 shadow-2xl shadow-black/30 space-y-3">
        {/* Kanban Header Bar */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-foreground tracking-wide">
              Live Pipeline Board
            </span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground bg-surface-elevated px-2 py-0.5 rounded border border-border/60">
            Auto-assigned: Rahul S.
          </span>
        </div>

        {/* 5-Column Kanban Board (Responsive Grid / Stack) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {PIPELINE_COLUMNS.map((col, idx) => (
            <div
              key={col.name}
              className="lead-pipeline-column rounded-xl border border-border/60 bg-card/70 p-2.5 space-y-2"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-1 border-b border-border/40">
                <span className={cn("text-[11px] font-semibold", col.stageColor)}>
                  {col.name}
                </span>
                <span className="h-4 w-4 rounded-full bg-surface-elevated text-[9px] font-mono flex items-center justify-center text-muted-foreground">
                  {col.count}
                </span>
              </div>

              {/* Cards in this stage */}
              <div className="space-y-2">
                {col.cards.map((card, cardIdx) => {
                  const isHighlighted = idx === 0 && cardIdx === 0;
                  return (
                    <div
                      key={card.company}
                      ref={isHighlighted ? cardHighlightRef : undefined}
                      className={cn(
                        "rounded-lg border bg-surface p-2.5 space-y-2 transition-all duration-200",
                        isHighlighted
                          ? "border-primary bg-surface-elevated shadow-sm shadow-primary/20"
                          : "border-border hover:border-border-strong hover:bg-surface-elevated"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-elevated border border-border text-[9px] font-bold text-foreground">
                            {card.initials}
                          </div>
                          <p className="text-xs font-semibold text-foreground truncate">
                            {card.company}
                          </p>
                        </div>
                        {card.hot && (
                          <span className="shrink-0 rounded bg-rose-500/15 border border-rose-500/25 px-1 py-0.2 text-[8px] font-bold text-rose-400">
                            HOT
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="truncate">{card.contact}</span>
                        <span className="font-mono font-bold text-primary shrink-0">
                          {card.value}
                        </span>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/40 pt-1 text-[9px] text-muted-foreground">
                        <span className="rounded bg-surface-elevated px-1 py-0.2 font-medium">
                          {card.tag}
                        </span>
                        {idx === 4 ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Won
                          </span>
                        ) : (
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/60" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Pipeline Stage Progression Flow Indicator */}
        <div className="border-t border-border/50 pt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5 text-primary">
            <Sparkles className="h-3 w-3" />
            <span className="font-medium">Lead journey: Capture → Track → Qualify → Convert</span>
          </div>
          <span className="font-mono text-[9px]">SLA: &lt; 5m</span>
        </div>
      </div>
    </div>
  );
}
