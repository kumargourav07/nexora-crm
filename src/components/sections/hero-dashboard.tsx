"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Kanban,
  Building2,
  Receipt,
  TrendingUp,
  Settings,
  Search,
  Bell,
  Plus,
  ArrowUpRight,
  MoreVertical,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/animations/gsap";

const SIDEBAR_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: Users, label: "Leads", count: "24" },
  { icon: UserCheck, label: "Contacts" },
  { icon: Kanban, label: "Pipeline" },
  { icon: Building2, label: "HRMS" },
  { icon: Receipt, label: "Invoices" },
  { icon: TrendingUp, label: "Analytics" },
];

const KPI_METRICS = [
  {
    title: "Total Leads",
    value: "12,482",
    change: "+18.2%",
    isPositive: true,
  },
  {
    title: "Revenue",
    value: "₹8.4M",
    change: "+12.5%",
    isPositive: true,
  },
  {
    title: "Conversion Rate",
    value: "32.8%",
    change: "+4.6%",
    isPositive: true,
  },
  {
    title: "Active Team",
    value: "128",
    change: "+8.4%",
    isPositive: true,
  },
];

const PIPELINE_COLUMNS = [
  {
    name: "New Lead",
    count: 2,
    cards: [
      {
        company: "Acme Realty",
        contact: "Rahul Sharma",
        value: "₹2.4L",
        tag: "Inbound",
      },
    ],
  },
  {
    name: "Contacted",
    count: 1,
    cards: [
      {
        company: "Urban Homes",
        contact: "Priya Verma",
        value: "₹4.8L",
        tag: "Demo Scheduled",
      },
    ],
  },
  {
    name: "Qualified",
    count: 1,
    cards: [
      {
        company: "Nexus Tech",
        contact: "Aman Gupta",
        value: "₹6.2L",
        tag: "High Value",
      },
    ],
  },
  {
    name: "Proposal",
    count: 1,
    cards: [
      {
        company: "Zenith Labs",
        contact: "Neha Kapoor",
        value: "₹3.5L",
        tag: "Reviewing",
      },
    ],
  },
  {
    name: "Won",
    count: 1,
    cards: [
      {
        company: "CloudScale",
        contact: "Vikram Sen",
        value: "₹9.1L",
        tag: "Closed",
      },
    ],
  },
];

const RECENT_LEADS = [
  {
    name: "Rahul Sharma",
    company: "Acme Realty",
    time: "Just now",
    value: "₹2.4L",
    initials: "RS",
  },
  {
    name: "Priya Verma",
    company: "Urban Homes",
    time: "12m ago",
    value: "₹4.8L",
    initials: "PV",
  },
  {
    name: "Aman Gupta",
    company: "BuildSpace",
    time: "28m ago",
    value: "₹6.2L",
    initials: "AG",
  },
];

