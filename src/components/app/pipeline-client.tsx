"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Kanban,
  Plus,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Briefcase,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Settings,
  MoreVertical,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import {
  getDealsForPipelineBoardAction,
  updateDealStageAction,
  markDealWonAction,
  markDealLostAction,
} from "@/lib/actions/deals-actions";
import { getPipelinesAction } from "@/lib/actions/pipelines-actions";
import { CreateDealModal } from "./create-deal-modal";
import { LOST_REASONS, LOST_REASON_LABELS } from "@/lib/validations/sales";
import { TaskPriority } from "@prisma/client";

interface BoardDeal {
  id: string;
  name: string;
  valueNumeric: number;
  valueFormatted: string;
  probability: number;
  priority: TaskPriority;
  status: "OPEN" | "WON" | "LOST";
  isStale: boolean;
  expectedCloseDate: string | null;
  contactName: string | null;
  companyName: string | null;
  ownerName: string;
  createdAt: string;
}

interface BoardColumn {
  stageId: string;
  stageName: string;
  order: number;
  probability: number;
  color: string;
  isWon: boolean;
  isLost: boolean;
  totalValue: number;
  totalValueFormatted: string;
  weightedValue: number;
  weightedValueFormatted: string;
  dealsCount: number;
  deals: BoardDeal[];
}

