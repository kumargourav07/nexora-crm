"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Target,
  Trophy,
  ArrowUpRight,
  Calendar,
  Layers,
  Award,
} from "lucide-react";
import { DEMO_ANALYTICS_DATA } from "@/lib/demo-data/analytics";

export function AnalyticsView() {
  const [hoveredSource, setHoveredSource] = useState<number | null>(null);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const sources = DEMO_ANALYTICS_DATA.leadSourceDistribution;
  const revenueMonths = DEMO_ANALYTICS_DATA.revenueByMonth;
  const performers = DEMO_ANALYTICS_DATA.topPerformers;
  const maxRev = 100;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-400" />
            Executive Analytics &amp; Reports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time attribution, channel ROI, pipeline velocity, and sales quota pacing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>Timeframe: Q1 - Q2 2026</span>
          </div>
        </div>
      </div>

      {/* Top 4 Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 uppercase font-medium">
            <span>Customer Acquisition Cost</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">₹1,840</div>
          <div className="mt-1 text-xs text-emerald-400 font-mono flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            -18.4% cost efficiency
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 uppercase font-medium">
            <span>Avg Deal Velocity</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">11.4 Days</div>
          <div className="mt-1 text-xs text-emerald-400 font-mono flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            3.2 days faster
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 uppercase font-medium">
            <span>Lead-to-Win Rate</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">32.8%</div>
          <div className="mt-1 text-xs text-emerald-400 font-mono flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />
            +4.6% vs benchmark
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2 uppercase font-medium">
            <span>Pipeline Coverage</span>
            <Layers className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">3.8x</div>
          <div className="mt-1 text-xs text-slate-400 font-mono">
            Healthy revenue buffer
          </div>
        </div>
      </div>

      {/* Main Charts: Lead Sources Distribution (Donut / Bar) & Revenue Growth */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Source Channel Attribution */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-400" />
                Lead Source Channel Attribution
              </h2>
              <span className="text-xs font-mono text-slate-400">12,482 Total</span>
            </div>

            {/* Horizontal Distribution Bars with Interactive Details */}
            <div className="space-y-3.5 mt-2">
              {sources.map((item, idx) => {
                const isHovered = hoveredSource === idx;
                return (
                  <div
                    key={item.source}
                    onMouseEnter={() => setHoveredSource(idx)}
                    onMouseLeave={() => setHoveredSource(null)}
                    className={`p-3 rounded-xl bg-slate-900/60 border transition-all cursor-pointer ${
                      isHovered ? "border-blue-500/50 bg-slate-900/90 shadow-md shadow-blue-500/10" : "border-white/5 hover:border-blue-500/30"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold text-white">{item.source}</span>
                      </div>
                      <div className="font-mono text-xs text-slate-300">
                        <strong className="text-white">{item.percentage}%</strong> ({item.leads.toLocaleString("en-IN")} leads)
                      </div>
                    </div>

                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>Primary Inbound Driver: <strong>Facebook Lead Ads (32%)</strong></span>
            <span className="text-emerald-400 font-mono">Zero attribution drop</span>
          </div>
        </div>

        {/* Monthly Revenue Velocity Area Chart */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Revenue Growth Velocity (INR Lakhs)
              </h2>
              <span className="text-xs font-mono text-emerald-400 font-bold">+100.4% H1 Growth</span>
            </div>

            {/* Interactive SVG Chart */}
            <div className="h-60 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {revenueMonths.map((item, idx) => {
                const heightPercent = (item.revenue / maxRev) * 100;
                const isHovered = hoveredMonth === idx;

                return (
                  <div
                    key={item.month}
                    className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    onMouseEnter={() => setHoveredMonth(idx)}
                    onMouseLeave={() => setHoveredMonth(null)}
                  >
                    {isHovered && (
                      <div className="absolute -top-10 z-20 px-2.5 py-1 rounded-lg bg-slate-900 border border-emerald-500/40 text-xs shadow-xl pointer-events-none whitespace-nowrap">
                        <div className="font-semibold text-white">{item.month} 2026</div>
                        <div className="text-emerald-400 font-mono">Revenue: {item.label}</div>
                      </div>
                    )}

                    <div className="w-full max-w-[44px] bg-slate-800/80 rounded-t-lg relative overflow-hidden h-full flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${heightPercent}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08 }}
                        className={`w-full rounded-t-lg transition-all ${
                          isHovered
                            ? "bg-gradient-to-t from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/30"
                            : "bg-gradient-to-t from-emerald-600/80 to-emerald-400/80 group-hover:from-emerald-500 group-hover:to-teal-300"
                        }`}
                      />
                    </div>

                    <span className="mt-2 text-xs font-medium text-slate-400 group-hover:text-white transition-colors">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="w-full h-px bg-white/10" />
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 text-xs text-slate-400 flex items-center justify-between">
            <span>Base Month: Jan (₹42L)</span>
            <span>Current Run-rate: <strong>₹84.2L / mo</strong></span>
          </div>
        </div>
      </div>

      {/* Rep Leaderboard Section */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Sales Representative Performance Leaderboard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Closed deals, commission quota pacing, and realized billing
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Sync</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {performers.map((rep, idx) => (
            <div
              key={rep.name}
              className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-amber-500/30 transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                    {rep.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-white text-xs">{rep.name}</div>
                    <div className="text-slate-400 text-[11px]">{rep.role}</div>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-amber-400">
                  #{idx + 1}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                <div>
                  <span className="text-slate-500 text-[10px] block">Deals Won</span>
                  <span className="text-white font-bold">{rep.closedDeals}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px] block">Revenue</span>
                  <span className="text-emerald-400 font-bold">{rep.revenue}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
