"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  UserCheck,
  Receipt,
  Network,
  TrendingUp,
  Settings,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/demo", icon: LayoutDashboard },
  { label: "Leads", href: "/demo/leads", icon: Users },
  { label: "Pipeline", href: "/demo/pipeline", icon: Kanban },
  { label: "Employees", href: "/demo/employees", icon: UserCheck },
  { label: "Invoices", href: "/demo/invoices", icon: Receipt },
  { label: "Integrations", href: "/demo/integrations", icon: Network },
  { label: "Analytics", href: "/demo/analytics", icon: TrendingUp },
];

export interface DemoSidebarProps {
  onNavigate?: () => void;
  className?: string;
}

export function DemoSidebar({ onNavigate, className }: DemoSidebarProps) {
  const pathname = usePathname();
  const [showSettingsToast, setShowSettingsToast] = React.useState(false);

  const handleSettingsClick = () => {
    setShowSettingsToast(true);
    setTimeout(() => setShowSettingsToast(false), 3000);
  };

  return (
    <aside
      className={cn(
        "flex flex-col justify-between h-full bg-surface border-r border-border p-3.5 select-none",
        className
      )}
    >
      {/* Top Brand & Workspace Indicator */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2 pt-1 pb-3 border-b border-border/60">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold tracking-tight text-foreground transition-opacity hover:opacity-90"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm shadow-primary/30">
              <span className="text-xs font-black font-mono">◈</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-extrabold tracking-wider leading-none">
                NEXORA
              </span>
              <span className="text-[9px] font-mono text-primary font-bold tracking-widest uppercase">
                CRM OS v2.4
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1" aria-label="Demo CRM navigation">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/demo"
                ? pathname === "/demo"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                )}
              </Link>
            );
          })}

          <div className="pt-2 pb-1 border-t border-border/60">
            <button
              type="button"
              onClick={handleSettingsClick}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors text-left"
            >
              <Settings className="h-4 w-4 shrink-0" />
              <span>Settings</span>
            </button>
          </div>
        </nav>
      </div>

      {/* Settings Toast alert if clicked */}
      {showSettingsToast && (
        <div className="mx-1 my-2 rounded-lg border border-primary/40 bg-primary/10 p-2 text-[11px] text-primary text-center">
          Settings are available in the full NEXORA CRM platform.
        </div>
      )}

      {/* Bottom Area: Demo Disclaimer & Back to Marketing Website */}
      <div className="space-y-3 pt-3 border-t border-border/60">
        {/* Sample Data Disclaimer Pill */}
        <div className="rounded-xl border border-border/70 bg-card/70 p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            <Sparkles className="h-3 w-3" />
            <span>Interactive Demo</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            All records and metrics are local simulated sample data.
          </p>
        </div>

        {/* Back to Website Button */}
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-border bg-surface-elevated py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-surface-hover"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Website</span>
        </Link>
      </div>
    </aside>
  );
}
