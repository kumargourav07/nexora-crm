"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cable,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Sliders,
  Copy,
  Check,
  X,
  Key,
  RotateCcw,
  Code2,
  Info,
  Layers,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Terminal,
  Activity,
  Play,
} from "lucide-react";
import {
  getIntegrationByIdAction,
  configureIntegrationAction,
  disconnectIntegrationAction,
  sendTestLeadAction,
  testConnectionAction,
} from "@/lib/actions/integrations-actions";
import { Badge } from "@/components/ui/badge";
import { IntegrationProvider, IntegrationStatus, EventStatus } from "@prisma/client";

interface ConfigFieldItem {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  placeholder?: string;
  description?: string;
  required?: boolean;
}

interface DBIntegrationDetail {
  id: string;
  provider: IntegrationProvider;
  name: string;
  shortName: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  health: "HEALTHY" | "WARNING" | "DISCONNECTED" | "NOT_CONFIGURED";
  isConnected: boolean;
  leadsSyncedToday: number;
  totalSynced: number;
  lastSync: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  maskedCredentials: Record<string, string>;
  config: Record<string, unknown>;
  defaultOwnerName: string | null;
  requiredFields: ConfigFieldItem[];
  guideSteps: string[];
  iconColor: string;
  avatarBg: string;
  accentBorder: string;
}

