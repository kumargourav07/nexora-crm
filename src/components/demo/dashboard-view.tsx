"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  Target,
  Percent,
  TrendingUp,
  ArrowUpRight,
  ArrowRight,
  Layers,
  Sparkles,
  ChevronRight,
  Activity,
} from "lucide-react";
import { DEMO_ANALYTICS_DATA, INITIAL_DEMO_LEADS } from "@/lib/demo-data";
import { Lead } from "@/lib/demo-data/types";
import { Badge } from "@/components/ui/badge";
import { LeadDetailPanel } from "@/components/demo/lead-detail-panel";

export function DashboardView() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadPanelOpen, setIsLeadPanelOpen] = useState(false);
  const [activeRevenueHover, setActiveRevenueHover] = useState<number | null>(null);

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadPanelOpen(true);
  };

  const kpis = [
    {
      label: "Total Leads",
      value: DEMO_ANALYTICS_DATA.kpis.totalLeads,
      change: DEMO_ANALYTICS_DATA.kpis.totalLeadsChange,
      sublabel: "vs last month",
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Qualified Leads",
      value: DEMO_ANALYTICS_DATA.kpis.qualifiedLeads,
      change: DEMO_ANALYTICS_DATA.kpis.qualifiedLeadsChange,
      sublabel: "34.3% of total",
      icon: Target,
      color: "text-indigo-400",
      bg: "bg-indigo-500/10 border-indigo-500/20",
    },
    {
      label: "Conversion Rate",
      value: DEMO_ANALYTICS_DATA.kpis.conversionRate,
      change: DEMO_ANALYTICS_DATA.kpis.conversionRateChange,
      sublabel: "Industry avg: 18%",
      icon: Percent,
      color: "text-sky-400",
      bg: "bg-sky-500/10 border-sky-500/20",
    },
    {
      label: "Total Revenue",
      value: DEMO_ANALYTICS_DATA.kpis.totalRevenue,
      change: DEMO_ANALYTICS_DATA.kpis.totalRevenueChange,
      sublabel: "Q2 target achieved",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
  ];

  const recentLeads = INITIAL_DEMO_LEADS.slice(0, 5);
  const revenueMonths = DEMO_ANALYTICS_DATA.revenueByMonth;
  const maxRev = 100; // max value for SVG scale (in Lakhs)

  // Status badge config helper
  const getStatusVariant = (status: string): "default" | "success" | "warning" | "error" => {
    switch (status) {
      case "Won":
        return "success";
      case "Qualified":
        return "default";
      case "Proposal":
      case "Negotiation":
        return "warning";
      case "Lost":
        return "error";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-indigo-950/30 border border-blue-500/20 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Live Product Demo Workspace
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Good morning, Alex
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-xl">
            Here&apos;s what&apos;s happening across your sales pipeline, revenue, and active team performance today.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <Link
            href="/demo/leads"
            className="px-4 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
          >
            Manage Leads
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/demo/pipeline"
            className="px-4 py-2 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors flex items-center gap-1.5"
          >
            Open Kanban Board
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="p-5 rounded-2xl bg-[#0F172A]/80 border border-white/10 hover:border-blue-500/30 transition-all duration-200 shadow-sm group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {kpi.label}
                </span>
                <div className={`p-2 rounded-xl border ${kpi.bg} ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
                  {kpi.value}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                <span className="inline-flex items-center text-emerald-400 font-medium font-mono">
                  <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
                  {kpi.change}
                </span>
                <span className="text-slate-500">{kpi.sublabel}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Mid Section: Revenue Chart + Lead Pipeline Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Performance Chart (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Revenue Trajectory (H1 2026)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Monthly closed revenue velocity in INR Lakhs (₹)
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  Revenue Realized
                </span>
              </div>
            </div>

            {/* Interactive SVG Chart */}
            <div className="relative pt-4 pb-2">
              <div className="h-56 w-full flex items-end justify-between gap-2 sm:gap-4 px-2">
                {revenueMonths.map((item, idx) => {
                  const heightPercent = (item.revenue / maxRev) * 100;
                  const isHovered = activeRevenueHover === idx;

                  return (
                    <div
                      key={item.month}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                      onMouseEnter={() => setActiveRevenueHover(idx)}
                      onMouseLeave={() => setActiveRevenueHover(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-12 z-20 px-3 py-1.5 rounded-lg bg-slate-900 border border-blue-500/40 text-xs shadow-xl pointer-events-none whitespace-nowrap">
                          <div className="font-semibold text-white">{item.month} 2026</div>
                          <div className="text-blue-400 font-mono">
                            Revenue: {item.label} · {item.leads} leads
                          </div>
                        </div>
                      )}

                      {/* Bar Fill */}
                      <div className="w-full max-w-[48px] bg-slate-800/80 rounded-t-lg relative overflow-hidden h-full flex items-end">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${heightPercent}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.08 }}
                          className={`w-full rounded-t-lg transition-all duration-200 ${
                            isHovered
                              ? "bg-gradient-to-t from-blue-600 to-indigo-400 shadow-lg shadow-blue-500/30"
                              : "bg-gradient-to-t from-blue-600/80 to-blue-400/80 group-hover:from-blue-500 group-hover:to-blue-300"
                          }`}
                        />
                      </div>

                      {/* X-Axis Label */}
                      <span className="mt-3 text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                        {item.month}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Baseline border */}
              <div className="w-full h-px bg-white/10 mt-1" />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>Peak Month: <strong>June (₹84.2L)</strong></span>
            <Link
              href="/demo/analytics"
              className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
            >
              View Full Analytics
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Lead Pipeline Funnel Stage Summary (1 col) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Pipeline Stages
              </h2>
              <Link
                href="/demo/pipeline"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Board →
              </Link>
            </div>

            <div className="space-y-3.5">
              {DEMO_ANALYTICS_DATA.pipelineSummary.map((stage) => {
                const totalDeals = 872;
                const percentage = Math.round((stage.count / totalDeals) * 100);

                return (
                  <div key={stage.stage} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-300">{stage.stage}</span>
                      <span className="font-mono text-slate-400">
                        {stage.count} <span className="text-slate-600">({stage.value})</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800/80 overflow-hidden">
                      <div
                        className={`h-full ${stage.color} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 flex items-center justify-between">
            <span>Overall Win Rate</span>
            <span className="font-mono font-bold text-white">32.8%</span>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Leads Table */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Recent High-Value Inquiries
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Synced automatically across external lead channels into one queue
            </p>
          </div>

          <Link
            href="/demo/leads"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 self-start sm:self-auto"
          >
            View all 12,482 leads
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[620px]">
            <thead className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-medium">
              <tr>
                <th className="py-3 px-3">Lead Contact</th>
                <th className="py-3 px-3">Company</th>
                <th className="py-3 px-3">Source Channel</th>
                <th className="py-3 px-3">Stage</th>
                <th className="py-3 px-3">Assigned Rep</th>
                <th className="py-3 px-3 text-right">Deal Value</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentLeads.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => handleOpenLead(lead)}
                  className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                      {lead.name}
                    </div>
                    <div className="text-slate-500 text-[11px]">{lead.email}</div>
                  </td>
                  <td className="py-3 px-3 text-slate-300 font-medium">
                    {lead.company}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/5 text-[11px]">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant={getStatusVariant(lead.status)} className="text-[11px]">
                      {lead.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                        {lead.owner.charAt(0)}
                      </div>
                      <span>{lead.owner}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                    {lead.value}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLead(lead);
                      }}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                      title="Inspect Lead"
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Lead Detail Drawer */}
      <LeadDetailPanel
        lead={selectedLead}
        isOpen={isLeadPanelOpen}
        onClose={() => {
          setIsLeadPanelOpen(false);
          setSelectedLead(null);
        }}
      />
    </div>
  );
}
