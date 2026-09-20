"use client";

import * as React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Shield,
  ChevronDown,
  CheckCircle2,
  LogOut,
  Loader2,
  Building,
  Settings,
  ChevronsUpDown,
} from "lucide-react";
import { logoutAction } from "@/lib/actions/auth-actions";
import { SessionPayload } from "@/lib/auth/session";
import { WorkspaceSwitcherModal } from "./workspace-switcher-modal";

export interface AppUserMenuProps {
  session: SessionPayload;
}

export function AppUserMenu({ session }: AppUserMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = React.useState(false);
  const [isLoggingOut, startLogout] = React.useTransition();
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSignOut = () => {
    startLogout(async () => {
      await logoutAction();
    });
  };

  const initials = session.name
    ? session.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2.5 py-1.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-primary to-indigo-600 text-xs font-bold text-white shadow-sm">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold leading-tight text-foreground line-clamp-1">
              {session.name}
            </span>
            <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
              {session.workspaceName}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-surface-elevated p-2 shadow-2xl shadow-black/50 z-50 overflow-hidden"
            >
              {/* User Profile Header */}
              <div className="p-2.5 border-b border-border/60">
                <p className="text-xs font-bold text-foreground line-clamp-1">{session.name}</p>
                <p className="text-[11px] text-muted-foreground font-mono line-clamp-1">{session.email}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Authenticated</span>
                  </div>
                  <span className="text-[10px] font-bold text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                    {session.role}
                  </span>
                </div>
              </div>

              {/* Workspace Info with Switch Action */}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsSwitcherOpen(true);
                }}
                className="w-full text-left p-2.5 bg-background/50 hover:bg-background rounded-xl my-1.5 border border-border/40 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                    <Building className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="line-clamp-1">{session.workspaceName}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
                    Switch Workspace
                  </span>
                </div>
                <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground shrink-0 ml-1" />
              </button>

              {/* Menu Items */}
              <div className="py-1 space-y-0.5">
                <Link
                  href="/app/settings/profile"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Profile Settings</span>
                </Link>

                <Link
                  href="/app/settings/workspace"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Workspace Settings</span>
                </Link>

                <Link
                  href="/app/settings/security"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Security & Sessions</span>
                </Link>
              </div>

              {/* Sign Out Button */}
              <div className="border-t border-border/60 pt-1.5">
                <button
                  type="button"
                  disabled={isLoggingOut}
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors text-left disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Signing Out...</span>
                    </>
                  ) : (
                    <>
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <WorkspaceSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
      />
    </>
  );
}
