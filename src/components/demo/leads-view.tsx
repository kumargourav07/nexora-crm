"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  ArrowUpRight,
  Users,
  X,
} from "lucide-react";
import { INITIAL_DEMO_LEADS } from "@/lib/demo-data/leads";
import { Lead, LeadStatus } from "@/lib/demo-data/types";
import { Badge } from "@/components/ui/badge";
import { LeadDetailPanel } from "@/components/demo/lead-detail-panel";

export function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>(INITIAL_DEMO_LEADS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [sourceFilter, setSourceFilter] = useState<string>("All");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Status badge config helper
  const getStatusVariant = (status: LeadStatus): "default" | "success" | "warning" | "error" => {
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

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      // Search across Name, Company, Source
      const matchesSearch =
        searchQuery === "" ||
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.owner.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "All" || lead.status === statusFilter;

      // Source filter
      const matchesSource = sourceFilter === "All" || lead.source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter]);

  // Total calculated pipeline value for filtered leads
  const filteredTotalValue = useMemo(() => {
    const total = filteredLeads.reduce((acc, curr) => acc + curr.valueNumeric, 0);
    return (total / 100000).toFixed(1);
  }, [filteredLeads]);

  const handleOpenLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsPanelOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((item) => {
        if (item.id === leadId) {
          const updated = {
            ...item,
            status: newStatus,
            lastActivity: "Just now",
            activities: [
              {
                id: `act-${Date.now()}`,
                type: "status_change" as const,
                title: `Status changed to ${newStatus}`,
                description: `Lead moved from ${item.status} to ${newStatus} in interactive demo.`,
                timestamp: "Just now",
                author: "Alex Chen (You)",
              },
              ...item.activities,
            ],
          };
          // Also update selectedLead if currently open
          if (selectedLead && selectedLead.id === leadId) {
            setSelectedLead(updated);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setSourceFilter("All");
  };

  const statusOptions: (string)[] = [
    "All",
    "New",
    "Contacted",
    "Qualified",
    "Proposal",
    "Negotiation",
    "Won",
    "Lost",
  ];

  const sourceOptions: (string)[] = [
    "All",
    "Facebook",
    "IndiaMART",
    "99acres",
    "Housing",
    "Google Ads",
    "Website",
    "WhatsApp",
    "Custom API",
  ];

  return (
    <div className="space-y-6">
      {/* Header Controls & Summary Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-400" />
            Lead Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time inbound lead queue synced across all digital channels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-slate-300">
            Filtered Value: <strong className="text-emerald-400">₹{filteredTotalValue}L</strong>
          </div>
          <button
            type="button"
            onClick={() => {
              const newLead: Lead = {
                id: `lead-${Date.now()}`,
                name: "Karan Malhotra",
                company: "Apex Infra Developers",
                email: "karan@apexinfra.com",
                phone: "+91 98210 44552",
                source: "Website",
                status: "New",
                owner: "Alex Chen",
                value: "₹2.4L",
                valueNumeric: 240000,
                lastActivity: "Just now",
                createdAt: "Just now",
                tags: ["Commercial", "High-Priority"],
                activities: [
                  {
                    id: `act-new-${Date.now()}`,
                    type: "captured",
                    title: "Inbound Lead Submitted",
                    description: "Website inquiry via contact pricing form.",
                    timestamp: "Just now",
                    author: "System Connector",
                  },
                ],
              };
              setLeads((prev) => [newLead, ...prev]);
            }}
            className="px-3.5 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Simulate Inbound Lead
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, company, channel, or rep..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  Status: {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Source Dropdown */}
          <div className="sm:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              {sourceOptions.map((src) => (
                <option key={src} value={src} className="bg-slate-900 text-white">
                  Source: {src}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Tags & Counts */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-mono">{filteredLeads.length}</strong> of{" "}
              <span className="font-mono">{leads.length}</span> demo leads
            </span>
            {(searchQuery || statusFilter !== "All" || sourceFilter !== "All") && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-blue-400 hover:text-blue-300 underline font-medium ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Click any lead row to inspect full CRM activity &amp; stage details
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm overflow-hidden">
        {filteredLeads.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Lead Source</th>
                  <th className="py-3 px-4">Current Status</th>
                  <th className="py-3 px-4">Assigned Rep</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-right">Deal Value</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleOpenLead(lead)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                        {lead.name}
                      </div>
                      <div className="text-slate-500 text-[11px]">{lead.email}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {lead.company}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800/80 text-slate-300 border border-white/5 text-[11px]">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusVariant(lead.status)} className="text-[11px]">
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[10px] font-bold">
                          {lead.owner.charAt(0)}
                        </div>
                        <span>{lead.owner}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {lead.lastActivity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-white">
                      {lead.value}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLead(lead);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Open Lead Profile"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-400 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No leads found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No demo leads match your current search query &quot;{searchQuery}&quot; or status filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors inline-block"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Slide-out Detail Drawer */}
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
