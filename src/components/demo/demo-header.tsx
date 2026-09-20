"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, Sparkles } from "lucide-react";
import { NotificationPopover } from "./notification-popover";
import { UserMenuDropdown } from "./user-menu-dropdown";

export interface DemoHeaderProps {
  onToggleMobileMenu: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/demo": {
    title: "Executive Dashboard",
    subtitle: "Real-time overview of pipeline velocity, team attendance, and revenue.",
  },
  "/demo/leads": {
    title: "Lead Management",
    subtitle: "Omnichannel inbound pipeline, lead scores, and automatic assignment.",
  },
  "/demo/pipeline": {
    title: "Sales Pipeline",
    subtitle: "Interactive deal flow stages with drag-and-drop progression.",
  },
  "/demo/employees": {
    title: "HRMS & Workforce",
    subtitle: "Directory, real-time presence sync, and leave balance tracking.",
  },
  "/demo/invoices": {
    title: "Smart Invoicing",
    subtitle: "GST-compliant billing, payment status, and instant revenue reconciliation.",
  },
  "/demo/integrations": {
    title: "Lead Connectors",
    subtitle: "External lead capture channels and live webhook streaming status.",
  },
  "/demo/analytics": {
    title: "360° Analytics",
    subtitle: "Cross-functional performance metrics, channel ROI, and conversion trends.",
  },
};

export function DemoHeader({ onToggleMobileMenu }: DemoHeaderProps) {
  const pathname = usePathname();
  const currentInfo = PAGE_TITLES[pathname] || {
    title: "NEXORA CRM Workspace",
    subtitle: "Interactive Product Demo",
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Menu Toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          aria-label="Open sidebar menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
              {currentInfo.title}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.2 text-[10px] font-mono text-primary">
              <Sparkles className="h-2.5 w-2.5" />
              Demo
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-muted-foreground line-clamp-1">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search + Notifications + User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search input */}
        <div className="relative hidden sm:flex items-center">
          <Search className="absolute left-3 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search deals, leads, team..."
            className="h-9 w-48 lg:w-64 rounded-xl border border-border bg-surface pl-8.5 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* User Menu Dropdown */}
        <UserMenuDropdown />
      </div>
    </header>
  );
}