export function PipelineClient() {
  const [pipelines, setPipelines] = useState<{ id: string; name: string }[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [pipelineInfo, setPipelineInfo] = useState<{ id: string; name: string } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeStageForCreate, setActiveStageForCreate] = useState<string | undefined>(undefined);

  // Drag-and-drop state
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Mark Won modal state
  const [wonModalDeal, setWonModalDeal] = useState<BoardDeal | null>(null);
  const [isWonSubmitting, setIsWonSubmitting] = useState(false);

  // Mark Lost modal state
  const [lostModalDeal, setLostModalDeal] = useState<BoardDeal | null>(null);
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState("");
  const [isLostSubmitting, setIsLostSubmitting] = useState(false);

  const loadBoard = useCallback(async (pipeId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getDealsForPipelineBoardAction(pipeId);
      if (!res.success) {
        setError(res.error || "Failed to load pipeline board");
      } else if (res.data) {
        setColumns(res.data.columns);
        setPipelineInfo(res.data.pipeline);
        if (res.data.pipeline.id) {
          setSelectedPipelineId(res.data.pipeline.id);
        }
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    getPipelinesAction().then((res) => {
      if (res.success && res.data?.pipelines) {
        setPipelines(res.data.pipelines);
        const def = res.data.pipelines.find((p) => p.isDefault) || res.data.pipelines[0];
        if (def) {
          setSelectedPipelineId(def.id);
          loadBoard(def.id);
        }
      }
    });
  }, [loadBoard]);

  const handlePipelineChange = (newPipId: string) => {
    setSelectedPipelineId(newPipId);
    loadBoard(newPipId);
  };

  const moveDeal = async (dealId: string, targetStageId: string) => {
    const targetStage = columns.find((c) => c.stageId === targetStageId);
    const deal = columns.flatMap((c) => c.deals).find((d) => d.id === dealId);

    if (targetStage?.isLost || targetStage?.stageName.toLowerCase() === "lost") {
      if (deal) setLostModalDeal(deal);
      return;
    }

    if (targetStage?.isWon || targetStage?.stageName.toLowerCase() === "won") {
      if (deal) setWonModalDeal(deal);
      return;
    }

    // Optimistic UI state update
    const previousColumns = [...columns];
    setColumns((prev) => {
      let movedDeal: BoardDeal | null = null;
      const nextCols = prev.map((col) => {
        const remaining = col.deals.filter((d) => {
          if (d.id === dealId) {
            movedDeal = d;
            return false;
          }
          return true;
        });
        return {
          ...col,
          deals: remaining,
          dealsCount: remaining.length,
          totalValue: remaining.reduce((s, d) => s + d.valueNumeric, 0),
          weightedValue: remaining.reduce(
            (s, d) => s + Math.round((d.valueNumeric * d.probability) / 100),
            0
          ),
        };
      });

      if (movedDeal) {
        const destCol = nextCols.find((c) => c.stageId === targetStageId);
        if (destCol) {
          destCol.deals.push(movedDeal);
          destCol.dealsCount = destCol.deals.length;
          destCol.totalValue += (movedDeal as BoardDeal).valueNumeric;
          destCol.weightedValue += Math.round(
            ((movedDeal as BoardDeal).valueNumeric * destCol.probability) / 100
          );
        }
      }
      return nextCols;
    });

    try {
      const res = await updateDealStageAction({ dealId, stageId: targetStageId });
      if (!res.success) {
        // Rollback on error
        setColumns(previousColumns);
        alert(res.error || "Could not move deal.");
      } else {
        loadBoard(selectedPipelineId);
      }
    } catch (err) {
      setColumns(previousColumns);
      console.error(err);
    }
  };

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("text/plain", dealId);
    setDraggedDealId(dealId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDragOverStageId(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);
    const dealId = e.dataTransfer.getData("text/plain") || draggedDealId;
    if (dealId) {
      moveDeal(dealId, targetStageId);
    }
    setDraggedDealId(null);
  };

  const handleMarkWonSubmit = async () => {
    if (!wonModalDeal) return;
    setIsWonSubmitting(true);
    try {
      const res = await markDealWonAction({ dealId: wonModalDeal.id });
      if (res.success) {
        setWonModalDeal(null);
        loadBoard(selectedPipelineId);
      } else {
        alert(res.error || "Failed to mark deal as won.");
      }
    } finally {
      setIsWonSubmitting(false);
    }
  };

  const handleMarkLostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lostModalDeal) return;
    setIsLostSubmitting(true);
    try {
      const res = await markDealLostAction({
        dealId: lostModalDeal.id,
        lostReason,
        notes: lostNotes.trim() || undefined,
      });
      if (res.success) {
        setLostModalDeal(null);
        setLostNotes("");
        loadBoard(selectedPipelineId);
      } else {
        alert(res.error || "Failed to mark lost.");
      }
    } finally {
      setIsLostSubmitting(false);
    }
  };

  // Pipeline Summary Calculations
  const openColumns = columns.filter(
    (c) => !c.isWon && !c.isLost && c.stageName.toLowerCase() !== "won" && c.stageName.toLowerCase() !== "lost"
  );
  const totalOpenDeals = openColumns.reduce((sum, c) => sum + c.dealsCount, 0);
  const totalOpenValue = openColumns.reduce((sum, c) => sum + c.totalValue, 0);
  const totalWeightedValue = openColumns.reduce((sum, c) => sum + c.weightedValue, 0);

  const wonColumn = columns.find((c) => c.isWon || c.stageName.toLowerCase() === "won");
  const lostColumn = columns.find((c) => c.isLost || c.stageName.toLowerCase() === "lost");

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

  return (
    <div className="space-y-6">
      {/* Board Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface border border-border rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Kanban className="w-5 h-5 text-primary" />
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pipeline:
            </span>
          </div>

          <select
            value={selectedPipelineId}
            onChange={(e) => handlePipelineChange(e.target.value)}
            className="h-9 rounded-xl border border-border bg-surface-elevated px-3 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Link
            href="/app/settings/pipelines"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
            title="Manage pipelines and stages"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <div className="hidden lg:flex items-center gap-3 text-xs text-muted-foreground pl-3 border-l border-border">
            <span>
              Active Deals: <strong className="text-foreground font-mono">{totalOpenDeals}</strong>
            </span>
            <span>
              Pipeline Value:{" "}
              <strong className="text-foreground font-mono">
                ₹{totalOpenValue.toLocaleString("en-IN")}
              </strong>
            </span>
            <span>
              Weighted:{" "}
              <strong className="text-indigo-400 font-mono">
                ₹{totalWeightedValue.toLocaleString("en-IN")}
              </strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            href="/app/deals"
            className="flex items-center gap-1.5 h-9 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-elevated transition-colors"
          >
            <span>Table View</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              setActiveStageForCreate(undefined);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Deal</span>
          </button>
        </div>
      </div>

      {/* Board Kanban Columns Area */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-mono">Loading Kanban board...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-xs text-destructive">{error}</div>
      ) : columns.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-surface border border-border rounded-2xl">
          <p className="text-sm font-semibold text-foreground">No stages configured in this pipeline.</p>
          <Link
            href="/app/settings/pipelines"
            className="inline-flex px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
          >
            Configure Stages
          </Link>
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[620px]">
          {columns.map((column, colIdx) => {
            const isDragOver = dragOverStageId === column.stageId;
            const isWonStage = column.isWon || column.stageName.toLowerCase() === "won";
            const isLostStage = column.isLost || column.stageName.toLowerCase() === "lost";

            return (
              <div
                key={column.stageId}
                onDragOver={(e) => handleDragOver(e, column.stageId)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.stageId)}
                className={`flex flex-col w-80 shrink-0 rounded-2xl border transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                    : "border-border bg-surface-elevated/30"
                }`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: column.color || "#3B82F6" }}
                      />
                      <span className="text-xs font-bold text-foreground truncate max-w-[140px]">
                        {column.stageName}
                      </span>
                      <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground border border-border">
                        {column.dealsCount}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveStageForCreate(column.stageId);
                        setIsCreateModalOpen(true);
                      }}
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                      title="Add deal to this stage"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
                    <span>Total: {column.totalValueFormatted}</span>
                    <span className="text-indigo-400 font-semibold">
                      Prob: {column.probability}%
                    </span>
                  </div>
                </div>

                {/* Column Deals List */}
                <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[calc(100vh-280px)]">
                  {column.deals.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-border/40 rounded-xl text-[11px] text-muted-foreground">
                      <span>No deals in stage</span>
                    </div>
                  ) : (
                    column.deals.map((deal) => {
                      const isTerminal = isWonStage || isLostStage;

                      return (
                        <div
                          key={deal.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, deal.id)}
                          className="group relative rounded-xl border border-border bg-surface p-3.5 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-grab active:cursor-grabbing"
                        >
                          {/* Top Tag Bar */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getPriorityBadge(
                                deal.priority
                              )}`}
                            >
                              {deal.priority}
                            </span>

                            {deal.isStale && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Needs Attention</span>
                              </span>
                            )}
                          </div>

                          {/* Deal Title */}
                          <Link
                            href={`/app/deals/${deal.id}`}
                            className="block text-xs font-bold text-foreground hover:text-primary transition-colors line-clamp-1 mb-1"
                          >
                            {deal.name}
                          </Link>

                          {/* Company / Contact */}
                          {(deal.companyName || deal.contactName) && (
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-2 truncate">
                              {deal.companyName && (
                                <span className="flex items-center gap-1 truncate">
                                  <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                                  <span className="truncate">{deal.companyName}</span>
                                </span>
                              )}
                              {deal.companyName && deal.contactName && <span>•</span>}
                              {deal.contactName && <span className="truncate">{deal.contactName}</span>}
                            </div>
                          )}

                          {/* Deal Financials & Owner */}
                          <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                            <span className="font-bold text-foreground font-mono">
                              {deal.valueFormatted}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">
                              {deal.ownerName}
                            </span>
                          </div>

                          {/* Close Date */}
                          {deal.expectedCloseDate && (
                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1.5 font-mono">
                              <Calendar className="w-3 h-3 shrink-0" />
                              <span>
                                {new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </span>
                            </div>
                          )}

                          {/* Non-Drag Accessible Stage Movement Buttons */}
                          <div className="hidden group-hover:flex items-center justify-between gap-1 pt-2 mt-2 border-t border-border/40">
                            {colIdx > 0 && (
                              <button
                                type="button"
                                onClick={() => moveDeal(deal.id, columns[colIdx - 1].stageId)}
                                className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface-elevated"
                                title={`Move to ${columns[colIdx - 1].stageName}`}
                              >
                                <ChevronLeft className="w-3 h-3" />
                                <span>Prev</span>
                              </button>
                            )}

                            <Link
                              href={`/app/deals/${deal.id}`}
                              className="text-[10px] font-semibold text-primary hover:underline px-1"
                            >
                              View
                            </Link>

                            {colIdx < columns.length - 1 && (
                              <button
                                type="button"
                                onClick={() => moveDeal(deal.id, columns[colIdx + 1].stageId)}
                                className="flex items-center gap-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground p-1 rounded hover:bg-surface-elevated ml-auto"
                                title={`Move to ${columns[colIdx + 1].stageName}`}
                              >
                                <span>Next</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
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
                onClick={handleMarkWonSubmit}
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

            <form onSubmit={handleMarkLostSubmit} className="space-y-4">
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
        onSuccess={() => loadBoard(selectedPipelineId)}
        initialPipelineId={selectedPipelineId}
        initialStageId={activeStageForCreate}
      />
    </div>
  );
}
