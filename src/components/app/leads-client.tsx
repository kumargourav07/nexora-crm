"use client";

import React, { useState, useEffect, useTransition, useCallback } from "react";
import {
  Search,
  Plus,
  Users,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trash2,
  Sparkles,
} from "lucide-react";
import { getLeadsAction, updateLeadStatusAction, deleteLeadAction } from "@/lib/actions/leads-actions";
import { Badge } from "@/components/ui/badge";
import { LeadDetailPanel } from "@/components/demo/lead-detail-panel";
import { CreateLeadModal } from "./create-lead-modal";
import { ConvertLeadModal } from "./convert-lead-modal";
import { Lead, LeadStatus, LeadSource } from "@/lib/demo-data/types";
import { LeadStatus as PrismaLeadStatus, LeadSource as PrismaLeadSource } from "@prisma/client";

interface DBLead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: string;
  ownerName: string;
  valueNumeric: number;
  valueFormatted: string;
  tags: string[];
  notes?: string | null;
  isConverted?: boolean;
  createdAt: string;
  updatedAt: string;
  activities: {
    id: string;
    type: "captured" | "call" | "email" | "meeting" | "status_change" | "note";
    title: string;
    description: string;
    timestamp: string;
    author: string;
  }[];
}

export function LeadsClient() {
  const [leads, setLeads] = useState<DBLead[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalCount: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sourceFilter, setSourceFilter] = useState<string>("ALL");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [convertModalLead, setConvertModalLead] = useState<DBLead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchLeads = useCallback(async (page = 1, currentSearch = searchQuery, currentStatus = statusFilter, currentSource = sourceFilter) => {
    setError(null);
    try {
      const res = await getLeadsAction({
        search: currentSearch,
        status: currentStatus === "ALL" ? undefined : (currentStatus as PrismaLeadStatus),
        source: currentSource === "ALL" ? undefined : (currentSource as PrismaLeadSource),
        page,
        limit: 15,
      });

      if (!res.success) {
        setError(res.error || "Failed to load leads");
      } else if (res.data) {
        setLeads((res.data.leads || []) as unknown as DBLead[]);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch {
      setError("Unable to connect to database.");
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, statusFilter, sourceFilter]);

  useEffect(() => {
    let mounted = true;
    getLeadsAction({
      search: searchQuery,
      status: statusFilter === "ALL" ? undefined : (statusFilter as PrismaLeadStatus),
      source: sourceFilter === "ALL" ? undefined : (sourceFilter as PrismaLeadSource),
      page: 1,
      limit: 15,
    })
      .then((res) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setLeads((res.data.leads || []) as unknown as DBLead[]);
          if (res.data.pagination) setPagination(res.data.pagination);
        } else {
          setError(res.error || "Failed to load leads");
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
  }, [statusFilter, sourceFilter, searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    fetchLeads(1);
  };

  const getStatusVariant = (status: string): "default" | "success" | "warning" | "error" => {
    switch (status) {
      case "WON":
      case "Won":
        return "success";
      case "QUALIFIED":
      case "Qualified":
        return "default";
      case "PROPOSAL":
      case "Proposal":
      case "NEGOTIATION":
      case "Negotiation":
        return "warning";
      case "LOST":
      case "Lost":
        return "error";
      default:
        return "default";
    }
  };

  const handleOpenLead = (lead: DBLead) => {
    setSelectedLead({
      id: lead.id,
      name: lead.name,
      company: lead.company,
      email: lead.email,
      phone: lead.phone,
      value: lead.valueFormatted || `₹${(lead.valueNumeric / 100000).toFixed(1)}L`,
      valueNumeric: lead.valueNumeric,
      owner: lead.ownerName,
      source: lead.source as LeadSource,
      status: (lead.status[0].toUpperCase() + lead.status.slice(1).toLowerCase()) as LeadStatus,
      tags: lead.tags,
      notes: lead.notes || undefined,
      createdAt: lead.createdAt,
      lastActivity: "Recent",
      activities: lead.activities,
    });
    setIsPanelOpen(true);
  };

  const handleStatusChange = (leadId: string, newStatus: LeadStatus) => {
    startTransition(async () => {
      const upperStatus = newStatus.toUpperCase() as PrismaLeadStatus;
      await updateLeadStatusAction(leadId, upperStatus);
      fetchLeads(pagination.page);
      setIsPanelOpen(false);
    });
  };

  const handleDeleteLead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this lead from the database?")) return;

    startTransition(async () => {
      await deleteLeadAction(id);
      fetchLeads(pagination.page);
    });
  };

  const totalValueNumeric = leads.reduce((acc, curr) => acc + (curr.valueNumeric || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            <span>PostgreSQL Lead Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Inbound inquiries, valuations, and one-click conversion into contacts & opportunities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-mono text-muted-foreground">
            Total Leads: <strong className="text-foreground">{pagination.totalCount}</strong> · Showing Value:{" "}
            <strong className="text-emerald-400">₹{(totalValueNumeric / 100000).toFixed(1)}L</strong>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, email, or phone in database..."
            className="w-full h-10 rounded-xl border border-border bg-background pl-10 pr-20 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[11px] font-bold cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 overflow-x-auto">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <option value="ALL">All Stages</option>
            <option value="NEW">New</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUALIFIED">Qualified</option>
            <option value="PROPOSAL">Proposal</option>
            <option value="NEGOTIATION">Negotiation</option>
            <option value="WON">Won</option>
            <option value="LOST">Lost</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
          >
            <option value="ALL">All Sources</option>
            <option value="WEBSITE">Website</option>
            <option value="FACEBOOK">Facebook / Meta</option>
            <option value="INDIAMART">IndiaMART</option>
            <option value="NINETY_NINE_ACRES">99acres</option>
            <option value="HOUSING">Housing.com</option>
            <option value="GOOGLE_ADS">Google Ads</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="OTHER">Other</option>
          </select>

          {(statusFilter !== "ALL" || sourceFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setSourceFilter("ALL");
                setSearchQuery("");
                setIsLoading(true);
                fetchLeads(1, "", "ALL", "ALL");
              }}
              className="h-10 px-3 rounded-xl border border-border hover:bg-surface-hover text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Database Table */}
      <div className="rounded-2xl border border-border bg-surface overflow-hidden">
        {isLoading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center gap-2 p-8">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground">Fetching records from PostgreSQL...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-xs">{error}</div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm font-bold text-foreground">No leads found in database</p>
            <p className="text-xs text-muted-foreground">
              Try modifying your search filter or create a new lead.
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Lead</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-surface-elevated text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Lead Contact</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Value</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => handleOpenLead(lead)}
                    className="hover:bg-surface-hover cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-medium text-foreground">
                      <div className="font-bold flex items-center gap-1.5">
                        <span>{lead.name}</span>
                        {lead.isConverted && (
                          <span className="rounded bg-primary/10 border border-primary/20 px-1.5 py-0.2 text-[9px] font-mono text-primary font-bold">
                            CONVERTED
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-muted-foreground font-mono">{lead.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-foreground font-medium">{lead.company}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-surface-elevated border border-border text-[10px] font-medium">
                        {lead.source}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge variant={getStatusVariant(lead.status)} size="sm">
                        {lead.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">{lead.ownerName}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground text-right">
                      {lead.valueFormatted}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {!lead.isConverted && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConvertModalLead(lead);
                            }}
                            title="Convert Lead"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary hover:text-primary-foreground text-[11px] font-bold text-primary transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Convert</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLead(lead);
                          }}
                          className="px-2 py-1 rounded-lg border border-border hover:bg-surface-elevated text-[11px] font-medium text-primary cursor-pointer"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteLead(lead.id, e)}
                          className="p-1 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-400 cursor-pointer"
                          title="Delete Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/80 bg-surface-elevated text-xs text-muted-foreground">
            <span>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> (
              {pagination.totalCount} total records)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => {
                  setIsLoading(true);
                  fetchLeads(pagination.page - 1);
                }}
                className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-30 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => {
                  setIsLoading(true);
                  fetchLeads(pagination.page + 1);
                }}
                className="p-1.5 rounded-lg border border-border hover:bg-surface text-foreground disabled:opacity-30 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals & Panels */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsLoading(true);
          fetchLeads(1);
        }}
      />

      <ConvertLeadModal
        isOpen={!!convertModalLead}
        onClose={() => setConvertModalLead(null)}
        lead={
          convertModalLead
            ? {
                id: convertModalLead.id,
                name: convertModalLead.name,
                company: convertModalLead.company,
                email: convertModalLead.email,
                phone: convertModalLead.phone,
                valueNumeric: convertModalLead.valueNumeric,
                source: convertModalLead.source,
                notes: convertModalLead.notes,
                isConverted: convertModalLead.isConverted,
              }
            : null
        }
        onSuccess={() => {
          setConvertModalLead(null);
          fetchLeads(pagination.page);
        }}
      />

      <LeadDetailPanel
        lead={selectedLead}
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        onStatusChange={handleStatusChange}
        onConversionSuccess={() => {
          setIsPanelOpen(false);
          fetchLeads(pagination.page);
        }}
      />
    </div>
  );
}
