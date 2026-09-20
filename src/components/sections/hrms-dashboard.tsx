"use client";

import * as React from "react";
import {
  Users,
  CheckCircle,
  Clock,
  Calendar,
  UserCheck,
  Check,
  X,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "@/lib/animations/gsap";

const EMPLOYEES = [
  {
    name: "Rahul Sharma",
    role: "Senior Sales Exec",
    dept: "Sales",
    attendance: "96%",
    status: "Present",
    initials: "RS",
    avatarBg: "from-blue-600 to-indigo-600",
  },
  {
    name: "Priya Verma",
    role: "People Operations",
    dept: "HR",
    attendance: "98%",
    status: "Present",
    initials: "PV",
    avatarBg: "from-sky-500 to-blue-600",
  },
  {
    name: "Aman Gupta",
    role: "Ops Lead",
    dept: "Operations",
    attendance: "94%",
    status: "On Leave",
    initials: "AG",
    avatarBg: "from-amber-600 to-orange-600",
  },
  {
    name: "Neha Singh",
    role: "Growth Manager",
    dept: "Marketing",
    attendance: "97%",
    status: "Present",
    initials: "NS",
    avatarBg: "from-violet-600 to-purple-600",
  },
];

const LEAVE_REQUESTS = [
  {
    name: "Priya Verma",
    type: "Annual Leave",
    duration: "Apr 18 – Apr 20",
    days: "3 days",
    status: "Pending",
  },
  {
    name: "Aman Gupta",
    type: "Sick Leave",
    duration: "Today",
    days: "1 day",
    status: "Action Required",
  },
];

export function HrmsDashboard() {
  const containerRef = React.useRef<HTMLDivElement>(null);

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

      // 1. Dashboard container reveal
      tl.fromTo(
        containerRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.7 }
      );

      // 2. Attendance bar animation
      tl.fromTo(
        ".hrms-attendance-bar",
        { scaleX: 0, transformOrigin: "left center" },
        { scaleX: 1, duration: 0.8, ease: "power2.out" },
        "-=0.3"
      );

      // 3. Employee rows stagger
      tl.fromTo(
        ".hrms-employee-row",
        { opacity: 0, x: -12 },
        { opacity: 1, x: 0, duration: 0.45, stagger: 0.08 },
        "-=0.4"
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl border border-border/80 bg-surface/90 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-black/30 space-y-5"
    >
      {/* Headcount Metrics Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-primary" />
            Total Headcount
          </span>
          <p className="text-lg font-bold tracking-tight text-foreground">128</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            Present Today
          </span>
          <p className="text-lg font-bold tracking-tight text-emerald-400">116</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            On Leave
          </span>
          <p className="text-lg font-bold tracking-tight text-amber-400">5</p>
        </div>

        <div className="rounded-xl border border-border/70 bg-card/70 p-3 space-y-1">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-sky-400" />
            Remote / WFH
          </span>
          <p className="text-lg font-bold tracking-tight text-sky-400">7</p>
        </div>
      </div>

      {/* Attendance Distribution Progress Visual */}
      <div className="rounded-xl border border-border/60 bg-card/70 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">Today&apos;s Attendance Rate</span>
          <span className="font-mono text-emerald-400 font-bold">91% Turnout</span>
        </div>

        {/* Multi-segment Custom Attendance Bar */}
        <div className="hrms-attendance-bar h-2.5 w-full rounded-full bg-surface-elevated overflow-hidden flex">
          <div className="bg-emerald-500 h-full w-[91%]" title="91% Present" />
          <div className="bg-amber-500 h-full w-[4%]" title="4% On Leave" />
          <div className="bg-rose-500 h-full w-[5%]" title="5% Absent" />
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 116 Present (91%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> 5 Leave (4%)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> 7 Remote/Out (5%)
          </span>
        </div>
      </div>

      {/* Two Column Layout: Employee Directory Table (Left) + Leave Requests (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Employee Directory Table (Takes 7 Cols on desktop) */}
        <div className="md:col-span-7 rounded-xl border border-border/70 bg-card/80 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              Live Team Directory
            </span>
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px]">
              <Search className="h-3 w-3" />
              <Filter className="h-3 w-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            {EMPLOYEES.map((emp) => (
              <div
                key={emp.name}
                className="hrms-employee-row flex items-center justify-between rounded-lg border border-border/40 bg-surface/80 p-2 text-xs hover:border-border-strong hover:bg-surface-elevated transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <div
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr text-[9px] font-bold text-white shadow-sm",
                      emp.avatarBg
                    )}
                  >
                    {emp.initials}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate text-[11px]">
                      {emp.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">
                      {emp.dept} • {emp.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <span className="font-mono text-[10px] text-primary font-bold">
                    {emp.attendance}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[8px] font-semibold",
                      emp.status === "Present"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                    )}
                  >
                    {emp.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leave Requests Panel (Takes 5 Cols on desktop) */}
        <div className="md:col-span-5 rounded-xl border border-border/70 bg-card/80 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-amber-400" />
              Leave Approvals
            </span>
            <span className="h-4 w-4 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-bold flex items-center justify-center">
              2
            </span>
          </div>

          <div className="space-y-2">
            {LEAVE_REQUESTS.map((req) => (
              <div
                key={req.name}
                className="rounded-lg border border-border/50 bg-surface/70 p-2.5 space-y-2"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-foreground">
                      {req.name}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      {req.type} • {req.duration}
                    </p>
                  </div>
                  <span className="rounded bg-surface-elevated px-1 py-0.2 text-[8px] font-mono text-muted-foreground">
                    {req.days}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 pt-1 border-t border-border/40">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[10px] font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Check className="h-3 w-3" />
                    Approve
                  </button>
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded bg-surface-elevated border border-border px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
