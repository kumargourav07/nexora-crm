"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { INITIAL_DEMO_LEADS } from "@/lib/demo-data/leads";
import { Lead, LeadStatus } from "@/lib/demo-data/types";
import { LeadDetailPanel } from "@/components/demo/lead-detail-panel";

interface PipelineColumn {
  id: LeadStatus;
  title: string;
  color: string;
  borderColor: string;
  badgeBg: string;
}

const COLUMNS: PipelineColumn[] = [
  {
    id: "New",
    title: "New Inquiries",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    badgeBg: "bg-blue-500/10 text-blue-400",
  },
  {
    id: "Qualified",
    title: "Qualified",
    color: "text-indigo-400",
    borderColor: "border-indigo-500/30",
    badgeBg: "bg-indigo-500/10 text-indigo-400",
  },
  {
    id: "Proposal",
    title: "Proposal Sent",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    badgeBg: "bg-amber-500/10 text-amber-400",
  },
  {
    id: "Negotiation",
    title: "Negotiation",
    color: "text-sky-400",
    borderColor: "border-sky-500/30",
    badgeBg: "bg-sky-500/10 text-sky-400",
  },
  {
    id: "Won",
    title: "Closed / Won",
    color: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    badgeBg: "bg-emerald-500/10 text-emerald-400",
  },
];

const STAGE_ORDER: LeadStatus[] = ["New", "Qualified", "Proposal", "Negotiation", "Won"];

export function PipelineView() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_DEMO_LEADS);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Move deal to previous/next stage
  const moveDeal = (leadId: string, direction: "prev" | "next") => {
    setLeads((prev) =>
      prev.map((item) => {
        if (item.id === leadId) {
          const currentIndex = STAGE_ORDER.indexOf(item.status);
          const newIndex =
            direction === "next"
              ? Math.min(STAGE_ORDER.length - 1, currentIndex + 1)
              : Math.max(0, currentIndex - 1);
          const newStatus = STAGE_ORDER[newIndex];

          return {
            ...item,
            status: newStatus,
            lastActivity: "Moved stage just now",
            activities: [
              {
                id: `act-kanban-${Date.now()}`,
                type: "status_change",
                title: `Deal advanced to ${newStatus}`,
                description: `Moved stage via Kanban board demo.`,
                timestamp: "Just now",
                author: "Alex Chen (You)",
              },
              ...item.activities,
            ],
          };
        }
        return item;
      })
    );
  };

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((item) => (item.id === leadId ? { ...item, status: newStatus } : item))
    );
  };

  // Calculate total pipeline value across all columns
  const totalPipelineNumeric = leads.reduce((acc, curr) => acc + curr.valueNumeric, 0);
  const totalPipelineLakhs = (totalPipelineNumeric / 100000).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Sales Deal Pipeline
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual stage progression from initial inquiry to final closed contract
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300">
            Active Deals: <strong className="text-white">{leads.length}</strong> · Value:{" "}
            <strong className="text-emerald-400">₹{totalPipelineLakhs}L</strong>
          </div>
        </div>
      </div>

      {/* Kanban Board Horizontal Scroll Container */}
      <div className="overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 min-w-[1020px]">
          {COLUMNS.map((col) => {
            const columnLeads = leads.filter((lead) => lead.status === col.id);
            const colTotalVal = (
              columnLeads.reduce((acc, curr) => acc + curr.valueNumeric, 0) / 100000
            ).toFixed(1);

            return (
              <div
                key={col.id}
                className="flex flex-col rounded-2xl bg-[#0F172A]/70 border border-white/10 shadow-sm overflow-hidden min-h-[520px]"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-white/10 bg-white/[0.02] flex items-center justify-between border-t-2 ${col.borderColor}`}>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <span>{col.title}</span>
                    </h3>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                      ₹{colTotalVal}L total
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold font-mono ${col.badgeBg}`}>
                    {columnLeads.length}
                  </span>
                </div>

                {/* Card Stack */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {columnLeads.map((lead) => {
                    const currentIndex = STAGE_ORDER.indexOf(lead.status);
                    const canMovePrev = currentIndex > 0;
                    const canMoveNext = currentIndex < STAGE_ORDER.length - 1;

                    return (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => handleOpenLead(lead)}
                        className="p-3.5 rounded-xl bg-slate-900/90 border border-white/10 hover:border-blue-500/40 transition-all duration-200 shadow-sm cursor-pointer group relative"
                      >
                        {/* Company & Value */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <span className="text-xs font-semibold text-white group-hover:text-blue-400 transition-colors block line-clamp-1">
                              {lead.company}
                            </span>
                            <span className="text-[11px] text-slate-400 block line-clamp-1">
                              {lead.name}
                            </span>
                          </div>
                          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 whitespace-nowrap">
                            {lead.value}
                          </span>
                        </div>

                        {/* Source Tag & Owner */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                            {lead.source}
                          </span>

                          <div className="flex items-center gap-1">
                            <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[9px] font-bold">
                              {lead.owner.charAt(0)}
                            </div>
                            <span className="text-slate-300">{lead.owner.split(" ")[0]}</span>
                          </div>
                        </div>

                        {/* Stage Movement Controls */}
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-1 text-[11px]">
                          <button
                            type="button"
                            disabled={!canMovePrev}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveDeal(lead.id, "prev");
                            }}
                            className={`p-1 rounded-md transition-colors flex items-center gap-0.5 ${
                              canMovePrev
                                ? "text-slate-400 hover:text-white hover:bg-white/10"
                                : "text-slate-700 cursor-not-allowed"
                            }`}
                            title="Move to previous stage"
                          >
                            <ArrowLeft className="w-3 h-3" />
                            <span>Back</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canMoveNext}
                            onClick={(e) => {
                              e.stopPropagation();
                              moveDeal(lead.id, "next");
                            }}
                            className={`p-1 rounded-md transition-colors flex items-center gap-0.5 font-medium ${
                              canMoveNext
                                ? "text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                : "text-emerald-500 font-bold"
                            }`}
                            title={canMoveNext ? "Advance stage" : "Won deal"}
                          >
                            <span>{canMoveNext ? "Advance" : "Won"}</span>
                            {canMoveNext ? (
                              <ArrowRight className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}

                  {columnLeads.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-white/5 rounded-xl">
                      No deals in this stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-out Lead Detail Drawer */}
      <LeadDetailPanel
        lead={selectedLead}
        isOpen={isPanelOpen}
        onClose={() => {
          setIsPanelOpen(false);
          setSelectedLead(null);
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
