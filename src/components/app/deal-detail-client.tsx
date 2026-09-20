"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Contact as ContactIcon,
  Calendar,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  User,
  Plus,
  Loader2,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Percent,
  CheckSquare,
  MessageSquare,
  History,
  Trash2,
  Edit,
  ExternalLink,
  Receipt,
  Phone,
  Mail,
  Video,
  Send,
  AlertTriangle,
  FileText,
  ChevronRight,
} from "lucide-react";
import {
  getDealByIdAction,
  updateDealStageAction,
  markDealWonAction,
  markDealLostAction,
  reopenDealAction,
  assignDealAction,
  addDealNoteAction,
  createDealTaskAction,
  deleteDealAction,
} from "@/lib/actions/deals-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";
import { CreateInvoiceModal } from "./create-invoice-modal";
import { LogCallModal } from "./communications/log-call-modal";
import { SendEmailModal } from "./communications/send-email-modal";
import { ScheduleMeetingModal } from "./communications/schedule-meeting-modal";
import { LogMessageModal } from "./communications/log-message-modal";
import { CreateFollowUpModal } from "./communications/create-followup-modal";
import { LOST_REASONS, LOST_REASON_LABELS } from "@/lib/validations/sales";
import { TaskPriority } from "@prisma/client";

export interface DealDetailClientProps {
  dealId: string;
}

