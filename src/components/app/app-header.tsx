"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Menu, Search, Database, Command } from "lucide-react";
import { NotificationPopover } from "@/components/demo/notification-popover";
import { AppUserMenu } from "./app-user-menu";
import { SessionPayload } from "@/lib/auth/session";
import { GlobalSearchModal } from "./global-search-modal";

export interface AppHeaderProps {
  session: SessionPayload;
  onToggleMobileMenu: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/app": {
    title: "Executive Dashboard",
    subtitle: "Real-time metrics, weighted pipeline, win rates, and revenue aggregation from PostgreSQL.",
  },
  "/app/dashboard": {
    title: "Executive Dashboard",
    subtitle: "Real-time metrics, weighted pipeline, win rates, and revenue aggregation from PostgreSQL.",
  },
  "/app/deals": {
    title: "Deals & Opportunities",
    subtitle: "Manage deal stages, probability values, expected close timelines, and win/loss tracking.",
  },
  "/app/contacts": {
    title: "Contacts Directory",
    subtitle: "Customer & stakeholder directory linked to companies, opportunities, and activities.",
  },
  "/app/companies": {
    title: "Company Accounts",
    subtitle: "Corporate clients, industry accounts, and accumulated revenue ledger.",
  },
  "/app/leads": {
    title: "Lead Management",
    subtitle: "Inbound leads with full search, filtering, and instant one-click conversion into contacts & deals.",
  },
  "/app/pipeline": {
    title: "Deal Pipeline Board",
    subtitle: "Multi-pipeline Kanban board with real-time drag-and-drop stage updates and audit trail.",
  },
  "/app/forecast": {
    title: "Sales Forecasting",
    subtitle: "Live weighted pipeline calculations, monthly revenue projections, and salesperson velocity.",
  },
  "/app/reports/sales": {
    title: "Sales & Revenue Report",
    subtitle: "In-depth win/loss analysis, average deal size, lost reasons breakdown, and date range filters.",
  },
  "/app/employees": {
    title: "HRMS & Workforce",
    subtitle: "Company directory, attendance state sync, and workforce performance metrics.",
  },
  "/app/invoices": {
    title: "Smart Invoicing",
    subtitle: "GST-compliant billing with itemized math and instant ledger updates.",
  },
  "/app/integrations": {
    title: "Lead Connectors",
    subtitle: "Configure database webhook ingestion states and integration connector bridges.",
  },
  "/app/analytics": {
    title: "360° Analytics",
    subtitle: "Aggregated performance metrics, channel conversion ROI, and revenue flow.",
  },
  "/app/settings": {
    title: "Workspace Settings",
    subtitle: "Tenant configuration, RBAC policy enforcement, and administration.",
  },
  "/app/settings/profile": {
    title: "Account Profile",
    subtitle: "Personal display identity, avatar, and workspace role verification.",
  },
  "/app/settings/workspace": {
    title: "Workspace Configuration",
    subtitle: "Organization settings, IANA timezones, currency, and danger zone controls.",
  },
  "/app/settings/team": {
    title: "Team & Role Administration",
    subtitle: "Manage authorized collaborators, role permissions, and cryptographically signed invitations.",
  },
  "/app/settings/security": {
    title: "Security & Sessions",
    subtitle: "Authentication password updates and active HTTP-only JWE session monitoring.",
  },
  "/app/settings/notifications": {
    title: "Notification Stream Preferences",
    subtitle: "Configure real-time alerting triggers and email digest delivery.",
  },
  "/app/settings/audit-log": {
    title: "Immutable Compliance Audit Log",
    subtitle: "Tamper-evident activity trail with multi-filter search and metadata inspection.",
  },
};

export function AppHeader({ session, onToggleMobileMenu }: AppHeaderProps) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Global shortcut Cmd+K or Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Match nested routes e.g. /app/deals/[id]
  let currentInfo = PAGE_TITLES[pathname];
  if (!currentInfo) {
    if (pathname.startsWith("/app/deals/")) {
      currentInfo = {
        title: "Deal Overview",
        subtitle: "Opportunity details, stage progression, tasks, notes, and activity timeline.",
      };
    } else if (pathname.startsWith("/app/contacts/")) {
      currentInfo = {
        title: "Contact Details",
        subtitle: "Contact overview, company association, opportunities, and interactions.",
      };
    } else if (pathname.startsWith("/app/companies/")) {
      currentInfo = {
        title: "Company Account",
        subtitle: "Corporate account overview, team contacts, deals, and lifetime revenue.",
      };
    } else {
      currentInfo = {
        title: "NEXORA CRM Workspace",
        subtitle: "Authenticated PostgreSQL Environment",
      };
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left: Mobile Menu Toggle & Page Title */}
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
            <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-400 font-semibold">
              <Database className="h-2.5 w-2.5" />
              Live DB
            </span>
          </div>
          <p className="hidden md:block text-[11px] text-muted-foreground line-clamp-1">
            {currentInfo.subtitle}
          </p>
        </div>
      </div>

      {/* Right: Omnisearch + Notifications + User Menu */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Search trigger button */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center gap-2 h-9 rounded-xl border border-border bg-surface px-3 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Search CRM...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-surface-elevated px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            <Command className="h-2.5 w-2.5" /> K
          </kbd>
        </button>

        {/* Notifications Popover */}
        <NotificationPopover />

        {/* Authenticated User Menu */}
        <AppUserMenu session={session} />
      </div>

      {/* Global Omnisearch Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </header>
  );
}
