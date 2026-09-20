"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Briefcase,
  TrendingUp,
  Award,
  Percent,
  Calendar,
  ArrowRight,
  Plus,
  Loader2,
  Kanban,
  CheckCircle2,
  Sparkles,
  History,
  Building2,
} from "lucide-react";
import { getDashboardMetricsAction } from "@/lib/actions/analytics-actions";
import { Badge } from "@/components/ui/badge";
import { CreateDealModal } from "./create-deal-modal";
import { CreateLeadModal } from "./create-lead-modal";
import { LeadDetailPanel } from "@/components/demo/lead-detail-panel";
import { Lead, LeadStatus, LeadSource } from "@/lib/demo-data/types";

interface DashboardData {
  kpis: {
    totalPipeline: string;
    totalPipelineFull: string;
    weightedPipeline: string;
    weightedPipelineFull: string;
    wonRevenue: string;
    wonRevenueFull: string;
    openDeals: string;
    winRate: string;
    avgDealSize: string;
    expectedClosures: string;
    totalLeads: string;
    qualifiedLeads: string;
  };
  recentDeals: {
    id: string;
    name: string;
    valueFormatted: string;
    status: string;
    stageName: string;
    stageColor: string | null;
    companyName: string | null;
    createdAt: string;
  }[];
  recentLeads: Lead[];
  leadsByStatus: { status: string; count: number; totalValue: number }[];
  leadsBySource: { source: string; count: number }[];
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    userName: string;
    createdAt: string;
  }[];
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadPanelOpen, setIsLeadPanelOpen] = useState(false);
  const [isCreateDealModalOpen, setIsCreateDealModalOpen] = useState(false);
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] = useState(false);

  const fetchMetrics = React.useCallback(async () => {
    setError(null);
    try {
      const res = await getDashboardMetricsAction();
      if (!res.success) {
        setError(res.error || "Failed to load dashboard metrics.");
      } else if (res.data) {
        setData(res.data as unknown as DashboardData);
      }
    } catch {
      setError("Unable to connect to database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadPanelOpen(true);
  };

  if (isLoading && !data) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">
          Querying PostgreSQL database metrics...
        </p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalPipeline: "₹0",
    totalPipelineFull: "₹0",
    weightedPipeline: "₹0",
    weightedPipelineFull: "₹0",
    wonRevenue: "₹0",
    wonRevenueFull: "₹0",
    openDeals: "0",
    winRate: "N/A",
    avgDealSize: "₹0",
    expectedClosures: "0",
    totalLeads: "0",
    qualifiedLeads: "0",
  };

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Pipeline */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Open Pipeline</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono">
            {kpis.totalPipelineFull}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {kpis.openDeals} active opportunities
          </span>
        </div>

        {/* Weighted Pipeline */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-1 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-indigo-400">Weighted Forecast</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-400 font-mono">
            {kpis.weightedPipelineFull}
          </p>
          <span className="text-[11px] text-muted-foreground">Probability-adjusted revenue</span>
        </div>

        {/* Won Revenue */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Closed & Won</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {kpis.wonRevenueFull}
          </p>
          <span className="text-[11px] text-muted-foreground">
            Win Rate: <strong className="text-foreground">{kpis.winRate}</strong>
          </span>
        </div>

        {/* Average Deal Size */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Avg Deal Size</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono">
            {kpis.avgDealSize}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {kpis.expectedClosures} closures expected this month
          </span>
        </div>
      </div>

      {/* Quick Launchpad Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/app/pipeline"
          className="rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <Kanban className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Pipeline Kanban</p>
              <p className="text-[11px] text-muted-foreground">Drag & drop stage velocity</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/app/forecast"
          className="rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Sales Forecast</p>
              <p className="text-[11px] text-muted-foreground">Monthly revenue projections</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/app/reports/sales"
          className="rounded-2xl border border-border bg-surface p-4 hover:border-primary/50 transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Sales Ledger</p>
              <p className="text-[11px] text-muted-foreground">Win/Loss root-cause audit</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Main Grid: Recent Deals & Recent Inbound Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Deals */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Recent Opportunities
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateDealModalOpen(true)}
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Deal
            </button>
          </div>

          <div className="space-y-2">
            {!data?.recentDeals || data.recentDeals.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No opportunities logged yet.
              </p>
            ) : (
              data.recentDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href={`/app/deals/${deal.id}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border hover:border-primary/50 transition-all group"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {deal.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {deal.companyName || "No Company"} • Stage: {deal.stageName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-mono font-bold text-foreground">
                      {deal.valueFormatted}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        deal.status === "WON"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : deal.status === "LOST"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {deal.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Inbound Leads */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                Inbound Leads Stream
              </h2>
            </div>
            <Link
              href="/app/leads"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              View Directory <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {!data?.recentLeads || data.recentLeads.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No inbound leads found.
              </p>
            ) : (
              data.recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => handleOpenLead(lead)}
                  className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <div className="space-y-0.5 min-w-0 pr-3">
                    <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors truncate">
                      {lead.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {lead.company} • {lead.source}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {lead.value}
                    </span>
                    <span className="rounded bg-surface px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                      {lead.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateDealModal
        isOpen={isCreateDealModalOpen}
        onClose={() => setIsCreateDealModalOpen(false)}
        onSuccess={fetchMetrics}
      />

      <CreateLeadModal
        isOpen={isCreateLeadModalOpen}
        onClose={() => setIsCreateLeadModalOpen(false)}
        onSuccess={fetchMetrics}
      />

      <LeadDetailPanel
        lead={selectedLead}
        isOpen={isLeadPanelOpen}
        onClose={() => setIsLeadPanelOpen(false)}
        onConversionSuccess={fetchMetrics}
      />
    </div>
  );
}
