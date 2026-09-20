"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Building2,
  Users,
  Shield,
  Bell,
  ScrollText,
  Kanban,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SETTINGS_NAV_ITEMS = [
  {
    label: "Profile",
    href: "/app/settings/profile",
    icon: User,
    description: "Manage your personal account details and preferences",
  },
  {
    label: "Workspace",
    href: "/app/settings/workspace",
    icon: Building2,
    description: "General workspace configuration, currency, and danger zone",
  },
  {
    label: "Team Management",
    href: "/app/settings/team",
    icon: Users,
    description: "Manage members, role permissions, and active invitations",
  },
  {
    label: "Pipelines",
    href: "/app/settings/pipelines",
    icon: Kanban,
    description: "Manage sales pipelines, stages, win probabilities, and colors",
  },
  {
    label: "Security & Sessions",
    href: "/app/settings/security",
    icon: Shield,
    description: "Password updates, authentication security, and sessions",
  },
  {
    label: "Notifications",
    href: "/app/settings/notifications",
    icon: Bell,
    description: "Configure alerting and delivery preferences",
  },
  {
    label: "Audit Logs",
    href: "/app/settings/audit-log",
    icon: ScrollText,
    description: "Immutable compliance log of all workspace activities",
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      {/* Settings Top Header */}
      <div className="flex flex-col gap-1 border-b border-border/60 pb-5">
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
          Workspace Settings & Administration
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure multi-tenant RBAC policies, invite team members, manage workspace defaults, and inspect compliance audit logs.
        </p>
      </div>

      {/* Settings Layout: Sidebar Tabs on Desktop + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar (Desktop) / Horizontal Chips (Mobile) */}
        <aside className="lg:col-span-3.5 space-y-1">
          <nav
            className="flex lg:flex-col gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none"
            aria-label="Settings navigation"
          >
            {SETTINGS_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === "/app/settings/profile" && pathname === "/app/settings");

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all shrink-0 lg:shrink",
                    isActive
                      ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                      : "text-muted-foreground bg-surface hover:bg-surface-hover hover:text-foreground border border-border/50 lg:border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex flex-col text-left">
                    <span className="leading-tight">{item.label}</span>
                  </div>
                  {isActive && (
                    <span className="ml-auto hidden lg:inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Quick RBAC Notice */}
          <div className="hidden lg:block mt-6 p-3.5 rounded-2xl border border-primary/20 bg-primary/5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Shield className="w-3.5 h-3.5" />
              <span>Multi-Tenant RBAC Active</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Role permissions and resource ownership are enforced strictly server-side on every transaction.
            </p>
          </div>
        </aside>

        {/* Content Container */}
        <div className="lg:col-span-8.5 min-w-0">
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-6 lg:p-7 shadow-sm">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
