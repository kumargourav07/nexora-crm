"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Receipt,
  ArrowLeft,
  Printer,
  Send,
  CreditCard,
  Copy,
  XCircle,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileEdit,
  Building2,
  User,
  Briefcase,
  Calendar,
  Loader2,
  Plus,
  DollarSign,
  Check,
  X,
  FileText,
  ShieldAlert,
} from "lucide-react";
import {
  getInvoiceByIdAction,
  sendInvoiceAction,
  cancelInvoiceAction,
  duplicateInvoiceAction,
  recordPaymentAction,
} from "@/lib/actions/invoices-actions";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";
import { cn } from "@/lib/utils";

export interface InvoiceDetailClientProps {
  invoiceId: string;
}

export function InvoiceDetailClient({ invoiceId }: InvoiceDetailClientProps) {
  const router = useRouter();

  const [invoice, setInvoice] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Record Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.BANK_TRANSFER);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const loadInvoice = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getInvoiceByIdAction(invoiceId);
      if (res.success && res.data) {
        setInvoice(res.data);
        setPaymentAmount(res.data.balanceDue);
      } else {
        setError(res.error || "Invoice not found");
      }
    } catch {
      setError("Unable to connect to server");
    } finally {
      setIsLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  const handleSend = async () => {
    if (!confirm("Send invoice to customer?")) return;
    try {
      const res = await sendInvoiceAction(invoiceId);
      if (res.success) {
        alert(res.message || "Invoice sent successfully!");
        loadInvoice();
      } else {
        alert(res.error || "Failed to send invoice");
      }
    } catch {
      alert("Error sending invoice");
    }
  };

  const handleCancel = async () => {
    const reason = prompt("Enter cancellation reason (optional):");
    if (reason === null) return;
    try {
      const res = await cancelInvoiceAction(invoiceId, reason);
      if (res.success) {
        loadInvoice();
      } else {
        alert(res.error || "Failed to cancel invoice");
      }
    } catch {
      alert("Error cancelling invoice");
    }
  };

  const handleDuplicate = async () => {
    try {
      const res = await duplicateInvoiceAction(invoiceId);
      if (res.success && res.data) {
        router.push(`/app/invoices/${res.data.id}`);
      } else {
        alert(res.error || "Failed to duplicate invoice");
      }
    } catch {
      alert("Error duplicating invoice");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      setPaymentError("Payment amount must be greater than 0");
      return;
    }

    setIsPaymentSubmitting(true);
    setPaymentError(null);

    try {
      const res = await recordPaymentAction({
        invoiceId,
        amount: paymentAmount,
        paymentDate,
        paymentMethod,
        reference: paymentReference,
        notes: paymentNotes,
      });

      if (res.success) {
        setIsPaymentModalOpen(false);
        setPaymentReference("");
        setPaymentNotes("");
        loadInvoice();
      } else {
        setPaymentError(res.error || "Failed to record payment");
      }
    } catch {
      setPaymentError("Error communicating with server");
    } finally {
      setIsPaymentSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (st: InvoiceStatus) => {
    switch (st) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Paid in Full
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" /> Partially Paid
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <AlertCircle className="w-3.5 h-3.5" /> Overdue
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Send className="w-3.5 h-3.5" /> Sent / Open
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-zinc-700/30 text-zinc-300 border border-zinc-700/50">
            <FileEdit className="w-3.5 h-3.5" /> Draft
          </span>
        );
    }
  };

  if (isLoading && !invoice) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-muted-foreground font-mono">Loading invoice document...</p>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="py-16 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <p className="text-xs text-rose-400">{error || "Invoice not found"}</p>
        <Link
          href="/app/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Top Action Toolbar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black font-mono tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="w-6 h-6 text-primary" />
              {invoice.invoiceNumber}
            </h1>
            {getStatusBadge(invoice.status)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status === "DRAFT" && (
            <button
              onClick={handleSend}
              className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> Send Invoice
            </button>
          )}

          {invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
            <button
              onClick={() => {
                setPaymentAmount(invoice.balanceDue);
                setIsPaymentModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" /> Record Payment
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-muted-foreground" /> Print / PDF
          </button>

          <button
            onClick={handleDuplicate}
            className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Duplicate as Draft"
          >
            <Copy className="w-3.5 h-3.5 text-muted-foreground" /> Duplicate
          </button>

          {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <button
              onClick={handleCancel}
              className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>

      {/* Main Printable Invoice Paper Container */}
      <div
        id="invoice-document"
        className="p-8 sm:p-12 rounded-3xl bg-surface-elevated/40 border border-border/80 shadow-xl print:shadow-none print:border-none print:p-0 print:bg-white print:text-black space-y-8"
      >
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-border/80 pb-6 print:border-zinc-300">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black font-mono text-sm print:bg-black print:text-white">
                ◈
              </div>
              <span className="text-lg font-black tracking-wider text-foreground print:text-black">
                NEXORA CRM
              </span>
            </div>
            <p className="text-xs text-muted-foreground print:text-zinc-600">
              Enterprise Billing & Cloud Sales
            </p>
            <p className="text-xs text-muted-foreground print:text-zinc-600">
              Tax ID: 27AABCN1234F1Z1
            </p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <div className="text-2xl font-black font-mono text-foreground print:text-black tracking-tight">
              INVOICE
            </div>
            <div className="text-xs font-mono font-bold text-primary print:text-black">
              #{invoice.invoiceNumber}
            </div>
            <div className="text-xs text-muted-foreground print:text-zinc-600 pt-1">
              Issue Date: <span className="font-semibold text-foreground print:text-black">{new Date(invoice.issueDate).toLocaleDateString("en-IN")}</span>
            </div>
            <div className="text-xs text-muted-foreground print:text-zinc-600">
              Due Date: <span className="font-semibold text-foreground print:text-black">{new Date(invoice.dueDate).toLocaleDateString("en-IN")}</span>
            </div>
          </div>
        </div>

        {/* Customer & Billing Entity Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs border-b border-border/80 pb-6 print:border-zinc-300">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-500">
              Billed To:
            </span>
            <div className="text-sm font-bold text-foreground print:text-black">
              {invoice.customerName}
            </div>
            {invoice.customerCompany && (
              <div className="font-medium text-muted-foreground print:text-zinc-700">
                {invoice.customerCompany}
              </div>
            )}
            <div className="text-muted-foreground print:text-zinc-600">{invoice.customerEmail}</div>
            {invoice.customerPhone && (
              <div className="text-muted-foreground print:text-zinc-600">{invoice.customerPhone}</div>
            )}
            {invoice.customerAddress && (
              <div className="text-muted-foreground print:text-zinc-600 whitespace-pre-line pt-1">
                {invoice.customerAddress}
              </div>
            )}
          </div>

          <div className="space-y-1.5 sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground print:text-zinc-500">
              Tax & Supply Details:
            </span>
            {invoice.customerGst && (
              <div className="text-muted-foreground print:text-zinc-700">
                Customer GSTIN: <span className="font-mono font-bold text-foreground print:text-black">{invoice.customerGst}</span>
              </div>
            )}
            {invoice.placeOfSupply && (
              <div className="text-muted-foreground print:text-zinc-700">
                Place of Supply: <span className="font-semibold text-foreground print:text-black">{invoice.placeOfSupply}</span>
              </div>
            )}
            <div className="text-muted-foreground print:text-zinc-700">
              Currency: <span className="font-semibold text-foreground print:text-black">{invoice.currency} (₹)</span>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-[11px] font-bold text-muted-foreground uppercase tracking-wider print:border-zinc-300 print:text-zinc-700">
                <th className="py-2.5 px-3">Item & Description</th>
                <th className="py-2.5 px-3 text-center w-16">Qty</th>
                <th className="py-2.5 px-3 text-right w-28">Rate</th>
                <th className="py-2.5 px-3 text-right w-20">Disc</th>
                <th className="py-2.5 px-3 text-right w-32">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 text-xs print:divide-zinc-200">
              {invoice.items.map((it: any) => (
                <tr key={it.id}>
                  <td className="py-3 px-3 font-medium text-foreground print:text-black">
                    {it.description}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-muted-foreground print:text-black">
                    {it.quantity}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-muted-foreground print:text-black">
                    ₹{it.unitPrice.toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-muted-foreground print:text-black">
                    {it.discount > 0 ? `${it.discount}%` : "-"}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-foreground print:text-black">
                    ₹{it.amount.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Invoice Summary & Tax Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-border print:border-zinc-300">
          <div className="space-y-3 text-xs">
            {invoice.notes && (
              <div>
                <span className="font-bold text-muted-foreground print:text-zinc-700">Notes:</span>
                <p className="text-muted-foreground print:text-zinc-600 mt-0.5 whitespace-pre-line">
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <span className="font-bold text-muted-foreground print:text-zinc-700">Terms & Conditions:</span>
                <p className="text-muted-foreground print:text-zinc-600 mt-0.5 whitespace-pre-line">
                  {invoice.terms}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground print:text-zinc-700">
              <span>Subtotal:</span>
              <span className="font-mono font-semibold text-foreground print:text-black">
                ₹{invoice.subtotal.toLocaleString("en-IN")}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-rose-400 print:text-black">
                <span>Discount ({invoice.discountType === "PERCENTAGE" ? `${invoice.discount}%` : "Fixed"}):</span>
                <span className="font-mono font-semibold">
                  -₹{invoice.discount.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {invoice.cgst > 0 && (
              <div className="flex justify-between text-muted-foreground print:text-zinc-700">
                <span>CGST ({(invoice.taxRate / 2).toFixed(1)}%):</span>
                <span className="font-mono font-semibold text-foreground print:text-black">
                  ₹{invoice.cgst.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {invoice.sgst > 0 && (
              <div className="flex justify-between text-muted-foreground print:text-zinc-700">
                <span>SGST ({(invoice.taxRate / 2).toFixed(1)}%):</span>
                <span className="font-mono font-semibold text-foreground print:text-black">
                  ₹{invoice.sgst.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {invoice.igst > 0 && (
              <div className="flex justify-between text-muted-foreground print:text-zinc-700">
                <span>IGST ({invoice.taxRate}%):</span>
                <span className="font-mono font-semibold text-foreground print:text-black">
                  ₹{invoice.igst.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm font-black border-t border-border pt-2 print:border-zinc-400 text-foreground print:text-black">
              <span>Total Amount:</span>
              <span className="text-base font-mono text-primary print:text-black font-black">
                ₹{invoice.total.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-xs text-muted-foreground print:text-zinc-700 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold text-emerald-400 print:text-black">
                ₹{invoice.amountPaid.toLocaleString("en-IN")}
              </span>
            </div>

            <div className="flex justify-between text-sm font-black border-t border-border/60 pt-2 print:border-zinc-300 text-foreground print:text-black">
              <span>Balance Due:</span>
              <span
                className={cn(
                  "font-mono font-black",
                  invoice.balanceDue > 0 ? "text-amber-400 print:text-black" : "text-emerald-400 print:text-black"
                )}
              >
                ₹{invoice.balanceDue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Ledger & Linked CRM Info (Hidden in Print) */}
      <div className="print:hidden space-y-6">
        {/* Payment History Ledger */}
        <div className="p-5 rounded-2xl bg-surface-elevated/40 border border-border space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" /> Payment History ({invoice.payments.length})
            </h3>

            {invoice.balanceDue > 0 && invoice.status !== "CANCELLED" && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.balanceDue);
                  setIsPaymentModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Record Payment
              </button>
            )}
          </div>

          {invoice.payments.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              No payments recorded for this invoice yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                    <th className="py-2 px-3">Date</th>
                    <th className="py-2 px-3">Amount</th>
                    <th className="py-2 px-3">Method</th>
                    <th className="py-2 px-3">Reference</th>
                    <th className="py-2 px-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-xs">
                  {invoice.payments.map((p: any) => (
                    <tr key={p.id} className="hover:bg-surface-elevated/80">
                      <td className="py-2.5 px-3">{new Date(p.paymentDate).toLocaleDateString("en-IN")}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                        ₹{p.amount.toLocaleString("en-IN")}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-surface border border-border text-[11px] font-mono">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground">{p.reference || "-"}</td>
                      <td className="py-2.5 px-3 text-muted-foreground">{p.recordedByName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Linked CRM Entities */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {invoice.deal && (
            <Link
              href={`/app/deals/${invoice.deal.id}`}
              className="p-4 rounded-2xl bg-surface-elevated/40 border border-border hover:bg-surface-elevated transition-colors group block"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                <Briefcase className="w-3.5 h-3.5" /> Associated Deal
              </div>
              <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {invoice.deal.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Value: ₹{Number(invoice.deal.value).toLocaleString("en-IN")}
              </div>
            </Link>
          )}

          {invoice.contact && (
            <Link
              href={`/app/contacts/${invoice.contact.id}`}
              className="p-4 rounded-2xl bg-surface-elevated/40 border border-border hover:bg-surface-elevated transition-colors group block"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                <User className="w-3.5 h-3.5" /> Associated Contact
              </div>
              <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {invoice.contact.firstName} {invoice.contact.lastName || ""}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {invoice.contact.email || invoice.contact.phone || "View Contact"}
              </div>
            </Link>
          )}

          {invoice.company && (
            <Link
              href={`/app/companies/${invoice.company.id}`}
              className="p-4 rounded-2xl bg-surface-elevated/40 border border-border hover:bg-surface-elevated transition-colors group block"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-primary mb-1">
                <Building2 className="w-3.5 h-3.5" /> Associated Company
              </div>
              <div className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {invoice.company.name}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {invoice.company.industry || "Corporate Account"}
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Record Payment Dialog Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                Record Payment for #{invoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Payment Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max={invoice.balanceDue}
                  step="1"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-sm font-mono font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Remaining balance: ₹{invoice.balanceDue.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Payment Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI (Google Pay / PhonePe)</option>
                    <option value="CARD">Credit / Debit Card</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Transaction / Ref # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. UTR12345678 or TXN-9988"
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Payment Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Internal notes about this transaction..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPaymentSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isPaymentSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
