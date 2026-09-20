"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Cable,
  RefreshCw,
  Sparkles,
  Zap,
} from "lucide-react";
import { INITIAL_DEMO_INTEGRATIONS } from "@/lib/demo-data/integrations";
import { DemoIntegration } from "@/lib/demo-data/types";
import { Badge } from "@/components/ui/badge";

export function IntegrationsView() {
  const [integrations, setIntegrations] = useState<DemoIntegration[]>(INITIAL_DEMO_INTEGRATIONS);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [justConnectedId, setJustConnectedId] = useState<string | null>(null);

  // Toggle connection status locally
  const toggleConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isNowConnected = item.status !== "Connected";
          if (isNowConnected) {
            setJustConnectedId(id);
            setTimeout(() => setJustConnectedId(null), 2500);
          }
          return {
            ...item,
            status: isNowConnected ? "Connected" : "Not Connected",
            lastSync: isNowConnected ? "Just now" : "Disabled",
            leadsSyncedToday: isNowConnected ? item.leadsSyncedToday + 12 : 0,
          };
        }
        return item;
      })
    );
  };

  // Simulate manual sync trigger
  const handleSyncNow = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      setIntegrations((prev) =>
        prev.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              leadsSyncedToday: item.leadsSyncedToday + 4,
              totalSynced: item.totalSynced + 4,
              lastSync: "Just now",
            };
          }
          return item;
        })
      );
      setSyncingId(null);
    }, 700);
  };

  const connectedCount = integrations.filter((i) => i.status === "Connected").length;
  const totalSyncedToday = integrations.reduce((acc, curr) => acc + curr.leadsSyncedToday, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Cable className="w-6 h-6 text-indigo-400" />
            Lead Channel Integrations
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time webhook ingestion bridges for property portals, social ads, and marketplaces
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300">
            Active Connectors: <strong className="text-emerald-400">{connectedCount} / {integrations.length}</strong> · Synced Today:{" "}
            <strong className="text-blue-400">{totalSyncedToday}</strong>
          </div>
        </div>
      </div>

      {/* Hero Notice Banner */}
      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-white">Zero-Latency Webhook Engine:</span> Inbound leads from any connected platform are mapped into the CRM in &lt;300ms.
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono">
          Demo Mode: Click &quot;Connect&quot; to test local status updates
        </span>
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {integrations.map((item) => {
          const isConnected = item.status === "Connected";
          const isSyncing = syncingId === item.id;
          const isJustConnected = justConnectedId === item.id;

          return (
            <motion.div
              key={item.id}
              layout
              className={`p-5 rounded-2xl bg-[#0F172A]/80 border transition-all duration-200 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                isConnected
                  ? "border-white/15 hover:border-blue-500/40"
                  : "border-white/5 opacity-80 hover:opacity-100"
              }`}
            >
              {isJustConnected && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-x-0 top-0 py-1 bg-emerald-500 text-white text-[11px] font-semibold text-center z-10"
                >
                  ✓ Successfully Connected!
                </motion.div>
              )}

              <div>
                {/* Header: Icon & Category */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm border ${item.avatarBg} ${item.accentBorder} ${item.iconColor}`}
                  >
                    {item.shortName}
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-900 text-slate-400 border border-white/5">
                    {item.category}
                  </span>
                </div>

                {/* Name & Description */}
                <h3 className="text-sm font-bold text-white mb-1">{item.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Status & Metrics */}
              <div className="pt-3 border-t border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Connection Status</span>
                  <Badge
                    variant={isConnected ? "success" : "default"}
                    className="text-[11px] inline-flex items-center gap-1"
                  >
                    {isConnected ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Connected
                      </>
                    ) : (
                      "Not Connected"
                    )}
                  </Badge>
                </div>

                {isConnected && (
                  <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-900/60 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block">Today</span>
                      <span className="text-white font-bold">+{item.leadsSyncedToday} leads</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Total Synced</span>
                      <span className="text-slate-300">{item.totalSynced.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {isConnected ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSyncNow(item.id)}
                        disabled={isSyncing}
                        className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/10"
                      >
                        <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin text-blue-400" : "text-slate-400"}`} />
                        <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleConnection(item.id)}
                        className="py-1.5 px-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 text-xs transition-colors border border-white/5"
                        title="Disconnect Integration"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleConnection(item.id)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/20"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Connect Platform
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