interface RecentEvent {
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

export function IntegrationDetailClient({ providerParam }: { providerParam: string }) {
  const [integration, setIntegration] = useState<DBIntegrationDetail | null>(null);
  const [samplePayload, setSamplePayload] = useState<Record<string, unknown>>({});
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Configuration Modal & State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [defaultOwner, setDefaultOwner] = useState("Alex Chen");
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // In-App Webhook Tester State
  const [testerPayload, setTesterPayload] = useState<string>("{}");
  const [testerResult, setTesterResult] = useState<{ success: boolean; message: string; leadId?: string } | null>(null);

  const [isPending, startTransition] = useTransition();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getIntegrationByIdAction(providerParam);
      if (res.success && res.data) {
        setIntegration(res.data.integration as DBIntegrationDetail);
        setSamplePayload(res.data.samplePayload || {});
        setTesterPayload(JSON.stringify(res.data.samplePayload || {}, null, 2));
        setRecentEvents(res.data.recentEvents as RecentEvent[]);
        setDefaultOwner(res.data.integration.defaultOwnerName || "Alex Chen");
      } else {
        setError(res.error || "Integration not found");
      }
    } catch {
      setError("Failed to load connector details");
    } finally {
      setIsLoading(false);
    }
  }, [providerParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = () => {
    if (!integration) return;
    startTransition(async () => {
      try {
        const res = await testConnectionAction(integration.provider, formCredentials);
        setTestResult(res);
      } catch (e) {
        setTestResult({
          success: false,
          message: e instanceof Error ? e.message : "Connection test failed",
        });
      }
    });
  };

  const handleSaveConfig = () => {
    if (!integration) return;
    startTransition(async () => {
      const res = await configureIntegrationAction(
        integration.provider,
        formCredentials,
        undefined,
        undefined,
        defaultOwner
      );
      if (res.success) {
        setIsConfigOpen(false);
        loadData();
      } else {
        setTestResult({
          success: false,
          message: res.error || "Configuration failed",
        });
      }
    });
  };

  const handleDisconnect = () => {
    if (!integration) return;
    if (!confirm(`Are you sure you want to disconnect ${integration.name}?`)) return;
    startTransition(async () => {
      const res = await disconnectIntegrationAction(integration.provider);
      if (res.success) {
        loadData();
      } else {
        alert(res.error || "Failed to disconnect");
      }
    });
  };

  const handleRunTester = () => {
    if (!integration) return;
    setTesterResult(null);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(testerPayload);
    } catch {
      setTesterResult({ success: false, message: "Invalid JSON format in tester payload" });
      return;
    }

    startTransition(async () => {
      try {
        const res = await sendTestLeadAction(integration.provider, {
          name: (parsed.name as string) || (parsed.lead_name as string) || (parsed.user_name as string) || (parsed.fullName as string),
          email: (parsed.email as string) || (parsed.lead_email as string) || (parsed.user_email as string),
          phone: (parsed.phone as string) || (parsed.lead_phone as string) || (parsed.user_phone as string) || (parsed.phone_number as string),
          company: (parsed.company as string) || (parsed.companyName as string) || (parsed.project_name as string),
        });

        if (res.success && res.result) {
          setTesterResult({
            success: true,
            message: res.result.message,
            leadId: res.result.leadId,
          });
          loadData();
        } else {
          setTesterResult({
            success: false,
            message: res.error || "Simulation failed",
          });
        }
      } catch (err) {
        setTesterResult({
          success: false,
          message: err instanceof Error ? err.message : "Error firing test payload",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-surface rounded-2xl border border-border">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-muted-foreground">Loading connector configuration...</p>
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="p-8 bg-surface rounded-2xl border border-border text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-foreground">{error || "Connector Not Found"}</h3>
        <Link
          href="/app/integrations"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Integrations Hub
        </Link>
      </div>
    );
  }

  const isConnected = integration.status === IntegrationStatus.CONNECTED;

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/integrations"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Connectors Hub
        </Link>

        <Link
          href="/app/integrations/logs"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
        >
          <Activity className="w-3.5 h-3.5 text-primary" />
          View All Logs
        </Link>
      </div>

      {/* Main Header Banner */}
      <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col md:flex-row md:items-center justify-between gap-5 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-xl shadow-md ${integration.avatarBg} ${integration.iconColor} border ${integration.accentBorder}`}
          >
            {integration.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                {integration.name}
              </h1>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active & Connected
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface-elevated text-muted-foreground border border-border">
                  Not Configured
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
              {integration.description}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setFormCredentials({});
              setTestResult(null);
              setIsConfigOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors cursor-pointer shadow-xs shadow-primary/30 flex items-center gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isConnected ? "Update Credentials" : "Connect Provider"}</span>
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block">Today Synced</span>
          <span className="text-xl font-bold text-foreground font-mono mt-1 block">
            {integration.leadsSyncedToday} leads
          </span>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block">Lifetime Synced</span>
          <span className="text-xl font-bold text-foreground font-mono mt-1 block">
            {integration.totalSynced} leads
          </span>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block">Default Assignee</span>
          <span className="text-sm font-bold text-foreground mt-1 block truncate">
            {integration.defaultOwnerName || "Alex Chen"}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-surface border border-border">
          <span className="text-[10px] font-mono text-muted-foreground uppercase block">Last Event</span>
          <span className="text-xs font-mono text-muted-foreground mt-1 block">
            {integration.lastEventAt ? new Date(integration.lastEventAt).toLocaleString() : "Never"}
          </span>
        </div>
      </div>

      {/* Setup Guide & Inbound Endpoint */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Webhook Endpoint & Auth Details */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Terminal className="w-4 h-4 text-primary" />
              Webhook & Endpoint Specification
            </h3>
            <Badge variant="outline" className="text-[10px] font-mono">
              POST JSON
            </Badge>
          </div>

          {integration.webhookUrl ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Webhook URL (Payload Destination)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={integration.webhookUrl}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono text-foreground select-all"
                  />
                  <button
                    onClick={() => handleCopy(integration.webhookUrl!, "url")}
                    className="p-2 bg-surface-elevated border border-border rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {copiedKey === "url" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {integration.webhookSecret && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Signing Secret / Token
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={integration.webhookSecret}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-xl text-xs font-mono text-emerald-400 select-all"
                    />
                    <button
                      onClick={() => handleCopy(integration.webhookSecret!, "sec")}
                      className="p-2 bg-surface-elevated border border-border rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      {copiedKey === "sec" ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Configure credentials to generate your dedicated webhook URL.
            </p>
          )}

          {/* Setup steps */}
          {integration.guideSteps && integration.guideSteps.length > 0 && (
            <div className="pt-3 border-t border-border space-y-2">
              <span className="text-xs font-bold text-foreground">Step-by-Step Connection Instructions:</span>
              <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1.5 pl-1">
                {integration.guideSteps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* In-App Developer Webhook Tester */}
        <div className="p-5 rounded-2xl bg-surface border border-border space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-400" />
                Live Ingestion Tester
              </h3>
              <span className="text-[10px] text-muted-foreground font-mono">SIMULATION MODE</span>
            </div>

            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              Test your payload normalization and deduplication pipeline in real time without sending external HTTP requests.
            </p>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span className="font-mono text-[11px]">Payload (JSON)</span>
                <button
                  onClick={() => setTesterPayload(JSON.stringify(samplePayload, null, 2))}
                  className="text-primary hover:underline text-[11px] cursor-pointer"
                >
                  Reset to Sample
                </button>
              </div>
              <textarea
                rows={7}
                value={testerPayload}
                onChange={(e) => setTesterPayload(e.target.value)}
                className="w-full p-3 bg-background border border-border rounded-xl text-xs font-mono text-foreground focus:outline-hidden focus:border-primary"
              />
            </div>

            {testerResult && (
              <div
                className={`mt-3 p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testerResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {testerResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">{testerResult.message}</span>
                  {testerResult.leadId && (
                    <Link
                      href={`/app/leads`}
                      className="block mt-1 text-primary hover:underline font-mono text-[11px]"
                    >
                      View in Leads Pipeline →
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleRunTester}
            disabled={isPending}
            className="w-full py-2.5 rounded-xl bg-sky-500 text-white hover:bg-sky-600 text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>Execute Inbound Test</span>
          </button>
        </div>
      </div>

      {/* Recent Events Section */}
      <div className="p-5 rounded-2xl bg-surface border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Recent Integration Events
          </h3>
          <Link
            href={`/app/integrations/logs?provider=${integration.provider}`}
            className="text-xs text-primary hover:underline"
          >
            View all {integration.name} logs →
          </Link>
        </div>

        {recentEvents.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            No events recorded yet for this provider. Run an ingestion test above or send live webhooks.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {recentEvents.map((e) => (
              <div key={e.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  {e.status === EventStatus.PROCESSED ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  ) : e.status === EventStatus.FAILED ? (
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                  )}
                  <div>
                    <span className="font-mono text-muted-foreground mr-2">
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </span>
                    <span className="font-bold text-foreground mr-2">{e.eventType}</span>
                    {e.lead && (
                      <span className="text-primary font-medium">
                        (Lead: {e.lead.name} - {e.lead.company})
                      </span>
                    )}
                    {e.errorMessage && (
                      <span className="text-rose-400 block text-[11px] mt-0.5">
                        Error: {e.errorMessage}
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[11px] font-mono text-muted-foreground">
                  {new Date(e.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Config Modal */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-foreground">
                Configure {integration.name}
              </h3>
              <button
                onClick={() => setIsConfigOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {integration.requiredFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {field.label} {field.required && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type={field.type === "password" ? "password" : "text"}
                    placeholder={field.placeholder || `Enter ${field.label}`}
                    value={formCredentials[field.key] || ""}
                    onChange={(e) =>
                      setFormCredentials((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
                  />
                  {field.description && (
                    <p className="text-[11px] text-muted-foreground">{field.description}</p>
                  )}
                </div>
              ))}

              <div className="space-y-1 pt-2 border-t border-border">
                <label className="text-xs font-semibold text-foreground">
                  Default Lead Owner
                </label>
                <input
                  type="text"
                  value={defaultOwner}
                  onChange={(e) => setDefaultOwner(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
                />
              </div>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isPending}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-xs font-semibold text-foreground hover:bg-surface cursor-pointer"
              >
                Test Connection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Credentials
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