export function DealDetailClient({ dealId }: DealDetailClientProps) {
  const router = useRouter();
  const [deal, setDeal] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "communications" | "followups" | "tasks" | "notes" | "invoices"
  >("overview");

  // Notes form
  const [noteContent, setNoteContent] = useState("");
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);

  // Tasks form
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [isTaskSubmitting, setIsTaskSubmitting] = useState(false);

  // Owner reassignment
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);
  const [selectedOwnerId, setSelectedOwnerId] = useState("");

  // Modals state
  const [isWonModalOpen, setIsWonModalOpen] = useState(false);
  const [isLostModalOpen, setIsLostModalOpen] = useState(false);
  const [lostReason, setLostReason] = useState<string>(LOST_REASONS[0]);
  const [lostNotes, setLostNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Integrated Communication & Invoice modals
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  const [, startTransition] = useTransition();

  const loadDeal = useCallback(async () => {
    try {
      const res = await getDealByIdAction(dealId);
      if (!res.success) {
        setError(res.error || "Failed to load deal");
      } else if (res.data) {
        setDeal(res.data);
        setSelectedOwnerId(res.data.ownerId || "");
      }
    } catch {
      setError("Unable to connect to database");
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    loadDeal();
    getWorkspaceTeamAction().then((res) => {
      if (res.success && res.data?.members) {
        setTeamMembers(res.data.members.map((m) => ({ id: m.userId, name: m.name })));
      }
    });
  }, [loadDeal]);

  // Stage progression
  const handleStageClick = async (stageId: string) => {
    if (!deal) return;
    if (stageId === deal.stageId) return;

    const targetStage = deal.pipelineStages?.find((s: any) => s.id === stageId);
    if (targetStage?.isWon || targetStage?.name.toLowerCase() === "won") {
      setIsWonModalOpen(true);
      return;
    }
    if (targetStage?.isLost || targetStage?.name.toLowerCase() === "lost") {
      setIsLostModalOpen(true);
      return;
    }

    if (deal.status !== "OPEN") {
      alert("This deal is closed. Please reopen the deal to move it across stages.");
      return;
    }

    try {
      const res = await updateDealStageAction({ dealId: deal.id, stageId });
      if (res.success) {
        loadDeal();
      } else {
        alert(res.error || "Failed to update stage");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOwnerChange = async (newOwnerId: string) => {
    setSelectedOwnerId(newOwnerId);
    if (!newOwnerId || newOwnerId === deal.ownerId) return;
    try {
      const res = await assignDealAction({ dealId: deal.id, ownerId: newOwnerId });
      if (res.success) {
        loadDeal();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    setIsNoteSubmitting(true);
    try {
      const res = await addDealNoteAction({ dealId: deal.id, content: noteContent.trim() });
      if (res.success) {
        setNoteContent("");
        loadDeal();
      }
    } finally {
      setIsNoteSubmitting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !taskDueDate) return;
    setIsTaskSubmitting(true);
    try {
      const res = await createDealTaskAction({
        dealId: deal.id,
        title: taskTitle.trim(),
        dueDate: taskDueDate,
        priority: taskPriority,
      });
      if (res.success) {
        setTaskTitle("");
        setTaskDueDate("");
        loadDeal();
      }
    } finally {
      setIsTaskSubmitting(false);
    }
  };

  const handleMarkWon = async () => {
    setIsSubmittingAction(true);
    try {
      const res = await markDealWonAction({ dealId: deal.id });
      if (res.success) {
        setIsWonModalOpen(false);
        loadDeal();
      } else {
        alert(res.error || "Failed to mark deal as won.");
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleMarkLost = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingAction(true);
    try {
      const res = await markDealLostAction({
        dealId: deal.id,
        lostReason,
        notes: lostNotes.trim() || undefined,
      });
      if (res.success) {
        setIsLostModalOpen(false);
        setLostNotes("");
        loadDeal();
      } else {
        alert(res.error || "Failed to mark deal as lost.");
      }
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleReopen = async () => {
    try {
      const res = await reopenDealAction({ dealId: deal.id });
      if (res.success) {
        loadDeal();
      }
    } catch {
      alert("Failed to reopen deal");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete deal "${deal.name}"?`)) return;
    try {
      const res = await deleteDealAction(deal.id);
      if (res.success) {
        router.push("/app/deals");
      }
    } catch (err) {
      console.error(err);
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

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading opportunity...</p>
      </div>
    );
  }

  if (error || !deal) {
    return (
      <div className="py-16 text-center space-y-3">
        <p className="text-sm text-destructive">{error || "Deal not found"}</p>
        <Link
          href="/app/deals"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Deals
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/app/deals"
            className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            title="Back to Deals"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{deal.name}</h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadge(
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
            <p className="text-xs text-muted-foreground">
              Pipeline: <strong className="text-foreground">{deal.pipeline?.name}</strong> • Stage:{" "}
              <strong className="text-primary">{deal.stage?.name}</strong>
            </p>
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {deal.status === "OPEN" ? (
            <>
              <button
                type="button"
                onClick={() => setIsWonModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-600/25 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Won</span>
              </button>
              <button
                type="button"
                onClick={() => setIsLostModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/25 transition-colors cursor-pointer"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Mark Lost</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold hover:bg-blue-500/25 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reopen Deal</span>
            </button>
          )}

          {/* Create Invoice Action */}
          <button
            type="button"
            onClick={() => setIsInvoiceModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all shadow-sm shadow-primary/25 cursor-pointer"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Create Invoice</span>
          </button>

          {/* Delete Action */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Delete Deal"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Pipeline Stage Progression Chevron Bar */}
      <div className="bg-surface border border-border rounded-2xl p-3.5">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {deal.pipelineStages?.map((stage: any, idx: number) => {
            const isCurrent = stage.id === deal.stageId;
            const isPast = deal.pipelineStages.findIndex((s: any) => s.id === deal.stageId) > idx;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleStageClick(stage.id)}
                className={`flex-1 min-w-[120px] py-2 px-3 rounded-xl text-center text-xs font-semibold transition-all border cursor-pointer ${
                  isCurrent
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : isPast
                    ? "bg-primary/10 text-foreground border-primary/30 hover:bg-primary/20"
                    : "bg-surface-elevated text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <p className="truncate">{stage.name}</p>
                <p
                  className={`text-[10px] font-mono mt-0.5 ${
                    isCurrent ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {stage.probability}%
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Deal Value</p>
          <p className="text-xl font-bold text-foreground font-mono mt-1">{deal.valueFormatted}</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-indigo-400 uppercase">Win Probability</p>
          <p className="text-xl font-bold text-indigo-400 font-mono mt-1">{deal.probability}%</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-emerald-400 uppercase">Expected Revenue</p>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {deal.weightedValueFormatted}
          </p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase">Expected Close</p>
          <p className="text-sm font-bold text-foreground font-mono mt-1.5">
            {deal.expectedCloseDate
              ? new Date(deal.expectedCloseDate).toLocaleDateString("en-IN", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "Not Specified"}
          </p>
        </div>
      </div>

      {/* Quick Communication Trigger Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-surface border border-border rounded-2xl">
        <span className="text-xs font-semibold text-muted-foreground pl-1 mr-2">Quick Log:</span>
        <button
          type="button"
          onClick={() => setIsCallModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
        >
          <Phone className="w-3.5 h-3.5 text-blue-400" />
          <span>Log Call</span>
        </button>
        <button
          type="button"
          onClick={() => setIsEmailModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
        >
          <Mail className="w-3.5 h-3.5 text-indigo-400" />
          <span>Send Email</span>
        </button>
        <button
          type="button"
          onClick={() => setIsMeetingModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
        >
          <Video className="w-3.5 h-3.5 text-purple-400" />
          <span>Schedule Meeting</span>
        </button>
        <button
          type="button"
          onClick={() => setIsWhatsAppModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
        >
          <Send className="w-3.5 h-3.5 text-emerald-400" />
          <span>WhatsApp</span>
        </button>
        <button
          type="button"
          onClick={() => setIsFollowUpModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-elevated text-xs font-semibold text-foreground hover:border-primary/50 transition-colors"
        >
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Schedule Follow-up</span>
        </button>
      </div>

      {/* Main Detail Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Association & Info Cards */}
        <div className="space-y-6">
          {/* Owner Assignment Card */}
          <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>Deal Ownership</span>
            </h3>
            <select
              value={selectedOwnerId}
              onChange={(e) => handleOwnerChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Company Card */}
          {deal.company && (
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Company</span>
                </h3>
                <Link
                  href={`/app/companies/${deal.company.id}`}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  View Profile
                </Link>
              </div>
              <p className="text-sm font-bold text-foreground">{deal.company.name}</p>
              {deal.company.industry && (
                <p className="text-xs text-muted-foreground">Industry: {deal.company.industry}</p>
              )}
            </div>
          )}

          {/* Contact Card */}
          {deal.contact && (
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <ContactIcon className="w-4 h-4 text-primary" />
                  <span>Key Contact</span>
                </h3>
                <Link
                  href={`/app/contacts/${deal.contact.id}`}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  View Profile
                </Link>
              </div>
              <p className="text-sm font-bold text-foreground">{deal.contact.fullName}</p>
              {deal.contact.email && (
                <p className="text-xs text-muted-foreground truncate">{deal.contact.email}</p>
              )}
              {deal.contact.phone && (
                <p className="text-xs text-muted-foreground">{deal.contact.phone}</p>
              )}
            </div>
          )}

          {/* Won / Lost Resolution Info */}
          {deal.status === "WON" && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-1 text-xs">
              <p className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Deal Won
              </p>
              <p className="text-muted-foreground">
                Won on: {deal.wonAt ? new Date(deal.wonAt).toLocaleDateString("en-IN") : "—"}
              </p>
            </div>
          )}

          {deal.status === "LOST" && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 space-y-1 text-xs">
              <p className="font-bold text-destructive flex items-center gap-1.5">
                <XCircle className="w-4 h-4" /> Deal Lost: {deal.lostReason}
              </p>
              {deal.lossNotes && <p className="text-muted-foreground">Notes: {deal.lossNotes}</p>}
            </div>
          )}

          {/* Description */}
          {deal.description && (
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Scope & Requirements
              </h3>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {deal.description}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Tabs Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Tabs Navigation */}
          <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-1">
            {[
              { id: "overview", label: "Overview", icon: Briefcase },
              { id: "timeline", label: "Timeline", icon: History },
              { id: "communications", label: `Communications (${deal.communications?.length || 0})`, icon: MessageSquare },
              { id: "followups", label: `Follow-ups (${deal.followUps?.length || 0})`, icon: Calendar },
              { id: "tasks", label: `Tasks (${deal.tasks?.length || 0})`, icon: CheckSquare },
              { id: "notes", label: `Notes (${deal.notes?.length || 0})`, icon: FileText },
              { id: "invoices", label: `Invoices (${deal.invoices?.length || 0})`, icon: Receipt },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer border-b-2 ${
                    activeTab === tab.id
                      ? "border-primary text-primary bg-surface"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-foreground mb-3">Opportunity Overview</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-muted-foreground">Deal Value:</span>
                    <p className="font-bold text-foreground font-mono mt-0.5">{deal.valueFormatted}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stage:</span>
                    <p className="font-bold text-primary mt-0.5">{deal.stage?.name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Win Probability:</span>
                    <p className="font-bold text-foreground font-mono mt-0.5">{deal.probability}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expected Revenue:</span>
                    <p className="font-bold text-emerald-400 font-mono mt-0.5">
                      {deal.weightedValueFormatted}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Priority:</span>
                    <p className="font-bold text-foreground mt-0.5">{deal.priority}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lead Source:</span>
                    <p className="font-bold text-foreground mt-0.5">{deal.source}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <p className="text-foreground mt-0.5">
                      {new Date(deal.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Modified:</span>
                    <p className="text-foreground mt-0.5">
                      {new Date(deal.updatedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Timeline / Activities */}
          {activeTab === "timeline" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Activity Timeline</h3>
              {deal.activities?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No recorded activity yet.</p>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-border/70 pl-2">
                  {deal.activities.map((act: any) => (
                    <div key={act.id} className="relative flex items-start gap-3 pl-6">
                      <span className="absolute left-2 top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-surface" />
                      <div className="flex-1 p-3 rounded-xl bg-surface-elevated border border-border text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground">{act.title}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(act.createdAt).toLocaleString("en-IN", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1">{act.description}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
                          By: {act.author}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Communications */}
          {activeTab === "communications" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Communications Log</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCallModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-surface-elevated"
                  >
                    <Phone className="w-3 h-3 text-blue-400" />
                    <span>Call</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEmailModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-surface-elevated"
                  >
                    <Mail className="w-3 h-3 text-indigo-400" />
                    <span>Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMeetingModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-surface-elevated"
                  >
                    <Video className="w-3 h-3 text-purple-400" />
                    <span>Meeting</span>
                  </button>
                </div>
              </div>

              {deal.communications?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No communications logged for this deal yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {deal.communications.map((comm: any) => (
                    <div
                      key={comm.id}
                      className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                            {comm.type}
                          </span>
                          <span className="font-bold text-foreground">
                            {comm.subject || `${comm.type} Communication`}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(comm.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{comm.content}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/50 font-mono">
                        <span>Owner: {comm.ownerName}</span>
                        {comm.durationSeconds && (
                          <span>Duration: {Math.round(comm.durationSeconds / 60)} mins</span>
                        )}
                        {comm.callOutcome && <span>Outcome: {comm.callOutcome}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Follow-ups */}
          {activeTab === "followups" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Scheduled Follow-ups</h3>
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Follow-up</span>
                </button>
              </div>

              {deal.followUps?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No upcoming follow-ups scheduled.
                </p>
              ) : (
                <div className="space-y-3">
                  {deal.followUps.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-surface-elevated border border-border text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold">
                            {f.type}
                          </span>
                          <span className="font-bold text-foreground">{f.title}</span>
                        </div>
                        {f.notes && <p className="text-muted-foreground">{f.notes}</p>}
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Due: {new Date(f.dueAt).toLocaleString("en-IN")} • Assigned: {f.ownerName}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                          f.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Tasks */}
          {activeTab === "tasks" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Action Tasks</h3>

              {/* Add Task Form */}
              <form onSubmit={handleCreateTask} className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-3">
                <input
                  type="text"
                  required
                  placeholder="Task title (e.g., Send revised quotation)..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      required
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none"
                    />
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                      className="rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none"
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent Priority</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={isTaskSubmitting}
                    className="flex items-center gap-1 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Task</span>
                  </button>
                </div>
              </form>

              {deal.tasks?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No tasks linked to deal.</p>
              ) : (
                <div className="space-y-2">
                  {deal.tasks.map((t: any) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-surface-elevated border border-border text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                        <div>
                          <p className="font-semibold text-foreground">{t.title}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            Due: {new Date(t.dueDate).toLocaleDateString("en-IN")} • Assigned:{" "}
                            {t.assignedToName || "Unassigned"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${getPriorityBadge(
                          t.priority
                        )}`}
                      >
                        {t.priority}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 6: Notes */}
          {activeTab === "notes" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Deal Notes</h3>

              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={3}
                  required
                  placeholder="Record insights, conversation summaries, pricing adjustments..."
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isNoteSubmitting}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </form>

              {deal.notes?.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No notes recorded yet.</p>
              ) : (
                <div className="space-y-2.5">
                  {deal.notes.map((n: any) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-surface-elevated border border-border text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="font-bold text-foreground">{n.authorName}</span>
                        <span className="font-mono">
                          {new Date(n.createdAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                      <p className="text-foreground whitespace-pre-wrap">{n.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 7: Invoices */}
          {activeTab === "invoices" && (
            <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Linked Commercial Invoices</h3>
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Invoice</span>
                </button>
              </div>

              {deal.invoices?.length === 0 ? (
                <div className="py-12 text-center space-y-2 border-2 border-dashed border-border rounded-2xl">
                  <Receipt className="w-8 h-8 text-muted-foreground/50 mx-auto" />
                  <p className="text-xs font-semibold text-foreground">No invoices generated yet.</p>
                  <button
                    type="button"
                    onClick={() => setIsInvoiceModalOpen(true)}
                    className="inline-flex px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                  >
                    Issue First Invoice
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deal.invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-surface-elevated border border-border text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/app/invoices/${inv.id}`}
                            className="font-bold text-foreground hover:text-primary transition-colors font-mono"
                          >
                            {inv.invoiceNumber}
                          </Link>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{inv.customerName}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-mono">
                          Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-right font-mono">
                        <div>
                          <p className="font-bold text-foreground">₹{inv.total.toLocaleString("en-IN")}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Paid: ₹{inv.amountPaid.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="px-2.5 py-1 rounded-lg border border-border text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface"
                        >
                          View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mark Won Modal */}
      {isWonModalOpen && (
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
                <span className="text-muted-foreground">Deal Value:</span>
                <span className="font-bold text-emerald-400 font-mono">{deal.valueFormatted}</span>
              </div>
              {deal.company && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="text-foreground">{deal.company.name}</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground">
              This sets probability to 100%, moves the deal to Won stage, and triggers revenue
              analytics.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsWonModalOpen(false)}
                disabled={isSubmittingAction}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkWon}
                disabled={isSubmittingAction}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition-colors cursor-pointer"
              >
                {isSubmittingAction ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Closing...</span>
                  </>
                ) : (
                  <span>Confirm Won</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Lost Modal */}
      {isLostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                <XCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Mark Deal as Lost</h3>
                <p className="text-xs text-muted-foreground">Record structured reason for loss analysis</p>
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
                  Loss Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  value={lostNotes}
                  onChange={(e) => setLostNotes(e.target.value)}
                  placeholder="e.g. Budget constraints, selected competitor..."
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLostModalOpen(false)}
                  disabled={isSubmittingAction}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAction}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 transition-colors cursor-pointer"
                >
                  {isSubmittingAction ? (
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

      {/* Invoice Creation Modal */}
      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => loadDeal()}
        initialDealId={deal.id}
        initialContactId={deal.contactId || undefined}
        initialCompanyId={deal.companyId || undefined}
        initialCustomerName={deal.contact?.fullName || deal.company?.name || deal.name}
        initialCustomerCompany={deal.company?.name || undefined}
        initialCustomerEmail={deal.contact?.email || undefined}
        initialAmount={deal.valueNumeric}
        initialDescription={`Services for opportunity: ${deal.name}`}
      />

      {/* Call Modal */}
      <LogCallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        onSuccess={() => loadDeal()}
        initialLeadId={deal.leadId || undefined}
        initialContactId={deal.contactId || undefined}
        initialDealId={deal.id}
      />

      {/* Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        onSuccess={() => loadDeal()}
        initialLeadId={deal.leadId || undefined}
        initialContactId={deal.contactId || undefined}
        initialDealId={deal.id}
        initialRecipientEmail={deal.contact?.email || undefined}
      />

      {/* Meeting Modal */}
      <ScheduleMeetingModal
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        onSuccess={() => loadDeal()}
        initialLeadId={deal.leadId || undefined}
        initialDealId={deal.id}
      />

      {/* WhatsApp Modal */}
      <LogMessageModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        onSuccess={() => loadDeal()}
        initialLeadId={deal.leadId || undefined}
        initialDealId={deal.id}
        initialPhone={deal.contact?.phone || undefined}
      />

      {/* FollowUp Modal */}
      <CreateFollowUpModal
        isOpen={isFollowUpModalOpen}
        onClose={() => setIsFollowUpModalOpen(false)}
        onSuccess={() => loadDeal()}
        initialLeadId={deal.leadId || undefined}
        initialDealId={deal.id}
      />
    </div>
  );
}
