"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Kanban,
  Contact,
  Building2,
  TrendingUp,
  FileBarChart,
  UserCheck,
  Receipt,
  Network,
  Zap,
  PieChart,
  Settings,
  ShieldCheck,
  ArrowLeft,
  ChevronsUpDown,
  MessageSquare,
  CalendarClock,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SessionPayload } from "@/lib/auth/session";
import { WorkspaceSwitcherModal } from "./workspace-switcher-modal";

const SALES_NAV_ITEMS = [
  { label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/app/leads", icon: Users },
  { label: "Deals", href: "/app/deals", icon: Briefcase },
  { label: "Pipeline", href: "/app/pipeline", icon: Kanban },
  { label: "Forecast", href: "/app/forecast", icon: TrendingUp },
  { label: "Contacts", href: "/app/contacts", icon: Contact },
  { label: "Companies", href: "/app/companies", icon: Building2 },
  { label: "Sales Report", href: "/app/reports/sales", icon: FileBarChart },
];

const COMM_NAV_ITEMS = [
  { label: "Communications", href: "/app/communications", icon: MessageSquare },
  { label: "Follow-ups", href: "/app/follow-ups", icon: CalendarClock },
  { label: "Calendar", href: "/app/follow-ups/calendar", icon: Calendar },
  { label: "Comm Reports", href: "/app/reports/communications", icon: FileBarChart },
];

const OPS_NAV_ITEMS = [
  { label: "Automations", href: "/app/automations", icon: Zap },
  { label: "Employees", href: "/app/employees", icon: UserCheck },
  { label: "Invoices", href: "/app/invoices", icon: Receipt },
  { label: "Billing Reports", href: "/app/reports/invoices", icon: FileBarChart },
  { label: "Integrations", href: "/app/integrations", icon: Network },
  { label: "Analytics", href: "/app/analytics", icon: PieChart },
  { label: "Settings", href: "/app/settings", icon: Settings },
];

export interface AppSidebarProps {
  session: SessionPayload;
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebar({ session, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const [isSwitcherOpen, setIsSwitcherOpen] = React.useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col justify-between h-full bg-surface border-r border-border p-3 select-none overflow-y-auto",
        className
      )}
    >
      {/* Top Brand & Workspace Card */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between px-2 pt-1 pb-2.5 border-b border-border/60">
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
              <span className="text-[9px] font-mono text-emerald-400 font-bold tracking-widest uppercase">
                ADVANCED CRM
              </span>
            </div>
          </Link>
        </div>

        {/* Workspace Active Pill with Switcher Trigger */}
        <button
          type="button"
          onClick={() => setIsSwitcherOpen(true)}
          className="w-full text-left px-2.5 py-2 rounded-xl bg-surface-elevated border border-border/80 flex items-center gap-2 hover:bg-surface transition-colors cursor-pointer group"
        >
          <div className="p-1 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-foreground truncate">
              {session.workspaceName}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Role: {session.role}
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
        </button>

        {/* Sales CRM Section */}
        <div className="space-y-1">
          <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Sales & Revenue
          </div>
          <nav className="space-y-0.5" aria-label="Sales navigation">
            {SALES_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/app/dashboard"
                  ? pathname === "/app/dashboard" || pathname === "/app"
                  : pathname === item.href || (item.href !== "/app/leads" && pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Communication Hub Section */}
        <div className="space-y-1 pt-1">
          <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Communication & Follow-ups
          </div>
          <nav className="space-y-0.5" aria-label="Communication navigation">
            {COMM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/app/follow-ups"
                  ? pathname === "/app/follow-ups"
                  : pathname === item.href || pathname.startsWith(item.href + "/");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Operations & Administration Section */}
        <div className="space-y-1 pt-1">
          <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Operations & Admin
          </div>
          <nav className="space-y-0.5" aria-label="Operations navigation">
            {OPS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-sm shadow-primary/25"
                      : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Area: Database Status & Return Link */}
      <div className="space-y-2 pt-3 border-t border-border/60">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2 space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            <ShieldCheck className="h-3 w-3" />
            <span>PostgreSQL Active</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            Tenant: {session.workspaceSlug}
          </p>
        </div>

        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center justify-center gap-1.5 w-full rounded-xl border border-border bg-surface-elevated py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-surface-hover"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Marketing Website</span>
        </Link>
      </div>

      {/* Workspace Switcher Modal */}
      <WorkspaceSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
      />
    </aside>
  );
}
