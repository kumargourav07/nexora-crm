"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Search,
  Filter,
  Eye,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Layers,
  Bot,
  Zap,
} from "lucide-react";
import {
  WorkflowExecutionStatus,
  WorkflowTriggerType,
} from "@/lib/validations/automations";
import {
  getWorkflowExecutionByIdAction,
  retryWorkflowExecutionAction,
} from "@/lib/actions/automations-actions";
import { Role } from "@prisma/client";

interface ExecutionItem {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerType: WorkflowTriggerType | string;
  status: WorkflowExecutionStatus;
  entityType: string;
  entityId?: string | null;
  startedAt: string;
  completedAt?: string | null;
  durationMs: number;
  errorMessage?: string | null;
  depth: number;
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface AutomationRunsClientProps {
  initialExecutions: ExecutionItem[];
  initialPagination: PaginationData;
  currentUserRole: Role;
  workflowIdFilter?: string;
}

export function AutomationRunsClient({
  initialExecutions,
  initialPagination,
  currentUserRole,
  workflowIdFilter,
}: AutomationRunsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [executions, setExecutions] = React.useState<ExecutionItem[]>(initialExecutions);
  const [activeStatus, setActiveStatus] = React.useState<string>(
    searchParams.get("status") || "ALL"
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedExecutionId, setSelectedExecutionId] = React.useState<string | null>(null);
  const [executionDetails, setExecutionDetails] = React.useState<any | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = React.useState(false);
  const [isRetryingId, setIsRetryingId] = React.useState<string | null>(null);
  const [toastFeedback, setToastFeedback] = React.useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const canRetry = currentUserRole !== "MEMBER";

  const showFeedback = (type: "success" | "error", message: string) => {
    setToastFeedback({ type, message });
    setTimeout(() => setToastFeedback(null), 4000);
  };

  const filteredExecutions = React.useMemo(() => {
    return executions.filter((e) => {
      if (activeStatus !== "ALL" && e.status !== activeStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = e.workflowName.toLowerCase().includes(q);
        const matchesId = e.id.toLowerCase().includes(q);
        const matchesEntity = e.entityType.toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesEntity) return false;
      }
      return true;
    });
  }, [executions, activeStatus, searchQuery]);

