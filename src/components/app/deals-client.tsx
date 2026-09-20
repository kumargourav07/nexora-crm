"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Briefcase,
  TrendingUp,
  Award,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Kanban,
  Table as TableIcon,
  User,
  MoreHorizontal,
  CheckSquare,
  Square,
  Trash2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  getDealsAction,
  markDealWonAction,
  markDealLostAction,
  reopenDealAction,
  bulkUpdateDealsAction,
} from "@/lib/actions/deals-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";
import { CreateDealModal } from "./create-deal-modal";
import { PipelineClient } from "./pipeline-client";
import { ConvertLeadModal } from "./convert-lead-modal";
import { LOST_REASONS, LOST_REASON_LABELS } from "@/lib/validations/sales";
import { DealStatus, TaskPriority } from "@prisma/client";

interface FormattedDeal {
  id: string;
  name: string;
  valueNumeric: number;
  valueFormatted: string;
  weightedValue: number;
  weightedValueFormatted: string;
  currency: string;
  probability: number;
  priority: TaskPriority;
  status: "OPEN" | "WON" | "LOST";
  source: string;
  isStale: boolean;
  lastActivityAt: string | null;
  expectedCloseDate: string | null;
  wonAt: string | null;
  lostAt: string | null;
  lostReason: string | null;
  contactId: string | null;
  contactName: string | null;
  companyId: string | null;
  companyName: string | null;
  pipelineId: string;
  pipelineName: string;
  stageId: string;
  stageName: string;
  stageColor: string | null;
  isWonStage: boolean;
  isLostStage: boolean;
  ownerId: string | null;
  ownerName: string;
  createdAt: string;
  updatedAt: string;
}

interface SummaryMetrics {
  openDealsCount: number;
  pipelineValue: number;
  pipelineValueFormatted: string;
  weightedPipeline: number;
  weightedPipelineFormatted: string;
  wonRevenue: number;
  wonRevenueFormatted: string;
  lostValue: number;
  lostValueFormatted: string;
}

