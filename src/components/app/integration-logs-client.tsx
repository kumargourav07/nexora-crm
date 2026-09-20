"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  Loader2,
  Eye,
  X,
  Code2,
  ShieldCheck,
  Check,
  Copy,
  Layers,
  ChevronLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import {
  getIntegrationLogsAction,
  retryIntegrationEventAction,
} from "@/lib/actions/integrations-actions";
import { Badge } from "@/components/ui/badge";
import { IntegrationProvider, EventStatus } from "@prisma/client";

interface LogEventItem {
  id: string;
  provider: IntegrationProvider;
  eventType: string;
  status: EventStatus;
  errorMessage: string | null;
  payloadRedacted: string;
  leadId: string | null;
  lead: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company: string;
    status: string;
  } | null;
  createdAt: string;
  processedAt: string | null;
}

export function IntegrationLogsClient() {
  const [events, setEvents] = useState<LogEventItem[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedProvider, setSelectedProvider] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Detail Modal
  const [selectedEvent, setSelectedEvent] = useState<LogEventItem | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadLogs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getIntegrationLogsAction({
        page,
        limit: 25,
        provider: selectedProvider === "ALL" ? undefined : (selectedProvider as IntegrationProvider),
        status: selectedStatus === "ALL" ? undefined : (selectedStatus as EventStatus),
        search: searchQuery.trim() || undefined,
      });

      if (res.success && res.data) {
        setEvents(res.data.events as LogEventItem[]);
        setPagination(res.data.pagination);
      } else {
        setError(res.error || "Failed to load events");
      }
    } catch {
      setError("An unexpected error occurred while loading logs.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedProvider, selectedStatus, searchQuery]);

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  const handleRetry = (eventId: string) => {
    setRetryingId(eventId);
    startTransition(async () => {
      try {
        const res = await retryIntegrationEventAction(eventId);
        if (res.success) {
          loadLogs(pagination.page);
          if (selectedEvent && selectedEvent.id === eventId) {
            setSelectedEvent(null);
          }
        } else {
          alert(res.error || "Retry failed");
        }
      } finally {
        setRetryingId(null);
      }
    });
  };

  const handleCopyPayload = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const providerOptions = [
    { label: "All Providers", value: "ALL" },
    { label: "Facebook Lead Ads", value: "FACEBOOK" },
    { label: "IndiaMART", value: "INDIAMART" },
    { label: "99acres", value: "NINETY_NINE_ACRES" },
    { label: "Housing.com", value: "HOUSING" },
    { label: "Website Forms", value: "WEBSITE" },
    { label: "Custom REST API", value: "CUSTOM_API" },
    { label: "Google Ads", value: "GOOGLE_ADS" },
    { label: "WhatsApp", value: "WHATSAPP" },
  ];

  const statusOptions = [
    { label: "All Statuses", value: "ALL" },
    { label: "Processed", value: "PROCESSED" },
    { label: "Failed", value: "FAILED" },
    { label: "Duplicate / Ignored", value: "IGNORED" },
    { label: "Received", value: "RECEIVED" },
    { label: "Processing", value: "PROCESSING" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/integrations"
              className="p-1 rounded-lg bg-surface-elevated border border-border text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              Integration Event Logs & Ledger
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-7">
            Real-time audit ledger of all inbound webhooks, normalized payloads, duplicate detections, and delivery attempts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadLogs(pagination.page)}
            disabled={isLoading || isPending}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface border border-border text-foreground hover:bg-surface-elevated text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3 bg-surface p-3 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search lead, event, error..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
          />
        </div>

        {/* Provider Filter */}
        <div>
          <select
            value={selectedProvider}
            onChange={(e) => setSelectedProvider(e.target.value)}
            className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-hidden focus:border-primary"
          >
            {providerOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-hidden focus:border-primary"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Result Pill */}
        <div className="flex items-center justify-end px-2 text-xs font-mono text-muted-foreground">
          Showing {events.length} of {pagination.total} events
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Events Ledger Table */}
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading event ledger...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center p-16">
            <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-foreground">No events found</h3>
            <p className="text-xs text-muted-foreground mt-1">
              No webhook or sync events matching your filter parameters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated/60 text-muted-foreground border-b border-border text-[11px] font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Provider</th>
                  <th className="py-3 px-4 font-semibold">Event Type</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Ingested Lead / Entity</th>
                  <th className="py-3 px-4 font-semibold">Message / Diagnostic</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((e) => {
                  const isProcessed = e.status === EventStatus.PROCESSED;
                  const isFailed = e.status === EventStatus.FAILED;
                  const isIgnored = e.status === EventStatus.IGNORED;

                  return (
                    <tr key={e.id} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap">
                        {new Date(e.createdAt).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 font-bold text-foreground">
                          {e.provider}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                        {e.eventType}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        {isProcessed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            Processed
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : isIgnored ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            Duplicate (Ignored)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-elevated text-muted-foreground border border-border">
                            {e.status}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {e.lead ? (
                          <div>
                            <Link
                              href={`/app/leads`}
                              className="font-bold text-foreground hover:text-primary transition-colors block"
                            >
                              {e.lead.name}
                            </Link>
                            <span className="text-[11px] text-muted-foreground">
                              {e.lead.company}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60 font-mono">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 max-w-xs truncate">
                        {e.errorMessage ? (
                          <span className="text-rose-400 font-mono text-[11px]">
                            {e.errorMessage}
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-mono text-[11px]">
                            Successfully ingested
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedEvent(e)}
                            className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="View sanitized payload"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {(isFailed || isIgnored) && (
                            <button
                              onClick={() => handleRetry(e.id)}
                              disabled={isPending || retryingId === e.id}
                              className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 transition-colors cursor-pointer disabled:opacity-50"
                              title="Retry lead ingestion"
                            >
                              {retryingId === e.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-surface-elevated/40">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => loadLogs(pagination.page - 1)}
                disabled={pagination.page <= 1 || isLoading}
                className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => loadLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || isLoading}
                className="p-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* Payload Viewer & Diagnostic Modal                             */}
      {/* ------------------------------------------------------------- */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Event Payload & Diagnostics
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {selectedEvent.id} ({selectedEvent.provider})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostic Alert if failed */}
            {selectedEvent.errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Failure Reason:</span>
                  <span className="font-mono text-[11px]">{selectedEvent.errorMessage}</span>
                </div>
              </div>
            )}

            {/* Linked Lead Info */}
            {selectedEvent.lead && (
              <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono block">Linked Lead</span>
                  <span className="font-bold text-foreground">{selectedEvent.lead.name}</span>
                  <span className="text-muted-foreground ml-2">({selectedEvent.lead.company})</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {selectedEvent.lead.status}
                </Badge>
              </div>
            )}

            {/* Redacted Payload JSON */}
            <div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="font-mono flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Sanitized JSON Payload (Sensitive Tokens Redacted)
                </span>
                <button
                  onClick={() => handleCopyPayload(selectedEvent.payloadRedacted)}
                  className="text-primary hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedPayload ? "Copied" : "Copy Payload"}</span>
                </button>
              </div>
              <pre className="p-4 bg-background border border-border rounded-xl text-xs font-mono text-foreground overflow-x-auto max-h-72 select-all leading-relaxed">
                {selectedEvent.payloadRedacted}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-[11px] font-mono text-muted-foreground">
                Received: {new Date(selectedEvent.createdAt).toLocaleString()}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedEvent(null)}
                  className="px-3.5 py-1.5 rounded-lg bg-surface-elevated text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Close
                </button>

                {(selectedEvent.status === EventStatus.FAILED || selectedEvent.status === EventStatus.IGNORED) && (
                  <button
                    type="button"
                    onClick={() => handleRetry(selectedEvent.id)}
                    disabled={isPending || retryingId === selectedEvent.id}
                    className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {retryingId === selectedEvent.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                    <span>Retry Event</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
