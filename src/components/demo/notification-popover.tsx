"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, CheckCircle2, UserPlus, Receipt, Sparkles, X } from "lucide-react";
import { DEMO_NOTIFICATIONS } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export function NotificationPopover() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState(DEMO_NOTIFICATIONS);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  // Close when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const getIcon = (type: string) => {
    switch (type) {
      case "lead":
        return <UserPlus className="h-4 w-4 text-emerald-400" />;
      case "invoice":
        return <Receipt className="h-4 w-4 text-indigo-400" />;
      case "hr":
        return <CheckCircle2 className="h-4 w-4 text-sky-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="View notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-surface-elevated p-4 shadow-2xl shadow-black/40 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="text-[11px] font-medium text-primary hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-2 divide-y divide-border/40 max-h-80 overflow-y-auto">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={cn(
                    "flex items-start gap-3 p-2.5 rounded-xl transition-colors cursor-pointer",
                    notif.read
                      ? "opacity-70 hover:bg-surface/50"
                      : "bg-surface/70 hover:bg-surface"
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border/60 mt-0.5">
                    {getIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {notif.title}
                      </p>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0 ml-2">
                        {notif.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {notif.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border/60 pt-2.5 mt-2 text-center">
              <span className="text-[10px] font-mono text-muted-foreground">
                ◈ Live CRM Event Stream
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
