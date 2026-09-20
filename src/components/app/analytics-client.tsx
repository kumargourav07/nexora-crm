"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  Target,
  Percent,
  Users,
  PieChart,
  BarChart3,
  Loader2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { getDashboardMetricsAction } from "@/lib/actions/analytics-actions";

interface AnalyticsData {
  kpis: {
    totalLeads: string;
    totalLeadsChange: string;
    qualifiedLeads: string;
    qualifiedLeadsChange: string;
    conversionRate: string;
    conversionRateChange: string;
    totalRevenue: string;
    totalRevenueChange: string;
  };
  leadsByStatus: { status: string; count: number; totalValue: number }[];
  leadsBySource: { source: string; count: number }[];
}

export function AnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setError(null);
    try {
      const res = await getDashboardMetricsAction();
      if (!res.success) {
        setError(res.error || "Failed to load analytics");
      } else if (res.data) {
        setData(res.data as unknown as AnalyticsData);
      }
    } catch {
      setError("Unable to connect to database.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    getDashboardMetricsAction()
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setData(res.data as unknown as AnalyticsData);
        } else {
          setError(res.error || "Failed to load analytics");
        }
      })
      .catch(() => {
        if (mounted) setError("Unable to connect to database.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading && !data) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-2 p-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Aggregating real-time database intelligence...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
    );
  }

  const kpis = [
    {
      label: "Total Ingested Leads",
      value: data?.kpis?.totalLeads || "0",
      change: data?.kpis?.totalLeadsChange || "+0%",
      sublabel: "Across all active connectors",
      icon: Users,
    },
    {
      label: "Qualified Deal Velocity",
      value: data?.kpis?.qualifiedLeads || "0",
      change: data?.kpis?.qualifiedLeadsChange || "+0%",
      sublabel: "Sales-ready pipeline",
      icon: Target,
    },
    {
      label: "Lead-to-Win Conversion",
      value: data?.kpis?.conversionRate || "0.0%",
      change: data?.kpis?.conversionRateChange || "+0%",
      sublabel: "Industry benchmark: 18%",
      icon: Percent,
    },
    {
      label: "Gross Settled Volume",
      value: data?.kpis?.totalRevenue || "₹0.0L",
      change: data?.kpis?.totalRevenueChange || "+0%",
      sublabel: "Reconciled ledger",
      icon: TrendingUp,
    },
  ];

  const totalLeadsNum = Math.max(1, Number(data?.kpis?.totalLeads || 1));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            <span>360° Intelligence &amp; Channel Analytics</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Aggregated conversion funnels and acquisition metrics calculated dynamically from PostgreSQL
          </p>
        </div>

        <button
          onClick={() => {
            setIsLoading(true);
            fetchMetrics();
          }}
          className="p-2 rounded-xl bg-surface border border-border hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors self-start sm:self-auto"
          title="Refresh database metrics"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-surface border border-border shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <span className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                  {kpi.value}
                </span>
                <p className="text-[11px] text-muted-foreground mt-1">{kpi.sublabel}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Breakdown */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Inbound Channel Share</h3>
              <p className="text-xs text-muted-foreground">Database lead volume grouped by capture source</p>
            </div>
            <PieChart className="w-4 h-4 text-primary" />
          </div>

          <div className="space-y-3 pt-2">
            {(data?.leadsBySource || []).map((sourceItem) => {
              const pct = Math.round((sourceItem.count / totalLeadsNum) * 100);
              return (
                <div key={sourceItem.source} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{sourceItem.source}</span>
                    <span className="font-mono text-muted-foreground">
                      {sourceItem.count} leads ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/40">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-gradient-to-r from-primary to-indigo-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline Stage Distribution */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface border border-border space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-foreground">Pipeline Stage Velocity</h3>
              <p className="text-xs text-muted-foreground">Active deal distribution across sales stages</p>
            </div>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-3 pt-2">
            {(data?.leadsByStatus || []).map((stageItem) => {
              const pct = Math.round((stageItem.count / totalLeadsNum) * 100);
              return (
                <div key={stageItem.status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{stageItem.status}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-400">
                        ₹{(stageItem.totalValue / 100000).toFixed(1)}L
                      </span>
                      <span className="font-mono text-muted-foreground">
                        ({stageItem.count} deals)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border/40">
                    <div
                      style={{ width: `${pct}%` }}
                      className="h-full bg-emerald-500 rounded-full transition-all"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
