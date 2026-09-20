"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Building2,
  ArrowLeft,
  Calendar,
  Loader2,
  Percent,
  ArrowRight,
} from "lucide-react";
import { getInvoiceReportAction } from "@/lib/actions/invoices-actions";
import { cn } from "@/lib/utils";

const DATE_PRESETS = [
  { label: "This Month", value: "THIS_MONTH" },
  { label: "This Quarter", value: "THIS_QUARTER" },
  { label: "This Year", value: "THIS_YEAR" },
  { label: "All Time", value: "ALL" },
] as const;

export function InvoiceReportsClient() {
  const [datePreset, setDatePreset] = useState<string>("THIS_YEAR");
  const [reportData, setReportData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getInvoiceReportAction({
        datePreset,
      });

      if (res.success && res.data) {
        setReportData(res.data);
      } else {
        setError(res.error || "Failed to load billing report");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, [datePreset]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            Billing & Invoicing Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Analyze collection efficiency, payment methods, aging overdue invoices, and cashflow.
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex items-center bg-surface-elevated border border-border rounded-xl p-0.5">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setDatePreset(p.value)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer",
                datePreset === p.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && !reportData ? (
        <div className="py-24 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-xs text-muted-foreground font-mono">Aggregating PostgreSQL billing records...</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center text-xs text-rose-400">{error}</div>
      ) : (
        <>
          {/* KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Total Invoiced</span>
                <Receipt className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-foreground">
                {reportData.summary.totalInvoicedFormatted}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {reportData.summary.totalInvoicesCount} invoices issued
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Collected Revenue</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {reportData.summary.totalCollectedFormatted}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {reportData.summary.paidInvoicesCount} fully cleared
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Outstanding Balance</span>
                <Clock className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                {reportData.summary.totalOutstandingFormatted}
              </div>
              <div className="text-[11px] text-muted-foreground">
                Collection rate: <span className="font-bold text-foreground">{reportData.summary.collectionRate}</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border space-y-1">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs font-medium">Overdue Amount</span>
                <AlertCircle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-black text-rose-400">
                {reportData.summary.totalOverdueFormatted}
              </div>
              <div className="text-[11px] text-rose-400/90 font-medium">
                {reportData.summary.overdueInvoicesCount} invoices past due date
              </div>
            </div>
          </div>

          {/* Monthly Trend & Payment Methods Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Monthly Trend */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-surface-elevated/40 border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> Monthly Collections (Invoiced vs Paid)
              </h3>

              {reportData.monthlyBreakdown.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No monthly invoicing history in this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.monthlyBreakdown.map((m: any) => {
                    const max = Math.max(...reportData.monthlyBreakdown.map((x: any) => Math.max(x.invoiced, x.paid))) || 1;
                    const invoicedPct = Math.round((m.invoiced / max) * 100);
                    const paidPct = Math.round((m.paid / max) * 100);

                    return (
                      <div key={m.month} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-foreground">{m.month}</span>
                          <span className="text-muted-foreground">
                            Invoiced: <strong className="text-foreground">{m.invoicedFormatted}</strong> | Paid:{" "}
                            <strong className="text-emerald-400">{m.paidFormatted}</strong>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface rounded-full overflow-hidden flex gap-1">
                          <div
                            style={{ width: `${invoicedPct}%` }}
                            className="bg-primary/40 rounded-full h-full"
                            title={`Invoiced: ${m.invoicedFormatted}`}
                          />
                          <div
                            style={{ width: `${paidPct}%` }}
                            className="bg-emerald-400 rounded-full h-full"
                            title={`Paid: ${m.paidFormatted}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Methods */}
            <div className="p-5 rounded-2xl bg-surface-elevated/40 border border-border space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-primary" /> Payment Methods
              </h3>

              {reportData.paymentMethods.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  No cleared payments recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.paymentMethods.map((pm: any) => (
                    <div key={pm.method} className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-foreground font-medium">{pm.method}</span>
                        <span className="font-mono text-muted-foreground">
                          {pm.amountFormatted} ({pm.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pm.percentage}%` }}
                          className="bg-emerald-400 h-full rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overdue Aging Table */}
          {reportData.overdueInvoices.length > 0 && (
            <div className="p-5 rounded-2xl bg-surface-elevated/40 border border-border space-y-4">
              <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Top Overdue Invoices Requiring Follow-Up
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-border/80 text-[11px] font-bold text-muted-foreground uppercase">
                      <th className="py-2 px-3">Invoice #</th>
                      <th className="py-2 px-3">Customer</th>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3">Days Overdue</th>
                      <th className="py-2 px-3 text-right">Balance Due</th>
                      <th className="py-2 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {reportData.overdueInvoices.map((ov: any) => (
                      <tr key={ov.id} className="hover:bg-surface-elevated">
                        <td className="py-2.5 px-3 font-mono font-bold text-primary">
                          {ov.invoiceNumber}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-foreground">{ov.customerName}</div>
                          {ov.companyName && (
                            <div className="text-[11px] text-muted-foreground">{ov.companyName}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{ov.dueDate}</td>
                        <td className="py-2.5 px-3 font-bold text-rose-400">
                          {ov.daysOverdue} days
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-right text-rose-400">
                          {ov.balanceDueFormatted}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Link
                            href={`/app/invoices/${ov.id}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                          >
                            View <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
