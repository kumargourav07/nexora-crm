"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileBarChart,
  Award,
  TrendingUp,
  XCircle,
  Percent,
  Calendar,
  Filter,
  Loader2,
  ArrowUpRight,
  PieChart,
  User,
  Kanban,
  Building2,
  Briefcase,
  ChevronRight,
} from "lucide-react";
import { getForecastMetricsAction, getSalesReportAction } from "@/lib/actions/forecast-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";

export function SalesReportClient() {
  const [forecastData, setForecastData] = useState<any>(null);
  const [salesReportData, setSalesReportData] = useState<any>(null);
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  const [datePreset, setDatePreset] = useState<string>("this_year");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("ALL");
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("ALL");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filterParams = {
        dateRangePreset: datePreset as any,
        pipelineId: selectedPipelineId === "ALL" ? undefined : selectedPipelineId,
        ownerId: selectedOwnerId === "ALL" ? undefined : selectedOwnerId,
      };

      const [forecastRes, reportRes] = await Promise.all([
        getForecastMetricsAction(filterParams),
        getSalesReportAction(filterParams),
      ]);

      if (forecastRes.success && forecastRes.data) {
        setForecastData(forecastRes.data);
      }
      if (reportRes.success && reportRes.data) {
        setSalesReportData(reportRes.data);
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, [datePreset, selectedPipelineId, selectedOwnerId]);

  useEffect(() => {
    Promise.all([getPipelinesAction(), getWorkspaceTeamAction()]).then(([pipRes, teamRes]) => {
      if (pipRes.success && pipRes.data?.pipelines) {
        setPipelines(pipRes.data.pipelines);
      }
      if (teamRes.success && teamRes.data?.members) {
        setTeamMembers(teamRes.data.members.map((m) => ({ id: m.userId, name: m.name })));
      }
    });
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !forecastData && !salesReportData) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">
          Compiling executive revenue & forecast ledger...
        </p>
      </div>
    );
  }

  const kpis = forecastData?.kpis || {
    totalPipelineFormatted: "₹0",
    weightedPipelineFormatted: "₹0",
    wonRevenueFormatted: "₹0",
    lostRevenueFormatted: "₹0",
    winRate: "N/A",
    avgDealSizeFormatted: "₹0",
    openDealsCount: 0,
    wonDealsCount: 0,
    lostDealsCount: 0,
  };

  const cohorts = forecastData?.cohorts || {};
  const ownerBreakdown: any[] = forecastData?.ownerBreakdown || [];
  const stageBreakdown: any[] = forecastData?.stageBreakdown || [];
  const lostReasons: any[] = salesReportData?.lostReasons || [];
  const recentDeals: any[] = salesReportData?.deals || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Sales Revenue & Forecast Intelligence
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Live workspace revenue modeling with decimal-safe calculations
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-elevated px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="today">Today</option>
            <option value="this_week">This Week</option>
            <option value="this_month">This Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="all">All Time</option>
          </select>

          <select
            value={selectedPipelineId}
            onChange={(e) => setSelectedPipelineId(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-elevated px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Pipelines</option>
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedOwnerId}
            onChange={(e) => setSelectedOwnerId(e.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-elevated px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">All Reps</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase">Pipeline Value</span>
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-xl font-bold text-foreground font-mono mt-1">
            {kpis.totalPipelineFormatted}
          </p>
          <span className="text-[10px] text-muted-foreground">{kpis.openDealsCount} open deals</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-indigo-400">
            <span className="text-[11px] font-semibold uppercase">Weighted Value</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-indigo-400 font-mono mt-1">
            {kpis.weightedPipelineFormatted}
          </p>
          <span className="text-[10px] text-muted-foreground">Value × Probability</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-semibold uppercase">Won Revenue</span>
            <Award className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {kpis.wonRevenueFormatted}
          </p>
          <span className="text-[10px] text-muted-foreground">{kpis.wonDealsCount} won deals</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-semibold uppercase">Lost Value</span>
            <XCircle className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-rose-400 font-mono mt-1">
            {kpis.lostRevenueFormatted}
          </p>
          <span className="text-[10px] text-muted-foreground">{kpis.lostDealsCount} lost deals</span>
        </div>

        <div className="col-span-2 lg:col-span-1 rounded-2xl border border-border bg-surface p-4 space-y-1 shadow-sm">
          <div className="flex items-center justify-between text-purple-400">
            <span className="text-[11px] font-semibold uppercase">Win Rate %</span>
            <Percent className="w-4 h-4" />
          </div>
          <p className="text-xl font-bold text-foreground font-mono mt-1">
            {kpis.winRate === "N/A" ? "N/A" : `${kpis.winRate}`}
          </p>
          <span className="text-[10px] text-muted-foreground">Won / (Won + Lost)</span>
        </div>
      </div>

      {/* Close Date Forecast Cohorts */}
      <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">
              Expected Close Date Forecast Cohorts
            </h3>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            Grouped by closing timeline
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-1">
            <p className="text-xs font-bold text-foreground">This Week</p>
            <p className="text-base font-bold text-primary font-mono">
              {cohorts.thisWeek?.totalFormatted || "₹0"}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Weighted: {cohorts.thisWeek?.weightedFormatted || "₹0"} • {cohorts.thisWeek?.count || 0}{" "}
              deal(s)
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-1">
            <p className="text-xs font-bold text-foreground">This Month</p>
            <p className="text-base font-bold text-emerald-400 font-mono">
              {cohorts.thisMonth?.totalFormatted || "₹0"}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Weighted: {cohorts.thisMonth?.weightedFormatted || "₹0"} • {cohorts.thisMonth?.count || 0}{" "}
              deal(s)
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-1">
            <p className="text-xs font-bold text-foreground">Next Month</p>
            <p className="text-base font-bold text-indigo-400 font-mono">
              {cohorts.nextMonth?.totalFormatted || "₹0"}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Weighted: {cohorts.nextMonth?.weightedFormatted || "₹0"} • {cohorts.nextMonth?.count || 0}{" "}
              deal(s)
            </p>
          </div>

          <div className="p-4 rounded-xl bg-surface-elevated border border-border space-y-1">
            <p className="text-xs font-bold text-foreground">Later / Long Term</p>
            <p className="text-base font-bold text-purple-400 font-mono">
              {cohorts.later?.totalFormatted || "₹0"}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              Weighted: {cohorts.later?.weightedFormatted || "₹0"} • {cohorts.later?.count || 0} deal(s)
            </p>
          </div>
        </div>
      </div>

      {/* Owner Breakdown & Stage Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rep Performance Matrix */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>Sales Forecast by Rep</span>
            </h3>
          </div>

          {ownerBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No rep data available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="pb-2">Owner</th>
                    <th className="pb-2 text-right">Open Pipeline</th>
                    <th className="pb-2 text-right">Weighted</th>
                    <th className="pb-2 text-right">Won Revenue</th>
                    <th className="pb-2 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {ownerBreakdown.map((rep) => (
                    <tr key={rep.id} className="hover:bg-surface-elevated">
                      <td className="py-2.5 font-semibold text-foreground">{rep.ownerName}</td>
                      <td className="py-2.5 text-right font-mono">{rep.openPipelineFormatted}</td>
                      <td className="py-2.5 text-right font-mono text-indigo-400">
                        {rep.weightedPipelineFormatted}
                      </td>
                      <td className="py-2.5 text-right font-mono text-emerald-400">
                        {rep.wonRevenueFormatted}
                      </td>
                      <td className="py-2.5 text-right font-mono">{rep.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Stage Forecast Distribution */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Kanban className="w-4 h-4 text-indigo-400" />
              <span>Sales Forecast by Stage</span>
            </h3>
          </div>

          {stageBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No stage data available.</p>
          ) : (
            <div className="space-y-3">
              {stageBreakdown.map((s) => (
                <div
                  key={s.stageName}
                  className="p-3 rounded-xl bg-surface-elevated border border-border flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: s.color || "#3B82F6" }}
                    />
                    <div>
                      <p className="font-bold text-foreground">{s.stageName}</p>
                      <p className="text-[10px] text-muted-foreground">{s.dealsCount} deals in stage</p>
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-foreground">{s.valueFormatted}</p>
                    <p className="text-[10px] text-indigo-400">Weighted: {s.weightedValueFormatted}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Loss Reasons Breakdown & Recent Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loss Reason Breakdown */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <PieChart className="w-4 h-4 text-rose-400" />
            <span>Loss Reason Analysis</span>
          </h3>

          {lostReasons.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No lost deals recorded.</p>
          ) : (
            <div className="space-y-2.5">
              {lostReasons.map((lr) => (
                <div key={lr.reason} className="space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {LOST_REASON_LABELS[lr.reason] || lr.reason}
                    </span>
                    <span className="font-mono">
                      {lr.count} ({lr.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{ width: `${lr.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Closed & Open Deals Ledger */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <span>Recent Deals Ledger</span>
            </h3>
            <Link
              href="/app/deals"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentDeals.length === 0 ? (
            <p className="text-xs text-muted-foreground py-8 text-center">No deals found.</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {recentDeals.slice(0, 8).map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-elevated border border-border text-xs"
                >
                  <div className="space-y-0.5 truncate max-w-[200px]">
                    <Link
                      href={`/app/deals/${d.id}`}
                      className="font-bold text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {d.name}
                    </Link>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {d.companyName || d.contactName || d.stageName}
                    </p>
                  </div>
                  <div className="text-right font-mono">
                    <p className="font-bold text-foreground">{d.valueFormatted}</p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        d.status === "WON"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : d.status === "LOST"
                          ? "bg-rose-500/10 text-rose-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
