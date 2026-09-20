"use client";

import * as React from "react";
import {
  Phone,
  PhoneCall,
  Calendar,
  Mail,
  MessageSquare,
  MessageCircle,
  FileText,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Video,
  User,
  Building,
  Briefcase,
  Trash2,
  ExternalLink,
  ChevronDown,
  Sparkles,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import {
  CommunicationType,
  CommunicationDirection,
  CallOutcome,
  MeetingStatus,
} from "@/lib/validations/communications";
import {
  getCommunicationsListAction,
  getCommunicationMetricsAction,
  deleteCommunicationAction,
} from "@/lib/actions/communications-actions";
import { LogCallModal } from "./log-call-modal";
import { ScheduleMeetingModal } from "./schedule-meeting-modal";
import { SendEmailModal } from "./send-email-modal";
import { LogMessageModal } from "./log-message-modal";
import { TemplatesModal } from "./templates-modal";
import { UpdateMeetingModal } from "./update-meeting-modal";

interface CommunicationsClientProps {
  initialData: {
    items: any[];
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  initialMetrics: any;
  leads?: Array<{ id: string; name: string; email?: string | null; phone?: string | null }>;
  deals?: Array<{ id: string; name: string }>;
}

export function CommunicationsClient({
  initialData,
  initialMetrics,
  leads = [],
  deals = [],
}: CommunicationsClientProps) {
  const [data, setData] = React.useState(initialData);
  const [metrics, setMetrics] = React.useState(initialMetrics);
  const [activeTab, setActiveTab] = React.useState<string>("ALL");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  // Modals state
  const [isLogCallOpen, setIsLogCallOpen] = React.useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = React.useState(false);
  const [isSendEmailOpen, setIsSendEmailOpen] = React.useState(false);
  const [isLogMessageOpen, setIsLogMessageOpen] = React.useState(false);
  const [messageModalType, setMessageModalType] = React.useState<CommunicationType>(
    CommunicationType.WHATSAPP
  );
  const [isTemplatesOpen, setIsTemplatesOpen] = React.useState(false);
  const [selectedMeetingForUpdate, setSelectedMeetingForUpdate] = React.useState<any | null>(null);

  const refreshData = React.useCallback(async () => {
    setLoading(true);
    const [listRes, metricsRes] = await Promise.all([
      getCommunicationsListAction({
        type: activeTab === "ALL" ? undefined : (activeTab as CommunicationType),
        search: searchQuery || undefined,
        page: 1,
        limit: 50,
      }),
      getCommunicationMetricsAction(),
    ]);

    if (listRes.success && listRes.data) {
      setData(listRes.data);
    }
    if (metricsRes.success && metricsRes.data) {
      setMetrics(metricsRes.data);
    }
    setLoading(false);
  }, [activeTab, searchQuery]);

  React.useEffect(() => {
    refreshData();
  }, [activeTab, refreshData]);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this communication log?")) return;
    const res = await deleteCommunicationAction(id);
    if (res.success) {
      refreshData();
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Title and Quick CTAs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight sm:text-2xl">
              Communication Hub
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              Multi-Channel
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Omnichannel outreach, call ledger, meeting scheduling & template-driven touchpoints
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsLogCallOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <PhoneCall className="h-3.5 w-3.5" />
            Log Call
          </button>
          <button
            onClick={() => setIsScheduleMeetingOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Calendar className="h-3.5 w-3.5" />
            Schedule Meeting
          </button>
          <button
            onClick={() => setIsSendEmailOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Mail className="h-3.5 w-3.5" />
            Send Email
          </button>
          <button
            onClick={() => {
              setMessageModalType(CommunicationType.WHATSAPP);
              setIsLogMessageOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Message / Note
          </button>
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-surface text-foreground text-xs font-semibold transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Templates
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Interactions */}
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Touches</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-black text-foreground">{metrics?.totalInteractions || 0}</p>
          <p className="text-[10px] text-muted-foreground">Across all channels</p>
        </div>

        {/* Calls Logged */}
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Calls Logged</span>
            <Phone className="h-4 w-4 text-blue-400" />
          </div>
          <p className="text-xl font-black text-foreground">{metrics?.totalCalls || 0}</p>
          <p className="text-[10px] text-blue-400 font-medium">
            {metrics?.callConnectRate || 0}% connected ({metrics?.totalCallMinutes || 0}m)
          </p>
        </div>

        {/* Meetings */}
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Meetings</span>
            <Calendar className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-xl font-black text-foreground">{metrics?.totalMeetings || 0}</p>
          <p className="text-[10px] text-purple-400 font-medium">
            {metrics?.completedMeetings || 0} completed
          </p>
        </div>

        {/* Emails Sent */}
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Emails Sent</span>
            <Mail className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-black text-foreground">{metrics?.totalEmails || 0}</p>
          <p className="text-[10px] text-emerald-400 font-medium">Template powered</p>
        </div>

        {/* WhatsApp & SMS */}
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">WA & SMS</span>
            <MessageCircle className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-xl font-black text-foreground">
            {(metrics?.totalWhatsApp || 0) + (metrics?.totalSms || 0)}
          </p>
          <p className="text-[10px] text-teal-400 font-medium">
            {metrics?.totalWhatsApp || 0} WA • {metrics?.totalSms || 0} SMS
          </p>
        </div>

        {/* Due Today Follow-ups */}
        <Link
          href="/app/follow-ups"
          className="rounded-2xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 p-3.5 space-y-1 transition-colors cursor-pointer group shadow-xs"
        >
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Due Today</span>
            <CalendarClock className="h-4 w-4 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-xl font-black text-amber-300">{metrics?.todayFollowUps || 0}</p>
          <p className="text-[10px] text-amber-400/80 font-medium">
            {metrics?.overdueFollowUps || 0} overdue
          </p>
        </Link>
      </div>

      {/* Tabs & Search Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-1">
        {/* Channel Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-1 bg-surface-elevated rounded-xl border border-border max-w-full">
          {[
            { key: "ALL", label: "All Activity" },
            { key: "CALL", label: "Calls" },
            { key: "MEETING", label: "Meetings" },
            { key: "EMAIL", label: "Emails" },
            { key: "WHATSAPP", label: "WhatsApp" },
            { key: "SMS", label: "SMS" },
            { key: "NOTE", label: "Notes" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") refreshData();
            }}
            className="w-full rounded-xl border border-border bg-surface-elevated pl-9 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Unified Communication Feed Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground animate-pulse">
            Loading communication records...
          </div>
        ) : data.items.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-elevated text-muted-foreground border border-border">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">No communication records found</h3>
              <p className="text-xs text-muted-foreground">
                Log a call, schedule a meeting, or send an email to begin tracking interactions.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setIsLogCallOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
              >
                Log Call
              </button>
              <button
                onClick={() => setIsScheduleMeetingOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold"
              >
                Schedule Meeting
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface-elevated text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Channel & Type</th>
                  <th className="py-3 px-4">Subject & Summary</th>
                  <th className="py-3 px-4">Associated Entity</th>
                  <th className="py-3 px-4">Outcome / Status</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Date / Time</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {data.items.map((item) => {
                  const isCall = item.type === CommunicationType.CALL;
                  const isMeeting = item.type === CommunicationType.MEETING;
                  const isEmail = item.type === CommunicationType.EMAIL;
                  const isWhatsApp = item.type === CommunicationType.WHATSAPP;
                  const isSms = item.type === CommunicationType.SMS;
                  const isNote = item.type === CommunicationType.NOTE;

                  const dateDisplay = new Date(
                    item.meetingStart || item.scheduledAt || item.createdAt
                  ).toLocaleString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-surface-hover/50 transition-colors group"
                    >
                      {/* Channel Icon & Direction */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                              isCall
                                ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                : isMeeting
                                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                : isEmail
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : isWhatsApp
                                ? "bg-teal-500/10 text-teal-400 border-teal-500/20"
                                : isSms
                                ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            }`}
                          >
                            {isCall && <PhoneCall className="h-4 w-4" />}
                            {isMeeting && <Calendar className="h-4 w-4" />}
                            {isEmail && <Mail className="h-4 w-4" />}
                            {isWhatsApp && <MessageCircle className="h-4 w-4" />}
                            {isSms && <Phone className="h-4 w-4" />}
                            {isNote && <FileText className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="font-bold text-foreground block leading-tight">
                              {item.type}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              {item.direction === CommunicationDirection.INBOUND ? (
                                <>
                                  <ArrowDownLeft className="h-2.5 w-2.5 text-blue-400" />
                                  Inbound
                                </>
                              ) : (
                                <>
                                  <ArrowUpRight className="h-2.5 w-2.5 text-emerald-400" />
                                  Outbound
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Summary */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-foreground truncate">
                            {item.subject || `${item.type} Touchpoint`}
                          </p>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {item.content}
                          </p>
                          {item.meetingLink && (
                            <a
                              href={item.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-purple-400 hover:underline pt-0.5"
                            >
                              <Video className="h-2.5 w-2.5" />
                              Join Meeting
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Associated Entity */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.lead ? (
                          <Link
                            href={`/app/leads/${item.lead.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border/80 hover:border-primary text-[11px] font-medium text-foreground transition-colors"
                          >
                            <User className="h-3 w-3 text-primary" />
                            <span>{item.lead.name}</span>
                          </Link>
                        ) : item.deal ? (
                          <Link
                            href={`/app/deals/${item.deal.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border/80 hover:border-primary text-[11px] font-medium text-foreground transition-colors"
                          >
                            <Briefcase className="h-3 w-3 text-emerald-400" />
                            <span>{item.deal.name}</span>
                          </Link>
                        ) : item.company ? (
                          <Link
                            href={`/app/companies/${item.company.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border/80 hover:border-primary text-[11px] font-medium text-foreground transition-colors"
                          >
                            <Building className="h-3 w-3 text-sky-400" />
                            <span>{item.company.name}</span>
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">--</span>
                        )}
                      </td>

                      {/* Outcome / Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isCall && item.callOutcome ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.callOutcome === CallOutcome.CONNECTED
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : item.callOutcome === CallOutcome.CALLBACK_REQUESTED
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-muted text-muted-foreground border border-border"
                            }`}
                          >
                            {item.callOutcome}
                            {item.durationSeconds ? ` (${Math.round(item.durationSeconds / 60)}m)` : ""}
                          </span>
                        ) : isMeeting ? (
                          <button
                            type="button"
                            onClick={() => setSelectedMeetingForUpdate(item)}
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${
                              item.meetingStatus === MeetingStatus.COMPLETED
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : item.meetingStatus === MeetingStatus.CANCELLED
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            }`}
                          >
                            {item.meetingStatus || "SCHEDULED"}
                            <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                          </button>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-elevated border border-border text-muted-foreground">
                            {item.status}
                          </span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground">
                        <span className="text-xs font-medium text-foreground">{item.ownerName}</span>
                      </td>

                      {/* Date / Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-[11px] text-muted-foreground">
                        {dateDisplay}
                      </td>

                      {/* Delete Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete Record"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <LogCallModal
        isOpen={isLogCallOpen}
        onClose={() => setIsLogCallOpen(false)}
        onSuccess={refreshData}
        leads={leads}
        deals={deals}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onSuccess={refreshData}
        leads={leads}
        deals={deals}
      />

      <SendEmailModal
        isOpen={isSendEmailOpen}
        onClose={() => setIsSendEmailOpen(false)}
        onSuccess={refreshData}
        leads={leads}
        deals={deals}
      />

      <LogMessageModal
        isOpen={isLogMessageOpen}
        initialType={messageModalType}
        onClose={() => setIsLogMessageOpen(false)}
        onSuccess={refreshData}
        leads={leads}
        deals={deals}
      />

      <TemplatesModal
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
        onSelectTemplate={(tmpl) => {
          setIsSendEmailOpen(true);
        }}
      />

      <UpdateMeetingModal
        isOpen={Boolean(selectedMeetingForUpdate)}
        onClose={() => setSelectedMeetingForUpdate(null)}
        onSuccess={refreshData}
        meeting={selectedMeetingForUpdate}
      />
    </div>
  );
}
