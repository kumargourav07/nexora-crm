"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Briefcase,
  Award,
  Percent,
  Calendar,
  User,
  Kanban,
  Filter,
  Loader2,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getForecastMetricsAction } from "@/lib/actions/forecast-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";
import { CreateDealModal } from "./create-deal-modal";

export function ForecastClient() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pipelineFilter, setPipelineFilter] = useState<string>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<string>("ALL");
  const [datePreset, setDatePreset] = useState<string>("all");

  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [, startTransition] = useTransition();

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getForecastMetricsAction({
        pipelineId: pipelineFilter === "ALL" ? undefined : pipelineFilter,
        ownerId: ownerFilter === "ALL" ? undefined : ownerFilter,
        dateRangePreset: datePreset as any,
      });

      if (!res.success) {
        setError(res.error || "Failed to calculate forecast metrics");
      } else {
        setData(res.data);
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, [pipelineFilter, ownerFilter, datePreset]);

  useEffect(() => {
    Promise.all([getPipelinesAction(), getWorkspaceTeamAction()]).then(([pRes, tRes]) => {
      if (pRes.success && pRes.data?.pipelines) setPipelines(pRes.data.pipelines);
      if (tRes.success && tRes.data?.members) {
        setTeamMembers(tRes.data.members.map((m) => ({ id: m.userId, name: m.name })));
      }
    });
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (isLoading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Aggregating live PostgreSQL pipeline data...</p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    totalPipelineFormatted: "₹0",
    weightedPipelineFormatted: "₹0",
    wonRevenueFormatted: "₹0",
    lostRevenueFormatted: "₹0",
    winRate: "N/A",
    avgDealSizeFormatted: "₹0",
    openDealsCount: 0,
    expectedClosuresThisMonth: 0,
  };

  const monthlyBreakdown: any[] = data?.monthlyBreakdown || [];
  const ownerBreakdown: any[] = data?.ownerBreakdown || [];
  const stageBreakdown: any[] = data?.stageBreakdown || [];
  const pipelineBreakdown: any[] = data?.pipelineBreakdown || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider pr-2">
            <Filter className="w-3.5 h-3.5 text-primary" /> Filter:
          </div>

          <select
            value={pipelineFilter}
            onChange={(e) => setPipelineFilter(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-elevated px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Pipelines</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-elevated px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Sales Reps</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>

          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-elevated px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center gap-1.5 h-8 rounded-xl bg-primary px-3.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Opportunity</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Open Pipeline */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Open Pipeline</span>
            <Briefcase className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono">
            {kpis.totalPipelineFormatted}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {kpis.openDealsCount} active open opportunities
          </p>
        </div>

        {/* Weighted Pipeline */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-2 bg-gradient-to-br from-indigo-500/5 to-transparent">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold text-indigo-400">Weighted Forecast</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-indigo-400 font-mono">
            {kpis.weightedPipelineFormatted}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Σ (Deal Value × Probability %)
          </p>
        </div>

        {/* Won Revenue */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Closed & Won Revenue</span>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">
            {kpis.wonRevenueFormatted}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Win Rate: <strong className="text-foreground">{kpis.winRate}</strong>
          </p>
        </div>

        {/* Average Deal Size */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Average Deal Size</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-foreground font-mono">
            {kpis.avgDealSizeFormatted}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {kpis.expectedClosuresThisMonth} expected closures this month
          </p>
        </div>
      </div>

      {data?.totalDeals === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl border border-border bg-surface p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-elevated text-muted-foreground">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No sales data yet.</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Add your opportunities with values and expected close dates to generate forecast projections.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Deal</span>
          </button>
        </div>
      ) : (
        <>
          {/* Monthly Forecast Visual Projection */}
          <div className="rounded-2xl border border-border bg-surface p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Monthly Revenue Projections
                </h2>
                <p className="text-xs text-muted-foreground">
                  Expected closures by month based on close dates and win probabilities
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Total Pipeline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-muted-foreground">Weighted Forecast</span>
                </div>
              </div>
            </div>

            {/* Monthly Bar Projection */}
            {monthlyBreakdown.length > 0 ? (
              <div className="space-y-3">
                {monthlyBreakdown.map((m) => {
                  const maxVal = Math.max(...monthlyBreakdown.map((x) => x.totalPipeline), 1);
                  const totalPct = Math.round((m.totalPipeline / maxVal) * 100);
                  const weightedPct = Math.round((m.weightedPipeline / maxVal) * 100);

                  return (
                    <div key={m.month} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">{m.month}</span>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span className="text-muted-foreground">Total: {m.totalPipelineFormatted}</span>
                          <span className="text-indigo-400 font-bold">
                            Weighted: {m.weightedPipelineFormatted}
                          </span>
                          <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {m.dealsCount} deals
                          </span>
                        </div>
                      </div>

                      <div className="h-3 w-full rounded-full bg-surface-elevated overflow-hidden flex flex-col gap-0.5">
                        <div
                          className="h-1.5 rounded-full bg-blue-500 transition-all duration-500"
                          style={{ width: `${Math.max(totalPct, 4)}%` }}
                        />
                        <div
                          className="h-1 rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${Math.max(weightedPct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No deals with expected close dates found.
              </p>
            )}
          </div>

          {/* Breakdown Tables Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Rep Performance Table */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" /> Forecast by Salesperson
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated/50 text-[11px] font-bold text-muted-foreground">
                      <th className="py-2 px-3">Owner</th>
                      <th className="py-2 px-3 font-mono">Open Pipeline</th>
                      <th className="py-2 px-3 font-mono text-indigo-400">Weighted</th>
                      <th className="py-2 px-3 font-mono text-emerald-400">Won Revenue</th>
                      <th className="py-2 px-3 text-center">Win Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {ownerBreakdown.map((owner) => (
                      <tr key={owner.id} className="hover:bg-surface-hover/50">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {owner.ownerName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-muted-foreground">
                          {owner.openPipelineFormatted}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">
                          {owner.weightedPipelineFormatted}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                          {owner.wonRevenueFormatted}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">
                          {owner.winRate === "N/A" ? "—" : `${owner.winRate}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stage Velocity & Probability Table */}
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <Kanban className="w-4 h-4 text-blue-400" /> Pipeline by Stage
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated/50 text-[11px] font-bold text-muted-foreground">
                      <th className="py-2 px-3">Stage</th>
                      <th className="py-2 px-3 text-center">Deals</th>
                      <th className="py-2 px-3 font-mono">Stage Value</th>
                      <th className="py-2 px-3 font-mono text-indigo-400 text-right">Weighted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {stageBreakdown.map((stg) => (
                      <tr key={stg.stageName} className="hover:bg-surface-hover/50">
                        <td className="py-2.5 px-3 font-semibold text-foreground flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: stg.color || "#3B82F6" }}
                          />
                          <span>{stg.stageName}</span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-muted-foreground">
                          {stg.dealsCount}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-foreground">
                          {stg.valueFormatted}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-indigo-400 text-right">
                          {stg.weightedValueFormatted}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <CreateDealModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadMetrics}
      />
    </div>
  );
}
