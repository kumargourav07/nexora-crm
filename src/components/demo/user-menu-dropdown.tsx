"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Key, LogOut, ChevronDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export function UserMenuDropdown() {
  const [isOpen, setIsOpen] = React.useState(false);
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

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-primary to-accent text-[11px] font-bold text-white shadow-sm">
          A
        </div>
        <div className="hidden sm:flex flex-col text-left">
          <span className="text-xs font-semibold leading-tight text-foreground">
            Alex Chen
          </span>
          <span className="text-[10px] text-muted-foreground leading-tight">
            VP Sales (Demo)
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
            className="absolute right-0 mt-2 w-56 rounded-2xl border border-border bg-surface-elevated p-2 shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            <div className="p-2 border-b border-border/60">
              <p className="text-xs font-bold text-foreground">Alex Chen</p>
              <p className="text-[11px] text-muted-foreground">alex.chen@nexora.io</p>
              <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <CheckCircle2 className="h-3 w-3" />
                <span>Enterprise Demo Mode</span>
              </div>
            </div>

            <div className="py-1 space-y-0.5">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-left"
              >
                <User className="h-3.5 w-3.5" />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-left"
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Role: Workspace Admin</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-colors text-left"
              >
                <Key className="h-3.5 w-3.5" />
                <span>API Keys &amp; Webhooks</span>
              </button>
            </div>

            <div className="border-t border-border/60 pt-1 space-y-0.5">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
              >
                <span>◈</span>
                <span>Sign in to Full CRM</span>
              </Link>
              <Link
                href="/"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Exit Demo &amp; Return Home</span>
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
