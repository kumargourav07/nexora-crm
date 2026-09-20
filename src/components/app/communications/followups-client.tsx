"use client";

import * as React from "react";
import {
  CalendarClock,
  Phone,
  Mail,
  Calendar,
  CheckSquare,
  MessageCircle,
  Clock,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  User,
  Briefcase,
  Building,
  MoreVertical,
  XCircle,
  CalendarDays,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  FollowUpStatus,
  FollowUpType,
} from "@/lib/validations/communications";
import {
  getFollowUpsListAction,
  getFollowUpMetricsAction,
  cancelFollowUpAction,
} from "@/lib/actions/followups-actions";
import { CreateFollowUpModal } from "./create-followup-modal";
import { CompleteFollowUpModal } from "./complete-followup-modal";
import { RescheduleFollowUpModal } from "./reschedule-followup-modal";

interface FollowUpsClientProps {
  initialData: {
    items: any[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  initialMetrics: any;
  leads?: Array<{ id: string; name: string }>;
  deals?: Array<{ id: string; name: string }>;
}

export function FollowUpsClient({
  initialData,
  initialMetrics,
  leads = [],
  deals = [],
}: FollowUpsClientProps) {
  const [data, setData] = React.useState(initialData);
  const [metrics, setMetrics] = React.useState(initialMetrics);
  const [activeTab, setActiveTab] = React.useState<string>("TODAY");
  const [typeFilter, setTypeFilter] = React.useState<FollowUpType | undefined>(undefined);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [selectedForComplete, setSelectedForComplete] = React.useState<any | null>(null);
  const [selectedForReschedule, setSelectedForReschedule] = React.useState<any | null>(null);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    const [listRes, metricsRes] = await Promise.all([
      getFollowUpsListAction({
        tab: activeTab as any,
        type: typeFilter,
        search: searchQuery || undefined,
        page: 1,
        limit: 50,
      }),
      getFollowUpMetricsAction(),
    ]);

    if (listRes.success && listRes.data) {
      setData(listRes.data);
    }
    if (metricsRes.success && metricsRes.data) {
      setMetrics(metricsRes.data);
    }
    setLoading(false);
  }, [activeTab, typeFilter, searchQuery]);

  React.useEffect(() => {
    refreshData();
  }, [activeTab, typeFilter, refreshData]);

