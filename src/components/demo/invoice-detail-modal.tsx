"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Printer,
  Mail,
  Receipt,
  Sparkles,
} from "lucide-react";
import { Invoice, InvoiceStatus } from "@/lib/demo-data/types";
import { Badge } from "@/components/ui/badge";

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: InvoiceStatus) => void;
}

const statusConfig: Record<InvoiceStatus, { label: string; variant: "success" | "warning" | "error"; icon: typeof CheckCircle2 }> = {
  Paid: { label: "Paid", variant: "success", icon: CheckCircle2 },
  Pending: { label: "Pending Payment", variant: "warning", icon: Clock },
  Overdue: { label: "Overdue", variant: "error", icon: AlertCircle },
};

export function InvoiceDetailModal({
  invoice,
  isOpen,
  onClose,
  onStatusChange,
}: InvoiceDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!invoice) return null;

  const statusInfo = statusConfig[invoice.status];
  const StatusIcon = statusInfo.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-white/10 bg-[#0F172A] shadow-2xl shadow-black/80 overflow-hidden z-10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 id="invoice-modal-title" className="text-base font-semibold text-white">
                      Invoice {invoice.invoiceNumber}
                    </h2>
                    <Badge variant={statusInfo.variant} className="text-xs">
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    GST-Compliant B2B Tax Invoice (Demo Record)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => alert("Demo action: Invoice download simulated. No real file is generated.")}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Download PDF"
                  aria-label="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => alert("Demo action: Invoice print simulated.")}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  title="Print Invoice"
                  aria-label="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm text-slate-300">
              {/* Top Meta Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl border border-white/5 bg-slate-900/60">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Billed To
                  </span>
                  <div className="font-semibold text-white text-base">{invoice.customerCompany}</div>
                  <div className="text-slate-300">{invoice.customerName}</div>
                  <div className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" />
                    {invoice.customerEmail}
                  </div>
                  {invoice.customerGst && (
                    <div className="text-xs text-slate-400 mt-1 font-mono">
                      GSTIN: {invoice.customerGst}
                    </div>
                  )}
                </div>

                <div className="sm:text-right flex flex-col justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Invoice Details
                    </span>
                    <div className="text-xs text-slate-300">
                      <span className="text-slate-400">Issue Date:</span> {invoice.issueDate}
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      <span className="text-slate-400">Due Date:</span> {invoice.dueDate}
                    </div>
                    {invoice.paidAt && (
                      <div className="text-xs text-emerald-400 mt-0.5 font-medium">
                        Paid on: {invoice.paidAt} ({invoice.paymentMethod})
                      </div>
                    )}
                  </div>

                  <div className="mt-3 sm:mt-0">
                    <span className="text-xs text-slate-400 block">Total Amount Due</span>
                    <span className="text-xl font-bold text-white font-mono">
                      ₹{invoice.total.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Line Items & Charges
                </h3>
                <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-white/10 bg-white/[0.03] text-slate-400">
                      <tr>
                        <th className="py-2.5 px-4 font-medium">Item Description</th>
                        <th className="py-2.5 px-3 font-medium text-center">Qty</th>
                        <th className="py-2.5 px-3 font-medium text-right">Unit Price</th>
                        <th className="py-2.5 px-4 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-mono">
                      {invoice.items.map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-4 font-sans text-slate-200">
                            {item.description}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-300">
                            {item.quantity}
                          </td>
                          <td className="py-3 px-3 text-right text-slate-300">
                            ₹{item.unitPrice.toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-white">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="flex justify-end">
                <div className="w-full sm:w-64 space-y-2 p-4 rounded-xl border border-white/5 bg-slate-900/60 font-mono text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="text-slate-200">₹{invoice.subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST (18%):</span>
                    <span className="text-slate-200">₹{invoice.taxGst.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="pt-2 border-t border-white/10 flex justify-between font-bold text-sm text-white">
                    <span>Total (INR):</span>
                    <span className="text-blue-400">₹{invoice.total.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              </div>

              {/* Status Update Simulation */}
              {onStatusChange && (
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-medium text-white">Update Demo Status</div>
                    <div className="text-xs text-slate-400">
                      Simulate payment state updates locally
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(["Paid", "Pending", "Overdue"] as InvoiceStatus[]).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onStatusChange(invoice.id, st)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                          invoice.status === st
                            ? "bg-blue-600 text-white border-blue-500"
                            : "bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-700"
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5 text-blue-400/90">
                <Sparkles className="w-3.5 h-3.5" />
                Interactive Demo Prototype
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg bg-slate-800 text-white hover:bg-slate-700 font-medium transition-colors"
              >
                Close Preview
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
