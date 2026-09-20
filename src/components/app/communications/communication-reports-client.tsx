"use client";

import * as React from "react";
import {
  FileBarChart,
  Phone,
  Calendar,
  Mail,
  MessageCircle,
  Trophy,
  Download,
  CalendarDays,
  TrendingUp,
  Users2,
  PieChart,
  Filter,
} from "lucide-react";
import { getCommunicationReportsAction } from "@/lib/actions/communications-actions";

interface CommunicationReportsClientProps {
  initialReport: {
    totalInteractions: number;
    channelCounts: {
      CALL: number;
      MEETING: number;
      EMAIL: number;
      WHATSAPP: number;
      SMS: number;
      NOTE: number;
    };
    outcomeBreakdown: Array<{ outcome: string; count: number }>;
    leaderboard: Array<{
      ownerId: string;
      ownerName: string;
      calls: number;
      meetings: number;
      emails: number;
      total: number;
    }>;
  };
}

export function CommunicationReportsClient({
  initialReport,
}: CommunicationReportsClientProps) {
  const [report, setReport] = React.useState(initialReport);
  const [rangePreset, setRangePreset] = React.useState<"7d" | "30d" | "month" | "all">("30d");
  const [loading, setLoading] = React.useState(false);

  const fetchReport = React.useCallback(async (preset: string) => {
    setLoading(true);
    let startDate: string | undefined;
    const now = new Date();

    if (preset === "7d") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDate = d.toISOString();
    } else if (preset === "30d") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDate = d.toISOString();
    } else if (preset === "month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    }

    const res = await getCommunicationReportsAction({ startDate });
    if (res.success && res.data) {
      setReport(res.data);
    }
    setLoading(false);
  }, []);

  function handlePresetChange(preset: "7d" | "30d" | "month" | "all") {
    setRangePreset(preset);
    fetchReport(preset);
  }

  function exportReportCsv() {
    const rows = [
      ["Rep Name", "Calls Logged", "Meetings Held", "Emails Sent", "Total Touches"],
      ...report.leaderboard.map((r) => [
        `"${r.ownerName}"`,
        r.calls,
        r.meetings,
        r.emails,
        r.total,
      ]),
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `nexora_communication_report_${rangePreset}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const channelTotal = report.totalInteractions || 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight sm:text-2xl">
              Communication & Outreach Analytics
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
              Insights
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Team outreach velocity, call outcome conversion rates & rep performance leaderboard
          </p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-surface-elevated p-1 rounded-xl border border-border">
            {[
              { key: "7d", label: "7 Days" },
              { key: "30d", label: "30 Days" },
              { key: "month", label: "This Month" },
              { key: "all", label: "All Time" },
            ].map((p) => (
              <button
                key={p.key}
                onClick={() => handlePresetChange(p.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  rangePreset === p.key
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={exportReportCsv}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface-elevated hover:bg-surface text-foreground text-xs font-semibold transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Top Channel Distribution Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border/80 bg-surface-elevated p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase">Total Outreach</span>
          <p className="text-2xl font-black text-foreground">{report.totalInteractions}</p>
          <span className="text-[10px] text-muted-foreground">All team interactions</span>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-blue-400 uppercase flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> Calls
          </span>
          <p className="text-2xl font-black text-blue-300">{report.channelCounts.CALL}</p>
          <span className="text-[10px] text-muted-foreground">
            {Math.round((report.channelCounts.CALL / channelTotal) * 100)}% of total
          </span>
        </div>

        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-purple-400 uppercase flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Meetings
          </span>
          <p className="text-2xl font-black text-purple-300">{report.channelCounts.MEETING}</p>
          <span className="text-[10px] text-muted-foreground">
            {Math.round((report.channelCounts.MEETING / channelTotal) * 100)}% of total
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> Emails
          </span>
          <p className="text-2xl font-black text-emerald-300">{report.channelCounts.EMAIL}</p>
          <span className="text-[10px] text-muted-foreground">
            {Math.round((report.channelCounts.EMAIL / channelTotal) * 100)}% of total
          </span>
        </div>

        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-teal-400 uppercase flex items-center gap-1">
            <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
          </span>
          <p className="text-2xl font-black text-teal-300">{report.channelCounts.WHATSAPP}</p>
          <span className="text-[10px] text-muted-foreground">
            {Math.round((report.channelCounts.WHATSAPP / channelTotal) * 100)}% of total
          </span>
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
          <span className="text-[11px] font-semibold text-amber-400 uppercase">SMS & Notes</span>
          <p className="text-2xl font-black text-amber-300">
            {report.channelCounts.SMS + report.channelCounts.NOTE}
          </p>
          <span className="text-[10px] text-muted-foreground">Quick logs</span>
        </div>
      </div>

      {/* Main Grid: Call Outcomes & Rep Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Call Outcomes Distribution */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <PieChart className="h-4 w-4 text-blue-400" />
              Call Outcome Breakdown
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {report.channelCounts.CALL} Total Calls
            </span>
          </div>

          {report.outcomeBreakdown.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No call outcome data recorded for this period.
            </div>
          ) : (
            <div className="space-y-3">
              {report.outcomeBreakdown.map((item) => {
                const totalCalls = report.channelCounts.CALL || 1;
                const pct = Math.round((item.count / totalCalls) * 100);

                return (
                  <div key={item.outcome} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{item.outcome}</span>
                      <span className="font-mono text-muted-foreground">
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-elevated overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.outcome === "CONNECTED"
                            ? "bg-emerald-500"
                            : item.outcome === "CALLBACK_REQUESTED"
                            ? "bg-blue-500"
                            : item.outcome === "NO_ANSWER"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${Math.max(pct, 3)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rep Activity Leaderboard */}
        <div className="rounded-2xl border border-border bg-surface p-5 space-y-4 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-400" />
              Sales Rep Activity Leaderboard
            </h3>
            <span className="text-[11px] text-muted-foreground">Ranked by total touches</span>
          </div>

          {report.leaderboard.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No team activity logs found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-[10px] font-bold text-muted-foreground uppercase">
                    <th className="py-2.5 px-3">Rank & Rep</th>
                    <th className="py-2.5 px-3">Calls</th>
                    <th className="py-2.5 px-3">Meetings</th>
                    <th className="py-2.5 px-3">Emails</th>
                    <th className="py-2.5 px-3 text-right">Total Touches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {report.leaderboard.map((rep, idx) => (
                    <tr key={rep.ownerId} className="hover:bg-surface-hover transition-colors">
                      <td className="py-3 px-3 font-semibold text-foreground flex items-center gap-2.5">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                            idx === 0
                              ? "bg-amber-500 text-black shadow-xs"
                              : idx === 1
                              ? "bg-slate-300 text-black"
                              : idx === 2
                              ? "bg-amber-700 text-white"
                              : "bg-surface-elevated text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span>{rep.ownerName}</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{rep.calls}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{rep.meetings}</td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">{rep.emails}</td>
                      <td className="py-3 px-3 font-mono font-bold text-foreground text-right">
                        <span className="px-2 py-0.5 rounded-lg bg-surface-elevated border border-border">
                          {rep.total}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