export function DealsClient() {
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [deals, setDeals] = useState<FormattedDeal[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics>({
    openDealsCount: 0,
    pipelineValue: 0,
    pipelineValueFormatted: "₹0",
    weightedPipeline: 0,
    weightedPipelineFormatted: "₹0",
    wonRevenue: 0,
    wonRevenueFormatted: "₹0",
    lostValue: 0,
    lostValueFormatted: "₹0",
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 25, totalCount: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "ALL">("ALL");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "ALL">("ALL");
  const [pipelineFilter, setPipelineFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"expectedCloseDate" | "value" | "probability" | "createdAt">("expectedCloseDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const [pipelines, setPipelines] = useState<{ id: string; name: string; stages: any[] }[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedDealIds, setSelectedDealIds] = useState<string[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<string>("");

  // Mark Won Modal State
  const [wonModalDeal, setWonModalDeal] = useState<FormattedDeal | null>(null);
  const [isWonSubmitting, setIsWonSubmitting] = useState(false);

  // Mark Lost Modal State
  const [lostModalDeal, setLostModalDeal] = useState<FormattedDeal | null>(null);
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState("");
  const [isLostSubmitting, setIsLostSubmitting] = useState(false);

  const [, startTransition] = useTransition();

  const fetchDeals = useCallback(
    async (
      page = 1,
      currentSearch = searchQuery,
      currentStatus = statusFilter,
      currentPriority = priorityFilter,
      currentPipeline = pipelineFilter,
      currentSortBy = sortBy,
      currentSortOrder = sortOrder
    ) => {
      setError(null);
      try {
        const res = await getDealsAction({
          search: currentSearch,
          status: currentStatus,
          priority: currentPriority,
          pipelineId: currentPipeline === "ALL" ? undefined : currentPipeline,
          sortBy: currentSortBy,
          sortOrder: currentSortOrder,
          page,
          limit: 25,
        });

        if (!res.success) {
          setError(res.error || "Failed to load deals");
        } else if (res.data) {
          setDeals(res.data.deals as FormattedDeal[]);
          if (res.data.summary) {
            setSummary(res.data.summary);
          }
          if (res.data.pagination) {
            setPagination(res.data.pagination);
          }
        }
      } catch {
        setError("Unable to connect to PostgreSQL database.");
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, statusFilter, priorityFilter, pipelineFilter, sortBy, sortOrder]
  );

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
    const timer = setTimeout(() => {
      fetchDeals(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchDeals]);

  const handleSelectAll = () => {
    if (selectedDealIds.length === deals.length) {
      setSelectedDealIds([]);
    } else {
      setSelectedDealIds(deals.map((d) => d.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedDealIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkMoveStage = async (stageId: string) => {
    if (selectedDealIds.length === 0 || !stageId) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateDealsAction({
        dealIds: selectedDealIds,
        action: "MOVE_STAGE",
        stageId,
      });
      if (res.success) {
        setSelectedDealIds([]);
        fetchDeals(pagination.page);
      } else {
        alert(res.error || "Bulk stage update failed.");
      }
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkAssignOwner = async (ownerId: string) => {
    if (selectedDealIds.length === 0 || !ownerId) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateDealsAction({
        dealIds: selectedDealIds,
        action: "ASSIGN_OWNER",
        ownerId,
      });
      if (res.success) {
        setSelectedDealIds([]);
        fetchDeals(pagination.page);
      } else {
        alert(res.error || "Bulk assignment failed.");
      }
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleBulkUpdatePriority = async (priority: TaskPriority) => {
    if (selectedDealIds.length === 0) return;
    setIsBulkOperating(true);
    try {
      const res = await bulkUpdateDealsAction({
        dealIds: selectedDealIds,
        action: "UPDATE_PRIORITY",
        priority,
      });
      if (res.success) {
        setSelectedDealIds([]);
        fetchDeals(pagination.page);
      } else {
        alert(res.error || "Bulk priority update failed.");
      }
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleMarkWon = async () => {
    if (!wonModalDeal) return;
    setIsWonSubmitting(true);
    try {
      const res = await markDealWonAction({ dealId: wonModalDeal.id });
      if (res.success) {
        setWonModalDeal(null);
        fetchDeals(pagination.page);
      } else {
        setError(res.error || "Failed to mark deal as won");
      }
    } finally {
      setIsWonSubmitting(false);
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalDeal) return;
    setIsLostSubmitting(true);
    try {
      const res = await markDealLostAction({
        dealId: lostModalDeal.id,
        lostReason,
        notes: lostNotes || undefined,
      });
      if (res.success) {
        setLostModalDeal(null);
        setLostNotes("");
        fetchDeals(pagination.page);
      } else {
        setError(res.error || "Failed to mark deal as lost");
      }
    } finally {
      setIsLostSubmitting(false);
    }
  };

  const handleReopen = async (dealId: string) => {
    try {
      const res = await reopenDealAction({ dealId });
      if (res.success) {
        fetchDeals(pagination.page);
      } else {
        setError(res.error || "Failed to reopen deal");
      }
    } catch {
      setError("Failed to reopen deal");
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "HIGH":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "LOW":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  const currentPipelineStages =
    pipelines.find((p) => p.id === (pipelineFilter === "ALL" ? pipelines[0]?.id : pipelineFilter))
      ?.stages || [];

  return (
    <div className="space-y-6">
      {/* Top Revenue Summary Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Open Deals
          </p>
          <p className="text-xl font-bold text-foreground font-mono mt-1">
            {summary.openDealsCount}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Active opportunities</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Pipeline Value
          </p>
          <p className="text-xl font-bold text-foreground font-mono mt-1">
            {summary.pipelineValueFormatted}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Unweighted total</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">
            Weighted Pipeline
          </p>
          <p className="text-xl font-bold text-indigo-400 font-mono mt-1">
            {summary.weightedPipelineFormatted}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Probability adjusted</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
            Won Revenue
          </p>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {summary.wonRevenueFormatted}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Closed deals</p>
        </div>

        <div className="col-span-2 md:col-span-1 bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
            Lost Value
          </p>
          <p className="text-xl font-bold text-rose-400 font-mono mt-1">
            {summary.lostValueFormatted}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Closed lost</p>
        </div>
      </div>

      {/* Main Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Sales Pipeline & Deals</h1>
          <p className="text-xs text-muted-foreground">
            Manage deals across stages, track probability, and forecast revenue.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-surface border border-border">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <Link
            href="/app/reports/sales"
            className="flex items-center gap-1.5 h-9 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Forecasting</span>
          </Link>

          <Link
            href="/app/deals/new"
            className="flex items-center gap-1.5 h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Deal</span>
          </Link>
        </div>
      </div>

      {/* Render Active View */}
      {viewMode === "kanban" ? (
        <PipelineClient />
      ) : (
        <div className="space-y-4">
          {/* Table Filters Bar */}
          <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search deals, company, contact, owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface-elevated text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Filter Selects */}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as DealStatus | "ALL")}
                  className="h-8 rounded-xl border border-border bg-surface-elevated px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="OPEN">Open Deals</option>
                  <option value="WON">Won Deals</option>
                  <option value="LOST">Lost Deals</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as TaskPriority | "ALL")}
                  className="h-8 rounded-xl border border-border bg-surface-elevated px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>

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
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-8 rounded-xl border border-border bg-surface-elevated px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="expectedCloseDate">Close Date</option>
                  <option value="value">Deal Value</option>
                  <option value="probability">Probability</option>
                  <option value="createdAt">Created Date</option>
                </select>

                <button
                  type="button"
                  onClick={() => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))}
                  className="h-8 px-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-muted-foreground hover:text-foreground"
                  title="Toggle sort direction"
                >
                  {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
                </button>
              </div>
            </div>

            {/* Bulk Action Toolbar if rows selected */}
            {selectedDealIds.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-primary/5 border border-primary/20 rounded-xl animate-in fade-in-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className="h-5 px-2 rounded bg-primary text-primary-foreground text-[11px] font-bold flex items-center justify-center">
                    {selectedDealIds.length}
                  </span>
                  <span>deal(s) selected</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Bulk Move Stage */}
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleBulkMoveStage(e.target.value);
                    }}
                    disabled={isBulkOperating}
                    className="h-7 rounded-lg border border-border bg-surface px-2 text-[11px] text-foreground focus:outline-none"
                  >
                    <option value="" disabled>
                      Move to Stage...
                    </option>
                    {currentPipelineStages.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  {/* Bulk Assign Owner */}
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleBulkAssignOwner(e.target.value);
                    }}
                    disabled={isBulkOperating}
                    className="h-7 rounded-lg border border-border bg-surface px-2 text-[11px] text-foreground focus:outline-none"
                  >
                    <option value="" disabled>
                      Assign to...
                    </option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  {/* Bulk Set Priority */}
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) handleBulkUpdatePriority(e.target.value as TaskPriority);
                    }}
                    disabled={isBulkOperating}
                    className="h-7 rounded-lg border border-border bg-surface px-2 text-[11px] text-foreground focus:outline-none"
                  >
                    <option value="" disabled>
                      Set Priority...
                    </option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setSelectedDealIds([])}
                    className="h-7 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Deals Table */}
          <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-surface-elevated/50 text-muted-foreground font-semibold">
                    <th className="p-3.5 w-10 text-center">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {deals.length > 0 && selectedDealIds.length === deals.length ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-3.5">Deal Name</th>
                    <th className="p-3.5">Company / Contact</th>
                    <th className="p-3.5">Stage</th>
                    <th className="p-3.5">Value</th>
                    <th className="p-3.5">Probability</th>
                    <th className="p-3.5">Expected Close</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Owner</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center">
                        <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
                        <p className="text-xs text-muted-foreground font-mono mt-2">
                          Loading opportunities...
                        </p>
                      </td>
                    </tr>
                  ) : deals.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-16 text-center text-muted-foreground">
                        <Briefcase className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                        <p className="font-semibold text-foreground">No deals found</p>
                        <p className="text-xs mt-1">Try changing filters or create a new deal.</p>
                      </td>
                    </tr>
                  ) : (
                    deals.map((deal) => {
                      const isSelected = selectedDealIds.includes(deal.id);
                      return (
                        <tr
                          key={deal.id}
                          className={`hover:bg-surface-elevated/40 transition-colors ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelect(deal.id)}
                              className="text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-primary" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Deal Name & Stale Alert */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Link
                                  href={`/app/deals/${deal.id}`}
                                  className="font-bold text-foreground hover:text-primary transition-colors line-clamp-1"
                                >
                                  {deal.name}
                                </Link>
                                {deal.isStale && (
                                  <span
                                    className="flex items-center text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded"
                                    title="No activity for >14 days"
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                                    Stale
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-muted-foreground">{deal.pipelineName}</p>
                            </div>
                          </td>

                          {/* Company / Contact */}
                          <td className="p-3.5 text-muted-foreground">
                            {deal.companyName && (
                              <p className="font-medium text-foreground truncate max-w-[140px]">
                                {deal.companyName}
                              </p>
                            )}
                            {deal.contactName && (
                              <p className="text-[11px] truncate max-w-[140px]">{deal.contactName}</p>
                            )}
                            {!deal.companyName && !deal.contactName && <span>—</span>}
                          </td>

                          {/* Stage */}
                          <td className="p-3.5">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                              style={{
                                borderColor: `${deal.stageColor || "#3B82F6"}40`,
                                backgroundColor: `${deal.stageColor || "#3B82F6"}15`,
                                color: deal.stageColor || "#3B82F6",
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: deal.stageColor || "#3B82F6" }}
                              />
                              <span>{deal.stageName}</span>
                            </span>
                          </td>

                          {/* Value */}
                          <td className="p-3.5 font-bold text-foreground font-mono">
                            {deal.valueFormatted}
                          </td>

                          {/* Probability & Weighted */}
                          <td className="p-3.5">
                            <div>
                              <span className="font-semibold text-primary">{deal.probability}%</span>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                Exp: {deal.weightedValueFormatted}
                              </p>
                            </div>
                          </td>

                          {/* Expected Close */}
                          <td className="p-3.5 text-muted-foreground font-mono text-[11px]">
                            {deal.expectedCloseDate
                              ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </td>

                          {/* Priority */}
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(
                                deal.priority
                              )}`}
                            >
                              {deal.priority}
                            </span>
                          </td>

                          {/* Owner */}
                          <td className="p-3.5 text-muted-foreground text-[11px]">{deal.ownerName}</td>

                          {/* Row Actions */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {deal.status === "OPEN" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => setWonModalDeal(deal)}
                                    className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                    title="Mark Won"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setLostModalDeal(deal)}
                                    className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                                    title="Mark Lost"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {deal.status !== "OPEN" && (
                                <button
                                  type="button"
                                  onClick={() => handleReopen(deal.id)}
                                  className="p-1 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors"
                                  title="Reopen Deal"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              )}

                              <Link
                                href={`/app/deals/${deal.id}`}
                                className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
                              >
                                View
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-elevated/30 text-xs text-muted-foreground">
              <span>
                Showing <strong>{deals.length}</strong> of <strong>{pagination.totalCount}</strong>{" "}
                deals
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1 || isLoading}
                  onClick={() => fetchDeals(pagination.page - 1)}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-foreground font-semibold">
                  Page {pagination.page} of {pagination.totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages || isLoading}
                  onClick={() => fetchDeals(pagination.page + 1)}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface disabled:opacity-40 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Won Confirmation Modal */}
      {wonModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Mark Deal as Won 🎉</h3>
                <p className="text-xs text-muted-foreground">Confirm revenue and close opportunity</p>
              </div>
            </div>

            <div className="space-y-2 p-4 rounded-xl bg-surface-elevated border border-border text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deal Name:</span>
                <span className="font-bold text-foreground">{wonModalDeal.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Won Value:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {wonModalDeal.valueFormatted}
                </span>
              </div>
              {wonModalDeal.companyName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="text-foreground">{wonModalDeal.companyName}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              This will set win probability to 100%, record the win date, update sales analytics, and
              trigger any configured automations.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setWonModalDeal(null)}
                disabled={isWonSubmitting}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkWon}
                disabled={isWonSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                {isWonSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Closing Deal...</span>
                  </>
                ) : (
                  <span>Confirm Won</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lost Reason Modal */}
      {lostModalDeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Mark Deal as Lost</h3>
                <p className="text-xs text-muted-foreground">
                  Record structured reason for loss analysis
                </p>
              </div>
            </div>

            <form onSubmit={handleMarkLost} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Loss Reason *
                </label>
                <select
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-none"
                >
                  {LOST_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {LOST_REASON_LABELS[reason] || reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">
                  Loss Notes & Feedback (Optional)
                </label>
                <textarea
                  rows={3}
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="e.g. Budget slashed for Q3, competitor offered 40% discount..."
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLostModalDeal(null)}
                  disabled={isLostSubmitting}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLostSubmitting}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors cursor-pointer"
                >
                  {isLostSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Confirm Lost</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Deal Modal */}
      <CreateDealModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchDeals(pagination.page)}
      />
    </div>
  );
}
