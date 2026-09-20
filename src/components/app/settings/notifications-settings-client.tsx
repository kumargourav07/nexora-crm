"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ListTodo,
  UserPlus,
  Receipt,
  Network,
  ShieldCheck,
  Mail,
} from "lucide-react";
import {
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
} from "@/lib/actions/user-actions";

export function NotificationsSettingsClient() {
  const [preferences, setPreferences] = useState({
    taskNotifications: true,
    leadNotifications: true,
    invoiceNotifications: true,
    integrationNotifications: true,
    statusNotifications: true,
    emailDigest: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getNotificationPreferencesAction();
      if (res.success && res.data) {
        setPreferences(res.data);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleToggle = (key: keyof typeof preferences) => {
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    setFeedback(null);

    startTransition(async () => {
      const res = await updateNotificationPreferencesAction(updated);
      if (res.success) {
        setFeedback({ type: "success", text: "Notification preferences updated." });
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update preferences." });
      }
    });
  };

  const TOGGLE_ITEMS = [
    {
      key: "leadNotifications" as const,
      label: "Lead Inbound & Assignment Alerts",
      description: "Get notified when new leads are ingested from webhooks or assigned to you.",
      icon: UserPlus,
      color: "text-emerald-400",
    },
    {
      key: "taskNotifications" as const,
      label: "Task Reminders & Due Dates",
      description: "Alerts when tasks are assigned, approaching deadline, or completed.",
      icon: ListTodo,
      color: "text-amber-400",
    },
    {
      key: "invoiceNotifications" as const,
      label: "Invoice & Payment Settlements",
      description: "Instant notifications when customer payments clear or invoices become overdue.",
      icon: Receipt,
      color: "text-indigo-400",
    },
    {
      key: "integrationNotifications" as const,
      label: "Connector & Webhook Sync Errors",
      description: "Urgent alerts when third-party APIs (Facebook, IndiaMART, 99acres) drop events.",
      icon: Network,
      color: "text-purple-400",
    },
    {
      key: "statusNotifications" as const,
      label: "Team & Security Activity",
      description: "Notifications about role changes, member invitations, and security logins.",
      icon: ShieldCheck,
      color: "text-sky-400",
    },
    {
      key: "emailDigest" as const,
      label: "Weekly Executive Digest Email",
      description: "Receive a consolidated summary of pipeline revenue velocity and team KPIs.",
      icon: Mail,
      color: "text-blue-400",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs">Loading notification settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Notification Preferences</h2>
          <p className="text-xs text-muted-foreground">
            Control your in-app notification stream and automated alerting triggers.
          </p>
        </div>
        {isPending && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl flex items-center gap-2 text-xs border ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Toggles List */}
      <div className="divide-y divide-border/60 rounded-2xl border border-border bg-surface-elevated overflow-hidden">
        {TOGGLE_ITEMS.map((item) => {
          const Icon = item.icon;
          const isEnabled = preferences[item.key];

          return (
            <div
              key={item.key}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface transition-colors"
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`p-2 rounded-xl bg-surface border border-border shrink-0 ${item.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {item.description}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isEnabled}
                onClick={() => handleToggle(item.key)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isEnabled ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