  // Load Execution Detail Diagnostic
  const handleOpenDiagnostics = async (id: string) => {
    setSelectedExecutionId(id);
    setIsLoadingDetails(true);
    try {
      const res = await getWorkflowExecutionByIdAction(id);
      if (res.success && res.data) {
        setExecutionDetails(res.data);
      } else {
        showFeedback("error", res.error || "Failed to load execution details");
        setSelectedExecutionId(null);
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Failed to fetch details");
      setSelectedExecutionId(null);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Retry execution
  const handleRetry = async (id: string) => {
    setIsRetryingId(id);
    try {
      const res = await retryWorkflowExecutionAction(id);
      if (res.success && res.data) {
        showFeedback("success", res.message || "Execution retried successfully");
        router.refresh();
      } else {
        showFeedback("error", res.error || "Retry failed");
      }
    } catch (err: any) {
      showFeedback("error", err.message || "Retry failed");
    } finally {
      setIsRetryingId(null);
    }
  };

  const getStatusBadge = (status: WorkflowExecutionStatus) => {
    switch (status) {
      case WorkflowExecutionStatus.SUCCESS:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            <span>SUCCESS</span>
          </span>
        );
      case WorkflowExecutionStatus.FAILED:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/30">
            <XCircle className="w-3 h-3" />
            <span>FAILED</span>
          </span>
        );
      case WorkflowExecutionStatus.SKIPPED:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            <span>SKIPPED</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
            <Activity className="w-3 h-3 animate-pulse" />
            <span>RUNNING</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Feedback */}
      <AnimatePresence>
        {toastFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium backdrop-blur-md ${
              toastFeedback.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
                : "bg-red-950/90 text-red-200 border-red-500/30"
            }`}
          >
            {toastFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{toastFeedback.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/app/automations"
            className="p-2 rounded-xl bg-surface-elevated border border-border/80 hover:bg-surface text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2">
              Workflow Execution History
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Audit Ledger
              </span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Step-by-step diagnostic traces, conditions evaluated, and action outcomes.
            </p>
          </div>
        </div>

        <Link
          href="/app/automations"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-surface-elevated border border-border text-foreground text-xs font-semibold hover:bg-surface transition-all cursor-pointer"
        >
          <Zap className="w-4 h-4 text-primary" />
          <span>Workflows List</span>
        </Link>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-surface-elevated/40 border border-border/60 p-2.5 rounded-2xl">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(["ALL", "SUCCESS", "FAILED", "SKIPPED"] as const).map((tab) => {
            const count =
              tab === "ALL"
                ? executions.length
                : executions.filter((e) => e.status === tab).length;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveStatus(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeStatus === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                <span>{tab}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeStatus === tab
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

        <div className="relative flex-1 sm:w-64 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search runs by ID, workflow, entity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-border/80 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Executions Table */}
      {filteredExecutions.length === 0 ? (
        <div className="text-center py-16 px-4 border border-dashed border-border/80 rounded-3xl bg-surface-elevated/30">
          <Activity className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-foreground">No execution records found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            As active workflows trigger on CRM events, execution logs will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-surface-elevated border border-border/80 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface border-b border-border/60 text-muted-foreground font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Workflow</th>
                  <th className="py-3.5 px-4">Trigger</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Execution ID</th>
                  <th className="py-3.5 px-4">Duration</th>
                  <th className="py-3.5 px-4">Started At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-foreground">
                {filteredExecutions.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-surface/50 transition-colors group cursor-pointer"
                    onClick={() => handleOpenDiagnostics(item.id)}
                  >
                    <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3 px-4 font-bold text-foreground group-hover:text-primary transition-colors">
                      {item.workflowName}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {item.triggerType}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-surface text-muted-foreground border border-border/60">
                        {item.entityType}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                      {item.id}
                    </td>
                    <td className="py-3 px-4 font-mono text-muted-foreground">
                      {item.durationMs}ms
                    </td>
                    <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                      {new Date(item.startedAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "medium",
                      })}
                    </td>
                    <td
                      className="py-3 px-4 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDiagnostics(item.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
                          title="View step trace"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {item.status === WorkflowExecutionStatus.FAILED && canRetry && (
                          <button
                            type="button"
                            onClick={() => handleRetry(item.id)}
                            disabled={isRetryingId === item.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Retry execution"
                          >
                            <RotateCcw
                              className={`w-3.5 h-3.5 ${
                                isRetryingId === item.id ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Diagnostic Drawer / Modal */}
      <AnimatePresence>
        {selectedExecutionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-surface-elevated border border-border rounded-3xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-5"
            >
              {/* Drawer Top */}
              <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">
                      Execution Diagnostic Trace
                    </h3>
                    <code className="text-xs font-mono text-muted-foreground">
                      {selectedExecutionId}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Comprehensive step evaluation, condition checks, and action output log.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedExecutionId(null);
                    setExecutionDetails(null);
                  }}
                  className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {isLoadingDetails ? (
                <div className="py-16 text-center text-xs text-muted-foreground">
                  <Activity className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                  <span>Loading step trace...</span>
                </div>
              ) : executionDetails ? (
                <div className="space-y-4">
                  {/* Top Stats Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-surface border border-border/80 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Status</span>
                      <span className="font-bold text-foreground mt-0.5 block">
                        {getStatusBadge(executionDetails.status)}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Workflow</span>
                      <span className="font-bold text-foreground truncate block mt-0.5">
                        {executionDetails.workflowName}
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Duration</span>
                      <span className="font-mono font-semibold text-foreground block mt-0.5">
                        {executionDetails.durationMs}ms
                      </span>
                    </div>

                    <div>
                      <span className="text-muted-foreground block text-[10px]">Recursion Depth</span>
                      <span className="font-mono font-semibold text-foreground block mt-0.5">
                        {executionDetails.depth} / 10
                      </span>
                    </div>
                  </div>

                  {/* Error Message Alert if Failed */}
                  {executionDetails.errorMessage && (
                    <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-400" />
                        <span>Execution Error</span>
                      </div>
                      <p className="text-[11px] text-red-300">
                        {executionDetails.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Step by Step Breakdown */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Execution Steps ({executionDetails.stepResults?.length || 0})
                    </h4>

                    {executionDetails.stepResults?.map((step: any, i: number) => {
                      const isSuccess = step.status === "SUCCESS";
                      const isFailed = step.status === "FAILED";

                      return (
                        <div
                          key={i}
                          className="p-3.5 rounded-2xl bg-surface border border-border/70 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {isSuccess ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : isFailed ? (
                                <XCircle className="w-4 h-4 text-red-400" />
                              ) : (
                                <Clock className="w-4 h-4 text-amber-400" />
                              )}
                              <span className="font-mono font-bold text-foreground">
                                {step.name}
                              </span>
                            </div>

                            <span className="font-mono text-[10px] text-muted-foreground">
                              {step.durationMs}ms
                            </span>
                          </div>

                          {step.error && (
                            <p className="text-[11px] text-red-300 font-medium pl-6">
                              Reason: {step.error}
                            </p>
                          )}

                          {step.output && (
                            <pre className="p-2 rounded-xl bg-surface-elevated/80 border border-border/40 text-[10px] font-mono text-muted-foreground overflow-x-auto">
                              {JSON.stringify(step.output, null, 2)}
                            </pre>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-border/50 flex items-center justify-between">
                    <div>
                      {executionDetails.status === WorkflowExecutionStatus.FAILED && canRetry && (
                        <button
                          type="button"
                          onClick={() => handleRetry(executionDetails.id)}
                          disabled={isRetryingId === executionDetails.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/95 transition-all shadow-sm cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Retry Workflow</span>
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedExecutionId(null);
                        setExecutionDetails(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : null}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