  async function handleCancel(id: string) {
    if (!confirm("Are you sure you want to cancel this follow-up?")) return;
    const res = await cancelFollowUpAction(id);
    if (res.success) {
      refreshData();
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight sm:text-2xl">
              Follow-up Engine
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Active Ledger
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Prioritize daily touchpoints, reduce deal slippage & ensure zero forgotten leads
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/app/follow-ups/calendar"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-surface text-foreground text-xs font-semibold transition-all cursor-pointer"
          >
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Calendar View
          </Link>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            New Follow-up
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {/* Overdue */}
        <div
          onClick={() => setActiveTab("OVERDUE")}
          className={`rounded-2xl border p-3.5 space-y-1 transition-all cursor-pointer ${
            activeTab === "OVERDUE"
              ? "border-rose-500/60 bg-rose-500/15 shadow-sm shadow-rose-500/10"
              : "border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-rose-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overdue</span>
            <AlertCircle className="h-4 w-4" />
          </div>
          <p className="text-xl font-black text-rose-300">{metrics?.overdueCount || 0}</p>
          <p className="text-[10px] text-rose-400/80 font-medium">Requires immediate action</p>
        </div>

        {/* Due Today */}
        <div
          onClick={() => setActiveTab("TODAY")}
          className={`rounded-2xl border p-3.5 space-y-1 transition-all cursor-pointer ${
            activeTab === "TODAY"
              ? "border-amber-500/60 bg-amber-500/15 shadow-sm shadow-amber-500/10"
              : "border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Due Today</span>
            <CalendarClock className="h-4 w-4" />
          </div>
          <p className="text-xl font-black text-amber-300">{metrics?.todayCount || 0}</p>
          <p className="text-[10px] text-amber-400/80 font-medium">Scheduled for today</p>
        </div>

        {/* Due Tomorrow */}
        <div
          onClick={() => setActiveTab("TOMORROW")}
          className={`rounded-2xl border p-3.5 space-y-1 transition-all cursor-pointer ${
            activeTab === "TOMORROW"
              ? "border-blue-500/60 bg-blue-500/15 shadow-sm shadow-blue-500/10"
              : "border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-blue-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tomorrow</span>
            <Clock className="h-4 w-4" />
          </div>
          <p className="text-xl font-black text-blue-300">{metrics?.tomorrowCount || 0}</p>
          <p className="text-[10px] text-blue-400/80 font-medium">Coming up next</p>
        </div>

        {/* Completed This Month */}
        <div
          onClick={() => setActiveTab("COMPLETED")}
          className={`rounded-2xl border p-3.5 space-y-1 transition-all cursor-pointer ${
            activeTab === "COMPLETED"
              ? "border-emerald-500/60 bg-emerald-500/15 shadow-sm shadow-emerald-500/10"
              : "border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10"
          }`}
        >
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <p className="text-xl font-black text-emerald-300">
            {metrics?.completedMonthCount || 0}
          </p>
          <p className="text-[10px] text-emerald-400/80 font-medium">This month</p>
        </div>

        {/* Completion Rate */}
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completion Rate</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-black text-foreground">{metrics?.completionRate || 0}%</p>
          <p className="text-[10px] text-muted-foreground">{metrics?.totalCompleted || 0} resolved</p>
        </div>
      </div>

      {/* Smart Filter Tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface-elevated rounded-xl border border-border max-w-full">
          {[
            { key: "TODAY", label: "Today" },
            { key: "TOMORROW", label: "Tomorrow" },
            { key: "THIS_WEEK", label: "This Week" },
            { key: "OVERDUE", label: "Overdue", count: metrics?.overdueCount },
            { key: "UPCOMING", label: "Upcoming" },
            { key: "COMPLETED", label: "Completed" },
            { key: "ALL", label: "All" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-500 text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search follow-ups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") refreshData();
            }}
            className="w-full rounded-xl border border-border bg-surface-elevated pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Follow-up Ledger List */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
            Loading follow-up tasks...
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-muted-foreground border border-border">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                {activeTab === "TODAY" ? "All caught up for today!" : "No follow-ups found in this view"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Great job staying on top of your outreach pipeline.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => setIsCreateOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                + Add Follow-up
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {data.items.map((item) => {
              const isCompleted = item.status === FollowUpStatus.COMPLETED;
              const isOverdue = item.isOverdue;
              const dueDate = new Date(item.dueAt);

              const isCall = item.type === FollowUpType.CALL;
              const isEmail = item.type === FollowUpType.EMAIL;
              const isMeeting = item.type === FollowUpType.MEETING;

              return (
                <div
                  key={item.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-hover/50 transition-colors group ${
                    isOverdue ? "bg-rose-500/[0.03]" : ""
                  }`}
                >
                  {/* Left: Complete Checkbox + Title + Channel Icon */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      disabled={isCompleted}
                      onClick={() => setSelectedForComplete(item)}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition-all cursor-pointer ${
                        isCompleted
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-border hover:border-emerald-500 hover:bg-emerald-500/10 text-transparent hover:text-emerald-500"
                      }`}
                      title={isCompleted ? "Completed" : "Click to mark completed"}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border text-[10px] ${
                            isCall
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : isEmail
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : isMeeting
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {isCall && <Phone className="h-3 w-3" />}
                          {isEmail && <Mail className="h-3 w-3" />}
                          {isMeeting && <Calendar className="h-3 w-3" />}
                          {!isCall && !isEmail && !isMeeting && <CheckSquare className="h-3 w-3" />}
                        </div>

                        <span
                          className={`text-xs font-bold ${
                            isCompleted
                              ? "line-through text-muted-foreground"
                              : "text-foreground"
                          }`}
                        >
                          {item.title}
                        </span>

                        {isOverdue && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            Overdue
                          </span>
                        )}

                        {isCompleted && item.outcome && (
                          <span className="px-2 py-0.2 rounded-full text-[9px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Outcome: {item.outcome}
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {item.notes}
                        </p>
                      )}

                      {/* Associated Entity Chips */}
                      <div className="flex items-center gap-2 flex-wrap pt-0.5">
                        {item.lead && (
                          <Link
                            href={`/app/leads/${item.lead.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline bg-surface-elevated px-2 py-0.5 rounded-md border border-border/60"
                          >
                            <User className="h-2.5 w-2.5" />
                            {item.lead.name}
                          </Link>
                        )}
                        {item.deal && (
                          <Link
                            href={`/app/deals/${item.deal.id}`}
                            className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:underline bg-surface-elevated px-2 py-0.5 rounded-md border border-border/60"
                          >
                            <Briefcase className="h-2.5 w-2.5" />
                            {item.deal.name}
                          </Link>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          Rep: {item.ownerName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Due Date & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                    <div className="text-right">
                      <p
                        className={`text-xs font-bold ${
                          isOverdue
                            ? "text-rose-400"
                            : isCompleted
                            ? "text-muted-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {dueDate.toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {dueDate.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {!isCompleted && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedForComplete(item)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition-all shadow-xs"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedForReschedule(item)}
                          className="p-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                          title="Reschedule"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(item.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Cancel Follow-up"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateFollowUpModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={refreshData}
        leads={leads}
        deals={deals}
      />

      <CompleteFollowUpModal
        isOpen={Boolean(selectedForComplete)}
        onClose={() => setSelectedForComplete(null)}
        onSuccess={refreshData}
        followUp={selectedForComplete}
      />

      <RescheduleFollowUpModal
        isOpen={Boolean(selectedForReschedule)}
        onClose={() => setSelectedForReschedule(null)}
        onSuccess={refreshData}
        followUp={selectedForReschedule}
      />
    </div>
  );
}
