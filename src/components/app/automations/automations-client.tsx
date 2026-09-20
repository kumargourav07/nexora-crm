"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit3,
  ListOrdered,
  Layers,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  ChevronRight,
  RotateCcw,
  SlidersHorizontal,
  Bot,
  Activity,
  AlertCircle,
  FileCode,
} from "lucide-react";
import {
  WorkflowStatus,
  WorkflowTriggerType,
  WORKFLOW_TEMPLATES,
  WorkflowTemplate,
} from "@/lib/validations/automations";
import {
  activateWorkflowAction,
  pauseWorkflowAction,
  duplicateWorkflowAction,
  archiveWorkflowAction,
  createWorkflowAction,
} from "@/lib/actions/automations-actions";
import { Role } from "@prisma/client";

interface WorkflowItem {
  id: string;
  name: string;
  description?: string | null;
  status: WorkflowStatus;
  triggerType: WorkflowTriggerType;
  conditionMatch: string;
  conditions: any[];
  actions: any[];
  createdBy?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRun?: string | null;
  successRate: number;
}

interface AutomationsClientProps {
  initialWorkflows: WorkflowItem[];
  initialMetrics: {
    activeWorkflows: number;
    totalWorkflows: number;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    skippedRuns: number;
    successRate: number;
  };
  currentUserRole: Role;
}