export function HeroDashboard() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dashboardCardRef = React.useRef<HTMLDivElement>(null);
  const chartPathRef = React.useRef<SVGPathElement>(null);

  // GSAP Entrance Animation Sequence
  React.useEffect(() => {
    // Check reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
      });

      // 1. Reveal Dashboard Container (Scale & Upward Motion)
      tl.fromTo(
        dashboardCardRef.current,
        {
          opacity: 0,
          y: 40,
          scale: 0.96,
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          delay: 0.2,
        }
      );

      // 2. Sequential KPI Reveal
      tl.fromTo(
        ".dashboard-kpi-item",
        {
          opacity: 0,
          y: 16,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.08,
        },
        "-=0.5"
      );

      // 3. Pipeline Cards Reveal
      tl.fromTo(
        ".dashboard-pipeline-col",
        {
          opacity: 0,
          y: 12,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.06,
        },
        "-=0.3"
      );

      // 4. Chart Stroke Animation
      if (chartPathRef.current) {
        const length = chartPathRef.current.getTotalLength?.() || 600;
        tl.fromTo(
          chartPathRef.current,
          {
            strokeDasharray: length,
            strokeDashoffset: length,
            opacity: 0,
          },
          {
            strokeDashoffset: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
          },
          "-=0.4"
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Subtle Mouse Parallax on Desktop
  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    if (mediaQuery.matches || isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dashboardCardRef.current) return;
      const { innerWidth, innerHeight } = window;
      const xOffset = ((e.clientX / innerWidth) - 0.5) * 10; // Max 5px in either direction
      const yOffset = ((e.clientY / innerHeight) - 0.5) * 8; // Max 4px in either direction

      gsap.to(dashboardCardRef.current, {
        x: xOffset,
        y: yOffset,
        duration: 0.8,
        ease: "power1.out",
        overwrite: "auto",
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Soft Ambient Glow Behind Dashboard */}
      <div
        className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/15 via-accent/10 to-primary/15 blur-2xl opacity-75 -z-10 pointer-events-none"
        aria-hidden="true"
      />

      {/* Main Dashboard Shell */}
      <div
        ref={dashboardCardRef}
        className={cn(
          "w-full rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl",
          "shadow-2xl shadow-black/40 overflow-hidden"
        )}
      >
        {/* Top Window Bar */}
        <div className="flex items-center justify-between border-b border-border/70 bg-surface-elevated/80 px-4 py-2.5">
          {/* Window Buttons & Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <div className="hidden sm:flex items-center gap-1.5 border-l border-border/60 pl-3">
              <span className="text-[11px] font-mono font-semibold tracking-wider text-muted-foreground uppercase">
                ◈ NEXORA OS
              </span>
              <span className="rounded bg-primary/15 px-1.5 py-0.2 text-[9px] font-medium text-primary">
                PRO
              </span>
            </div>
          </div>

          {/* Quick Search Bar (Visual) */}
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface px-3 py-1 text-xs text-muted-foreground w-44 sm:w-64">
            <Search className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
            <span className="truncate text-[11px]">Search pipeline, deals...</span>
            <kbd className="hidden sm:inline-block ml-auto rounded border border-border/80 bg-surface-elevated px-1 text-[9px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </div>

          {/* User Profile & Bell */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="relative rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
            </button>
            <div className="flex items-center gap-2 border-l border-border/60 pl-2.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent text-[10px] font-bold text-white">
                A
              </div>
              <span className="hidden sm:inline-block text-xs font-medium text-foreground">
                Alex
              </span>
            </div>
          </div>
        </div>

        {/* Dashboard Body with Sidebar & Main Workspace */}
        <div className="flex min-h-[380px] sm:min-h-[460px]">
          {/* Collapsible/Compact Sidebar */}
          <aside className="hidden lg:flex w-44 flex-col justify-between border-r border-border/60 bg-surface/50 p-3 shrink-0">
            <nav className="space-y-1" aria-label="Dashboard navigation">
              {SIDEBAR_ITEMS.map((item) => (
                <div
                  key={item.label}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-2.5 py-2 text-xs font-medium transition-colors select-none",
                    item.active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                  </div>
                  {item.count && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        item.active
                          ? "bg-white/20 text-white"
                          : "bg-surface-elevated text-muted-foreground"
                      )}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              ))}
            </nav>

            <div className="border-t border-border/60 pt-3">
              <div className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground cursor-pointer transition-colors">
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </div>
            </div>
          </aside>

          {/* Main Workspace Area */}
          <div className="flex-1 p-4 sm:p-5 space-y-4 overflow-hidden">
            {/* Header Greeting & Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
              <div>
                <h3 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-1.5">
                  Good morning, Alex
                  <span className="text-xs font-normal text-muted-foreground">
                    — Overview
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Here&apos;s what&apos;s happening across your business today.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span>New Deal</span>
                </button>
              </div>
            </div>

            {/* 4 KPI Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              {KPI_METRICS.map((kpi) => (
                <div
                  key={kpi.title}
                  className="dashboard-kpi-item rounded-xl border border-border/70 bg-card/80 p-3 transition-colors hover:border-border-strong"
                >
                  <span className="text-[11px] text-muted-foreground block truncate">
                    {kpi.title}
                  </span>
                  <div className="mt-1 flex items-baseline justify-between gap-1">
                    <span className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                      {kpi.value}
                    </span>
                    <span className="inline-flex items-center text-[10px] font-semibold text-emerald-400">
                      <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" />
                      {kpi.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sales Pipeline Kanban Row */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground tracking-wide">
                  Active Pipeline
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  6 deals in flight
                </span>
              </div>

              {/* Horizontal Scrollable/Fluid Kanban Columns */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {PIPELINE_COLUMNS.map((col) => (
                  <div
                    key={col.name}
                    className="dashboard-pipeline-col rounded-lg border border-border/50 bg-surface/60 p-2 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                      <span className="truncate">{col.name}</span>
                      <span className="h-4 w-4 rounded-full bg-surface-elevated text-[9px] flex items-center justify-center font-mono">
                        {col.count}
                      </span>
                    </div>

                    {/* Lead Card inside column */}
                    {col.cards.map((card) => (
                      <div
                        key={card.company}
                        className="rounded-md border border-border/80 bg-card p-2 space-y-1 shadow-sm transition-all hover:border-primary/40 hover:bg-surface-elevated"
                      >
                        <div className="flex items-start justify-between">
                          <p className="text-[11px] font-semibold text-foreground truncate">
                            {card.company}
                          </p>
                          <span className="text-[9px] font-mono font-bold text-primary">
                            {card.value}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {card.contact}
                        </p>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="rounded bg-surface-elevated px-1 py-0.2 text-[8px] text-muted-foreground font-medium">
                            {card.tag}
                          </span>
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Row: Revenue Performance Area Chart & Recent Activity */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              {/* Custom SVG Revenue Chart (Takes 2 Cols) */}
              <div className="md:col-span-2 rounded-xl border border-border/70 bg-card/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-foreground">
                      Revenue Velocity (Weekly)
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center">
                    +14.8% vs last week
                  </span>
                </div>

                {/* SVG Area Chart */}
                <div className="relative h-24 w-full">
                  <svg
                    viewBox="0 0 500 120"
                    className="h-full w-full overflow-visible"
                    preserveAspectRatio="none"
                    aria-label="Weekly revenue trend chart"
                  >
                    <defs>
                      <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563EB" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Chart Horizontal Grid Lines */}
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#1E2638" strokeDasharray="3 3" />
                    <line x1="0" y1="60" x2="500" y2="60" stroke="#1E2638" strokeDasharray="3 3" />
                    <line x1="0" y1="100" x2="500" y2="100" stroke="#1E2638" strokeDasharray="3 3" />

                    {/* Area Fill */}
                    <path
                      d="M 0,90 Q 70,80 120,65 T 250,50 T 380,30 T 500,10 L 500,120 L 0,120 Z"
                      fill="url(#revGradient)"
                    />

                    {/* Stroke Line */}
                    <path
                      ref={chartPathRef}
                      d="M 0,90 Q 70,80 120,65 T 250,50 T 380,30 T 500,10"
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />

                    {/* Key Data Point Highlight */}
                    <circle cx="500" cy="10" r="4" fill="#3B82F6" stroke="#FFFFFF" strokeWidth="2" />
                  </svg>
                </div>

                {/* X-Axis Days */}
                <div className="flex justify-between text-[9px] text-muted-foreground font-mono px-1">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span className="text-primary font-bold">Sun</span>
                </div>
              </div>

              {/* Recent Inbound Leads List (1 Col) */}
              <div className="rounded-xl border border-border/70 bg-card/80 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    Recent Inbound
                  </span>
                  <MoreVertical className="h-3 w-3 text-muted-foreground" />
                </div>

                <div className="space-y-2">
                  {RECENT_LEADS.map((lead) => (
                    <div
                      key={lead.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-surface-elevated text-[9px] font-bold text-foreground">
                          {lead.initials}
                        </div>
                        <div>
                          <p className="text-[11px] font-medium text-foreground leading-none">
                            {lead.name}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {lead.company}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-mono font-semibold text-primary leading-none">
                          {lead.value}
                        </p>
                        <p className="text-[8px] text-muted-foreground">
                          {lead.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/40 pt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    Auto-synced
                  </span>
                  <span className="font-mono">CRM v2.4</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
