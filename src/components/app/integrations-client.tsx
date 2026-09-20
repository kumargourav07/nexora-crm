"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import {
  Cable,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
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
  ArrowRight,
  Activity,
  FileText,
  ExternalLink,
  Search,
  Filter,
} from "lucide-react";
import {
  getIntegrationsAction,
  configureIntegrationAction,
  disconnectIntegrationAction,
  sendTestLeadAction,
  getIntegrationEventsAction,
  retryIntegrationEventAction,
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

interface DBIntegration {
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

interface IntegrationSummary {
  totalConnectors: number;
  connected: number;
  leadsSyncedToday: number;
  totalSynced: number;
  failedEvents: number;
  duplicateEvents: number;
  healthScore: number;
}

export function IntegrationsClient() {
  const [integrations, setIntegrations] = useState<DBIntegration[]>([]);
  const [summary, setSummary] = useState<IntegrationSummary>({
    totalConnectors: 0,
    connected: 0,
    leadsSyncedToday: 0,
    totalSynced: 0,
    failedEvents: 0,
    duplicateEvents: 0,
    healthScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal States
  const [configModalIntegration, setConfigModalIntegration] = useState<DBIntegration | null>(null);
  const [testModalIntegration, setTestModalIntegration] = useState<DBIntegration | null>(null);
  const [formCredentials, setFormCredentials] = useState<Record<string, string>>({});
  const [formConfig, setFormConfig] = useState<Record<string, unknown>>({});
  const [defaultOwner, setDefaultOwner] = useState("Alex Chen");

  const [isPending, startTransition] = useTransition();
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testLeadResult, setTestLeadResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getIntegrationsAction();
      if (res.success && res.data) {
        setIntegrations(res.data.integrations as DBIntegration[]);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      } else {
        setError(res.error || "Failed to load integrations");
      }
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenConfig = (item: DBIntegration) => {
    setConfigModalIntegration(item);
    setFormCredentials({});
    setFormConfig(item.config || {});
    setDefaultOwner(item.defaultOwnerName || "Alex Chen");
    setTestResult(null);
  };

  const handleOpenTestModal = (item: DBIntegration) => {
    setTestModalIntegration(item);
    setTestLeadResult(null);
  };

  const handleTestConnection = () => {
    if (!configModalIntegration) return;
    setTestStatus("testing");
    setTestResult(null);

    startTransition(async () => {
      try {
        const res = await testConnectionAction(
          configModalIntegration.provider,
          formCredentials,
          formConfig
        );
        setTestResult(res);
      } catch (e) {
        setTestResult({
          success: false,
          message: e instanceof Error ? e.message : "Connection test failed",
        });
      } finally {
        setTestStatus(null);
      }
    });
  };

  const handleSaveConfig = () => {
    if (!configModalIntegration) return;
    startTransition(async () => {
      const res = await configureIntegrationAction(
        configModalIntegration.provider,
        formCredentials,
        formConfig,
        undefined,
        defaultOwner
      );
      if (res.success) {
        setConfigModalIntegration(null);
        fetchIntegrations();
      } else {
        setTestResult({
          success: false,
          message: res.error || "Configuration failed",
        });
      }
    });
  };

  const handleDisconnect = (provider: IntegrationProvider) => {
    if (!confirm(`Are you sure you want to disconnect ${provider}? Inbound webhooks will be halted.`)) {
      return;
    }
    startTransition(async () => {
      const res = await disconnectIntegrationAction(provider);
      if (res.success) {
        fetchIntegrations();
      } else {
        alert(res.error || "Failed to disconnect");
      }
    });
  };

  const handleFireTestLead = () => {
    if (!testModalIntegration) return;
    startTransition(async () => {
      const res = await sendTestLeadAction(testModalIntegration.provider);
      if (res.success && res.result) {
        setTestLeadResult({
          success: true,
          message: res.result.message,
        });
        fetchIntegrations();
      } else {
        setTestLeadResult({
          success: false,
          message: res.error || "Test lead injection failed",
        });
      }
    });
  };

  const categories = [
    { label: "All Connectors", value: "ALL" },
    { label: "Advertising", value: "Advertising" },
    { label: "B2B Marketplace", value: "B2B Marketplace" },
    { label: "Real Estate", value: "Real Estate" },
    { label: "Inbound & Forms", value: "Inbound" },
    { label: "Messaging", value: "Messaging" },
    { label: "Custom API", value: "Custom" },
  ];

  const filteredIntegrations = integrations.filter((item) => {
    const matchesCategory =
      selectedCategory === "ALL" ||
      item.category.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      item.category.toUpperCase() === selectedCategory.toUpperCase();

    const matchesSearch =
      searchQuery.trim() === "" ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.provider.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Cable className="w-6 h-6 text-primary" />
              Lead Integrations & Connectors
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 font-mono text-[10px]">
              AES-256 ENCRYPTED
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Centrally manage multi-channel lead ingestion from Meta Ads, B2B portals, property gateways, and REST webhooks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/integrations/logs"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-foreground hover:bg-surface-elevated text-xs font-semibold transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-primary" />
            <span>Event Logs</span>
            {summary.failedEvents > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold">
                {summary.failedEvents} failed
              </span>
            )}
          </Link>

          <button
            onClick={() => fetchIntegrations()}
            disabled={isLoading || isPending}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            Total Providers
          </span>
          <span className="text-xl font-bold text-foreground mt-2 font-mono">
            {summary.totalConnectors}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Connected
          </span>
          <span className="text-xl font-bold text-emerald-400 mt-2 font-mono">
            {summary.connected}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Synced Today
          </span>
          <span className="text-xl font-bold text-foreground mt-2 font-mono">
            {summary.leadsSyncedToday}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-sky-400" />
            Total Ingested
          </span>
          <span className="text-xl font-bold text-foreground mt-2 font-mono">
            {summary.totalSynced}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            Failed Events
          </span>
          <span className={`text-xl font-bold mt-2 font-mono ${summary.failedEvents > 0 ? "text-rose-400" : "text-foreground"}`}>
            {summary.failedEvents}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-surface border border-border flex flex-col justify-between">
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Health Score
          </span>
          <span className="text-xl font-bold text-emerald-400 mt-2 font-mono">
            {summary.healthScore}%
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface p-2.5 rounded-xl border border-border">
        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setSelectedCategory(cat.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat.value
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search connectors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface-elevated border border-border/80 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Connectors Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface rounded-2xl border border-border">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading connector statuses...</p>
        </div>
      ) : filteredIntegrations.length === 0 ? (
        <div className="text-center p-16 bg-surface rounded-2xl border border-border">
          <Cable className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No connectors found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            No integration matching your filter criteria. Try selecting another category or clearing search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredIntegrations.map((item) => {
            const isConnected = item.status === IntegrationStatus.CONNECTED;
            const hasError = item.status === IntegrationStatus.ERROR;
            const isPendingConfig = item.status === IntegrationStatus.PENDING;

            return (
              <div
                key={item.id}
                className={`p-5 rounded-2xl bg-surface border transition-all duration-200 hover:border-primary/40 hover:shadow-md flex flex-col justify-between relative group ${
                  isConnected
                    ? "border-emerald-500/30 bg-gradient-to-b from-emerald-500/5 to-transparent"
                    : hasError
                    ? "border-rose-500/30 bg-gradient-to-b from-rose-500/5 to-transparent"
                    : "border-border"
                }`}
              >
                <div>
                  {/* Top Card Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${item.avatarBg} ${item.iconColor} border ${item.accentBorder}`}
                      >
                        {item.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          href={`/app/integrations/${item.provider.toLowerCase()}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                        >
                          {item.name}
                          <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
                        </Link>
                        <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isConnected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Connected
                        </span>
                      ) : hasError ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          Error
                        </span>
                      ) : isPendingConfig ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-surface-elevated text-muted-foreground border border-border">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">
                    {item.description}
                  </p>

                  {/* Error display if any */}
                  {item.lastError && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] mb-3 flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="truncate">{item.lastError}</span>
                    </div>
                  )}

                  {/* Stats Strip */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-surface-elevated/60 border border-border/60 text-xs mb-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-mono">TODAY</span>
                      <span className="font-bold text-foreground font-mono">
                        {item.leadsSyncedToday} leads
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block font-mono">TOTAL SYNCED</span>
                      <span className="font-bold text-foreground font-mono">
                        {item.totalSynced} leads
                      </span>
                    </div>
                  </div>

                  {/* Live Webhook Pill if connected */}
                  {item.webhookUrl && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                        <span className="font-mono uppercase">Inbound Endpoint</span>
                        <button
                          onClick={() => handleCopy(item.webhookUrl!, item.id)}
                          className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === item.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>{copiedKey === item.id ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="p-2 rounded-lg bg-background border border-border/80 text-[11px] font-mono text-muted-foreground truncate select-all">
                        {item.webhookUrl}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                  <button
                    onClick={() => handleOpenConfig(item)}
                    className="flex-1 py-1.5 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs shadow-primary/20"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>{isConnected ? "Configure" : "Connect"}</span>
                  </button>

                  <button
                    onClick={() => handleOpenTestModal(item)}
                    title="Send simulated test lead through pipeline"
                    className="py-1.5 px-3 rounded-lg bg-surface-elevated border border-border text-foreground hover:bg-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5 text-sky-400" />
                    <span>Test</span>
                  </button>

                  <Link
                    href={`/app/integrations/${item.provider.toLowerCase()}`}
                    title="View connector documentation and setup"
                    className="p-1.5 rounded-lg bg-surface-elevated border border-border text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>

                  {isConnected && (
                    <button
                      onClick={() => handleDisconnect(item.provider)}
                      title="Disconnect integration"
                      className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Configuration & Connect Modal                                 */}
      {/* ------------------------------------------------------------- */}
      {configModalIntegration && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${configModalIntegration.avatarBg} ${configModalIntegration.iconColor} border ${configModalIntegration.accentBorder}`}
                >
                  {configModalIntegration.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Configure {configModalIntegration.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Secrets are encrypted using AES-256-GCM before storage.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfigModalIntegration(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Setup Guide Steps */}
            {configModalIntegration.guideSteps && configModalIntegration.guideSteps.length > 0 && (
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border/80 space-y-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-primary" />
                  Integration Setup Guide
                </span>
                <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1 pl-1">
                  {configModalIntegration.guideSteps.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* Credential Fields */}
            <div className="space-y-3.5">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider font-mono">
                API Credentials & Tokens
              </span>

              {configModalIntegration.requiredFields.map((field) => {
                const currentMasked = configModalIntegration.maskedCredentials[field.key];
                return (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>
                        {field.label} {field.required && <span className="text-rose-400">*</span>}
                      </span>
                      {currentMasked && (
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Current: {currentMasked}
                        </span>
                      )}
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
                );
              })}

              {/* Default Lead Owner */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <label className="text-xs font-semibold text-foreground">
                  Default Lead Assignee
                </label>
                <input
                  type="text"
                  value={defaultOwner}
                  onChange={(e) => setDefaultOwner(e.target.value)}
                  placeholder="e.g. Alex Chen"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:border-primary"
                />
                <p className="text-[11px] text-muted-foreground">
                  Imported leads from this provider will be automatically assigned to this rep.
                </p>
              </div>
            </div>

            {/* Test Connection Output */}
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

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isPending || testStatus === "testing"}
                className="px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-foreground hover:bg-surface transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {testStatus === "testing" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                ) : (
                  <Key className="w-3.5 h-3.5 text-primary" />
                )}
                <span>Test Connection</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfigModalIntegration(null)}
                  className="px-3.5 py-2 rounded-xl bg-surface-elevated text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isPending}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors cursor-pointer shadow-xs shadow-primary/30 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save & Connect</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* Test Lead Simulation Modal                                    */}
      {/* ------------------------------------------------------------- */}
      {testModalIntegration && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2.5">
                <Send className="w-5 h-5 text-sky-400" />
                <h3 className="text-base font-bold text-foreground">
                  Simulate {testModalIntegration.name} Lead
                </h3>
              </div>
              <button
                onClick={() => setTestModalIntegration(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface-elevated"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              This triggers a full simulation test through the real normalization pipeline, deduplication engine, and CRM database. A verified lead will be created in your pipeline.
            </p>

            {testLeadResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  testLeadResult.success
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                }`}
              >
                {testLeadResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                )}
                <span>{testLeadResult.message}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setTestModalIntegration(null)}
                className="px-3 py-1.5 rounded-lg bg-surface-elevated text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleFireTestLead}
                disabled={isPending}
                className="px-4 py-1.5 rounded-lg bg-sky-500 text-white hover:bg-sky-600 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Send Simulated Lead</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
