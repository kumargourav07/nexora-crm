"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Coins,
  Calendar,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ShieldAlert,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  getWorkspaceSettingsAction,
  updateWorkspaceSettingsAction,
  deleteWorkspaceAction,
} from "@/lib/actions/workspace-actions";
import { Role, LeadStatus } from "@prisma/client";

const IANA_TIMEZONES = [
  { label: "Asia/Kolkata (IST +5:30)", value: "Asia/Kolkata" },
  { label: "Asia/Dubai (GST +4:00)", value: "Asia/Dubai" },
  { label: "Asia/Singapore (SGT +8:00)", value: "Asia/Singapore" },
  { label: "America/New_York (EST/EDT -5:00)", value: "America/New_York" },
  { label: "America/Los_Angeles (PST/PDT -8:00)", value: "America/Los_Angeles" },
  { label: "America/Chicago (CST/CDT -6:00)", value: "America/Chicago" },
  { label: "Europe/London (GMT/BST +0:00)", value: "Europe/London" },
  { label: "Europe/Paris (CET/CEST +1:00)", value: "Europe/Paris" },
  { label: "Europe/Berlin (CET/CEST +1:00)", value: "Europe/Berlin" },
  { label: "Australia/Sydney (AEST +10:00)", value: "Australia/Sydney" },
];

const CURRENCIES = [
  { code: "INR", label: "INR (₹) - Indian Rupee" },
  { code: "USD", label: "USD ($) - US Dollar" },
  { code: "EUR", label: "EUR (€) - Euro" },
  { code: "GBP", label: "GBP (£) - British Pound" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 14/09/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 09/14/2026)" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-09-14)" },
];

const LEAD_STATUSES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

interface WorkspaceData {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  defaultLeadStatus: LeadStatus;
  createdAt: string;
  currentUserRole: Role;
  stats: {
    totalMembers: number;
    totalLeads: number;
    totalInvoices: number;
    totalEmployees: number;
  };
}

export function WorkspaceSettingsClient() {
  const router = useRouter();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "GBP">("INR");
  const [dateFormat, setDateFormat] = useState<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD">("DD/MM/YYYY");
  const [defaultLeadStatus, setDefaultLeadStatus] = useState<LeadStatus>("NEW");

  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDelete] = useTransition();

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const res = await getWorkspaceSettingsAction();
      if (res.success && res.data) {
        setData(res.data);
        setName(res.data.name);
        setSlug(res.data.slug);
        setTimezone(res.data.timezone || "Asia/Kolkata");
        setCurrency((res.data.currency as "INR" | "USD" | "EUR" | "GBP") || "INR");
        setDateFormat((res.data.dateFormat as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD") || "DD/MM/YYYY");
        setDefaultLeadStatus(res.data.defaultLeadStatus || "NEW");
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    startTransition(async () => {
      const res = await updateWorkspaceSettingsAction({
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        timezone,
        currency,
        dateFormat,
        defaultLeadStatus,
      });

      if (res.success) {
        setFeedback({ type: "success", text: "Workspace settings saved successfully." });
        if (data) {
          setData({
            ...data,
            name: name.trim(),
            slug: slug.trim().toLowerCase(),
            timezone,
            currency,
            dateFormat,
            defaultLeadStatus,
          });
        }
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to update workspace settings." });
      }
    });
  };

  const handleDelete = () => {
    setDeleteError(null);
    startDelete(async () => {
      const res = await deleteWorkspaceAction({
        confirmationName: confirmName.trim(),
      });

      if (res.success && res.data) {
        router.push(res.data.redirectUrl);
      } else {
        setDeleteError(res.error || "Failed to delete workspace.");
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-xs">Loading workspace settings...</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
        Failed to load workspace settings.
      </div>
    );
  }

  const isOwner = data.currentUserRole === Role.OWNER;
  const canEdit = isOwner || data.currentUserRole === Role.ADMIN;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-foreground">Workspace General Settings</h2>
          <p className="text-xs text-muted-foreground">
            Configure tenant identifier, regional timezones, standard billing currency, and default operational preferences.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-surface-elevated border border-border text-[11px] font-mono text-muted-foreground">
          Workspace ID: {data.id.slice(0, 10)}...
        </span>
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

      {/* Overview Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface-elevated border border-border/80 space-y-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Members</span>
          <p className="text-base font-bold text-foreground">{data.stats.totalMembers}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-elevated border border-border/80 space-y-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Leads</span>
          <p className="text-base font-bold text-foreground">{data.stats.totalLeads}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-elevated border border-border/80 space-y-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Invoices</span>
          <p className="text-base font-bold text-foreground">{data.stats.totalInvoices}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface-elevated border border-border/80 space-y-0.5">
          <span className="text-[10px] text-muted-foreground font-semibold uppercase">Employees</span>
          <p className="text-base font-bold text-foreground">{data.stats.totalEmployees}</p>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
              Workspace Name
            </label>
            <input
              type="text"
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Workspace Slug (URL Identifier)
            </label>
            <input
              type="text"
              value={slug}
              disabled={!canEdit}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "")
                )
              }
              required
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            />
            <p className="text-[10px] text-muted-foreground font-mono">
              nexora.app/workspace/{slug || "slug"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">IANA Timezone</label>
            <select
              value={timezone}
              disabled={!canEdit}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {IANA_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              Default Currency
            </label>
            <select
              value={currency}
              disabled={!canEdit}
              onChange={(e) => setCurrency(e.target.value as "INR" | "USD" | "EUR" | "GBP")}
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Date Format
            </label>
            <select
              value={dateFormat}
              disabled={!canEdit}
              onChange={(e) =>
                setDateFormat(e.target.value as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD")
              }
              className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {DATE_FORMATS.map((df) => (
                <option key={df.value} value={df.value}>
                  {df.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Default Lead Ingestion Stage</label>
          <select
            value={defaultLeadStatus}
            disabled={!canEdit}
            onChange={(e) => setDefaultLeadStatus(e.target.value as LeadStatus)}
            className="w-full sm:w-64 h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {LEAD_STATUSES.map((st) => (
              <option key={st} value={st}>
                Stage: {st}
              </option>
            ))}
          </select>
        </div>

        {canEdit && (
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>Save Workspace</span>
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {/* Danger Zone: Visible only to OWNER */}
      {isOwner && (
        <div className="pt-6 border-t border-border/80 space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <ShieldAlert className="h-4 w-4" />
            <span>Danger Zone</span>
          </div>

          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-foreground">Delete this Workspace</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Permanently delete this organization, all leads, invoices, integration connectors, and members. This action cannot be reversed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmName("");
                setDeleteError(null);
                setIsDeleteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 transition-colors shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Workspace</span>
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface-elevated p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Confirm Workspace Deletion</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This will permanently delete <strong className="text-foreground">{data.name}</strong> and all associated tenant records.
            </p>

            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-foreground">
                To confirm, type <span className="font-bold text-rose-400 font-mono">{data.name}</span> below:
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(e) => setConfirmName(e.target.value)}
                placeholder={data.name}
                className="w-full h-9 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              />
            </div>

            {deleteError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={confirmName.trim() !== data.name || isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-sm hover:bg-rose-500 transition-colors disabled:opacity-40"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>I understand, delete workspace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