export function AutomationsClient({
  initialWorkflows,
  initialMetrics,
  currentUserRole,
}: AutomationsClientProps) {
  const router = useRouter();
  const [workflows, setWorkflows] = React.useState<WorkflowItem[]>(initialWorkflows);
  const [metrics, setMetrics] = React.useState(initialMetrics);
  const [activeTab, setActiveTab] = React.useState<WorkflowStatus | "ALL">("ALL");
  const [selectedTrigger, setSelectedTrigger] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = React.useState(false);
  const [isProcessingId, setIsProcessingId] = React.useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canCreate = currentUserRole !== "MEMBER";
  const canDelete = currentUserRole === "OWNER" || currentUserRole === "ADMIN";

  const showFeedback = (type: "success" | "error", message: string) => {
    setActionFeedback({ type, message });
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const filteredWorkflows = React.useMemo(() => {
    return workflows.filter((wf) => {
      if (activeTab !== "ALL" && wf.status !== activeTab) return false;
      if (selectedTrigger !== "ALL" && wf.triggerType !== selectedTrigger) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = wf.name.toLowerCase().includes(query);
        const matchesDesc = (wf.description || "").toLowerCase().includes(query);
        const matchesTrigger = wf.triggerType.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesTrigger) return false;
      }
      return true;
    });
  }, [workflows, activeTab, selectedTrigger, searchQuery]);

  // Toggle active/paused status
  const handleToggleStatus = async (wf: WorkflowItem) => {
    setIsProcessingId(wf.id);
    try {
      if (wf.status === WorkflowStatus.ACTIVE) {
        const res = await pauseWorkflowAction(wf.id);
        if (res.success) {
          setWorkflows((prev) =>
            prev.map((w) => (w.id === wf.id ? { ...w, status: WorkflowStatus.PAUSED } : w))
          );
          setMetrics((prev) => ({
            ...prev,
            activeWorkflows: Math.max(0, prev.activeWorkflows - 1),
          }));
          showFeedback("success", `Workflow "${wf.name}" paused`);
        } else {
          showFeedback("error", res.error || "Failed to pause workflow");
        }
      } else {
        const res = await activateWorkflowAction(wf.id);
        if (res.success) {
          setWorkflows((prev) =>
            prev.map((w) => (w.id === wf.id ? { ...w, status: WorkflowStatus.ACTIVE } : w))
          );
          setMetrics((prev) => ({
            ...prev,
            activeWorkflows: prev.activeWorkflows + 1,
          }));
          showFeedback("success", `Workflow "${wf.name}" activated`);
        } else {
          showFeedback("error", res.error || "Failed to activate workflow");
        }
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Operation failed");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Duplicate workflow
  const handleDuplicate = async (wf: WorkflowItem) => {
    setIsProcessingId(wf.id);
    try {
      const res = await duplicateWorkflowAction(wf.id);
      if (res.success && res.data) {
        showFeedback("success", `Created draft copy: ${res.data.name}`);
        router.push(`/app/automations/${res.data.id}`);
      } else {
        showFeedback("error", res.error || "Failed to duplicate workflow");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to duplicate");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Archive workflow
  const handleArchive = async (wf: WorkflowItem) => {
    if (!confirm(`Are you sure you want to archive workflow "${wf.name}"?`)) return;
    setIsProcessingId(wf.id);
    try {
      const res = await archiveWorkflowAction(wf.id);
      if (res.success) {
        setWorkflows((prev) => prev.filter((w) => w.id !== wf.id));
        if (wf.status === WorkflowStatus.ACTIVE) {
          setMetrics((prev) => ({
            ...prev,
            activeWorkflows: Math.max(0, prev.activeWorkflows - 1),
            totalWorkflows: Math.max(0, prev.totalWorkflows - 1),
          }));
        }
        showFeedback("success", `Workflow "${wf.name}" archived`);
      } else {
        showFeedback("error", res.error || "Failed to archive workflow");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Archive failed");
    } finally {
      setIsProcessingId(null);
    }
  };

  // Instantiate Starter Template
  const handleUseTemplate = async (tpl: WorkflowTemplate) => {
    setIsProcessingId(tpl.id);
    try {
      const res = await createWorkflowAction({
        name: tpl.name,
        description: tpl.description,
        triggerType: tpl.triggerType,
        triggerConfig: {},
        conditionMatch: tpl.conditionMatch,
        conditions: tpl.conditions as any,
        actions: tpl.actions as any,
        status: WorkflowStatus.DRAFT,
      });

      if (res.success && res.data) {
        setIsTemplateModalOpen(false);
        showFeedback("success", `Template "${tpl.name}" created as DRAFT`);
        router.push(`/app/automations/${res.data.id}`);
      } else {
        showFeedback("error", res.error || "Failed to create from template");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to use template");
    } finally {
      setIsProcessingId(null);
    }
  };

  const getTriggerBadgeStyle = (trigger: WorkflowTriggerType) => {
    if (trigger.startsWith("LEAD_")) {
      return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
    if (trigger.startsWith("DEAL_")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (trigger.startsWith("INVOICE_") || trigger.startsWith("PAYMENT_")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback Notification */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-md ${
              actionFeedback.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
                : "bg-red-950/90 text-red-200 border-red-500/30"
            }`}
          >
            {actionFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{actionFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
                Automations & Workflows
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  Engine v1.0
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Build intelligent event-driven workflows to automate sales routing, follow-ups, and operations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Link
            href="/app/automations/runs"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border/80 hover:bg-surface text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Runs Ledger</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border/80 hover:bg-surface text-foreground text-xs font-semibold transition-all shadow-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Templates</span>
          </button>

          {canCreate && (
            <Link
              href="/app/automations/new"
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:bg-primary/95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workflow</span>
            </Link>
          )}
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Active Workflows</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Play className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">
            {metrics.activeWorkflows}
            <span className="text-xs font-normal text-muted-foreground ml-1.5">
              / {metrics.totalWorkflows} total
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Total Runs</span>
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Activity className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-foreground">
            {metrics.totalRuns.toLocaleString()}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Successful Runs</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">
            {metrics.successfulRuns.toLocaleString()}
            <span className="text-xs font-semibold text-emerald-500/80 ml-2">
              ({metrics.successRate}%)
            </span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated border border-border/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground text-xs font-medium">
            <span>Failed Runs</span>
            <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-red-400">
            {metrics.failedRuns.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-elevated/40 border border-border/60 p-2.5 rounded-2xl">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(["ALL", "ACTIVE", "PAUSED", "DRAFT"] as const).map((tab) => {
            const count =
              tab === "ALL"
                ? workflows.length
                : workflows.filter((w) => w.status === tab).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === tab
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-surface-elevated text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Trigger Select */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {/* Workflows List / Cards */}
      {filteredWorkflows.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-3xl bg-surface-elevated/30">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 border border-primary/20 shadow-inner">
            <Bot className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {searchQuery || activeTab !== "ALL"
              ? "No matching workflows found"
              : "Automate your CRM"}
          </h2>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1.5">
            {searchQuery || activeTab !== "ALL"
              ? "Try adjusting your search criteria or status filter to see other workflows."
              : "Create workflows that handle repetitive sales and operations tasks automatically."}
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-elevated border border-border text-foreground text-xs font-semibold hover:bg-surface transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Browse Templates</span>
            </button>
            {canCreate && (
              <Link
                href="/app/automations/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-md shadow-primary/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Workflow</span>
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredWorkflows.map((wf) => {
            const isActive = wf.status === WorkflowStatus.ACTIVE;
            const isPaused = wf.status === WorkflowStatus.PAUSED;
            const isDraft = wf.status === WorkflowStatus.DRAFT;

            return (
              <motion.div
                key={wf.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl bg-surface-elevated border border-border/80 shadow-sm hover:border-primary/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 group"
              >
                {/* Left Workflow Info */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => handleToggleStatus(wf)}
                    disabled={isDraft || isProcessingId === wf.id}
                    title={
                      isDraft
                        ? "Draft workflows must be activated via builder"
                        : isActive
                        ? "Click to Pause"
                        : "Click to Activate"
                    }
                    className={`mt-0.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                        : isPaused
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                        : "bg-surface text-muted-foreground border-border cursor-not-allowed opacity-60"
                    }`}
                  >
                    {isActive ? (
                      <Play className="w-4 h-4 fill-emerald-400" />
                    ) : isPaused ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <FileCode className="w-4 h-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/app/automations/${wf.id}`}
                        className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate cursor-pointer"
                      >
                        {wf.name}
                      </Link>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : isPaused
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            : "bg-surface text-muted-foreground border-border"
                        }`}
                      >
                        {wf.status}
                      </span>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${getTriggerBadgeStyle(
                          wf.triggerType
                        )}`}
                      >
                        WHEN {wf.triggerType}
                      </span>
                    </div>

                    {wf.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                        {wf.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground mt-2 flex-wrap">
                      <span>
                        <strong className="text-foreground">{wf.conditions.length}</strong>{" "}
                        {wf.conditions.length === 1 ? "condition" : "conditions"}
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-foreground">{wf.actions.length}</strong>{" "}
                        {wf.actions.length === 1 ? "action" : "actions"}
                      </span>
                      {wf.createdBy && (
                        <>
                          <span>•</span>
                          <span>Created by {wf.createdBy.name}</span>
                        </>
                      )}
                      {wf.lastRun && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            Last run: {new Date(wf.lastRun).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Performance Stats & Quick Actions */}
                <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-border/50">
                  {/* Runs & Success Rate */}
                  <div className="text-right">
                    <div className="text-xs font-bold text-foreground">
                      {wf.totalRuns.toLocaleString()}{" "}
                      <span className="text-muted-foreground font-normal">runs</span>
                    </div>
                    {wf.totalRuns > 0 && (
                      <div className="text-[10px] text-emerald-400 font-medium">
                        {wf.successRate}% success rate
                      </div>
                    )}
                  </div>

                  {/* Actions Menu */}
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/app/automations/runs?workflowId=${wf.id}`}
                      title="View execution logs"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                    >
                      <Activity className="w-4 h-4" />
                    </Link>

                    <Link
                      href={`/app/automations/${wf.id}`}
                      title="Edit workflow"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Link>

                    {canCreate && (
                      <button
                        type="button"
                        onClick={() => handleDuplicate(wf)}
                        disabled={isProcessingId === wf.id}
                        title="Duplicate workflow"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => handleArchive(wf)}
                        disabled={isProcessingId === wf.id}
                        title="Archive workflow"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Starter Templates Modal / Drawer */}
      <AnimatePresence>
        {isTemplateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-surface-elevated border border-border rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Workflow Starter Templates
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Pick a proven blueprint to automate lead routing, won celebrations, and follow-ups.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {WORKFLOW_TEMPLATES.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-2xl bg-surface border border-border/80 hover:border-primary/50 transition-all flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-[9px] font-mono px-2 py-0.5 rounded-md border ${getTriggerBadgeStyle(
                            tpl.triggerType
                          )}`}
                        >
                          WHEN {tpl.triggerType}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {tpl.actions.length} Actions
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-foreground mt-2 group-hover:text-primary transition-colors">
                        {tpl.name}
                      </h3>
                      <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {tpl.conditions.length === 0
                          ? "Always fires"
                          : `${tpl.conditions.length} Condition`}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleUseTemplate(tpl)}
                        disabled={isProcessingId === tpl.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/95 transition-all shadow-sm cursor-pointer"
                      >
                        <span>Use Template</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
