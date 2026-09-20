"use client";

import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Plus,
  ArrowUpRight,
  X,
} from "lucide-react";
import { INITIAL_DEMO_INVOICES, DEMO_INVOICE_STATS } from "@/lib/demo-data/invoices";
import { Invoice, InvoiceStatus } from "@/lib/demo-data/types";
import { Badge } from "@/components/ui/badge";
import { InvoiceDetailModal } from "@/components/demo/invoice-detail-modal";

export function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_DEMO_INVOICES);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Status badge config helper
  const getStatusInfo = (status: InvoiceStatus) => {
    switch (status) {
      case "Paid":
        return { label: "Paid", variant: "success" as const, icon: CheckCircle2 };
      case "Pending":
        return { label: "Pending", variant: "warning" as const, icon: Clock };
      case "Overdue":
        return { label: "Overdue", variant: "error" as const, icon: AlertCircle };
    }
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const matchesSearch =
        searchQuery === "" ||
        inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerCompany.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.customerEmail.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === "All" || inv.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchQuery, statusFilter]);

  const handleOpenInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handleStatusChange = (invId: string, newStatus: InvoiceStatus) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invId) {
          const updated = {
            ...inv,
            status: newStatus,
            paidAt: newStatus === "Paid" ? "Just now" : undefined,
            paymentMethod: newStatus === "Paid" ? "Online / Verified" : undefined,
          };
          if (selectedInvoice && selectedInvoice.id === invId) {
            setSelectedInvoice(updated);
          }
          return updated;
        }
        return inv;
      })
    );
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
  };

  const stats = [
    {
      label: "Total Invoiced",
      value: DEMO_INVOICE_STATS.totalInvoiced,
      sublabel: "Lifetime billing",
      icon: Receipt,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Paid & Cleared",
      value: DEMO_INVOICE_STATS.paid,
      sublabel: "73.3% collection rate",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      label: "Pending Payment",
      value: DEMO_INVOICE_STATS.pending,
      sublabel: "Awaiting client clearance",
      icon: Clock,
      color: "text-amber-400",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Overdue Amount",
      value: DEMO_INVOICE_STATS.overdue,
      sublabel: "Follow-up required",
      icon: AlertCircle,
      color: "text-rose-400",
      bg: "bg-rose-500/10 border-rose-500/20",
    },
  ];

  const statusOptions = ["All", "Paid", "Pending", "Overdue"];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-400" />
            Billing &amp; Invoicing
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated GST tax invoicing, payment tracking, and ledger reconciliation (Sample Data)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newInv: Invoice = {
                id: `inv-${Date.now()}`,
                invoiceNumber: `INV-${1050 + invoices.length + 1}`,
                customerName: "Siddharth Rao",
                customerCompany: "Zenith Retail Infra",
                customerEmail: "siddharth@zenithretail.in",
                customerGst: "27AAACZ9842M1ZQ",
                issueDate: "14 Sep 2026",
                dueDate: "28 Sep 2026",
                items: [
                  {
                    id: "item-new-1",
                    description: "NEXORA Enterprise Platform Plan (100 Users)",
                    quantity: 1,
                    unitPrice: 180000,
                    amount: 180000,
                  },
                ],
                subtotal: 180000,
                taxGst: 32400,
                total: 212400,
                status: "Pending",
              };
              setInvoices((prev) => [newInv, ...prev]);
            }}
            className="px-3.5 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1.5 shadow-md shadow-blue-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            Generate Demo Invoice
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
              className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {stat.label}
                </span>
                <div className={`p-2 rounded-xl border ${stat.bg} ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl font-bold text-white font-mono">{stat.value}</div>
              <div className="mt-1 text-xs text-slate-500">{stat.sublabel}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by invoice #, company, customer name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Dropdown */}
          <div className="sm:col-span-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/90 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-500/50 transition-colors"
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-white">
                  Status: {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong className="text-white font-mono">{filteredInvoices.length}</strong> of{" "}
              <span className="font-mono">{invoices.length}</span> invoices
            </span>
            {(searchQuery || statusFilter !== "All") && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-blue-400 hover:text-blue-300 underline font-medium ml-2"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            Click any invoice row to view GST line items, subtotal &amp; download preview
          </div>
        </div>
      </div>

      {/* Invoice Table */}
      <div className="rounded-2xl bg-[#0F172A]/80 border border-white/10 shadow-sm overflow-hidden">
        {filteredInvoices.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[720px]">
              <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400 uppercase tracking-wider font-medium">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer &amp; Company</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">Amount (Inc. GST)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredInvoices.map((inv) => {
                  const statusInfo = getStatusInfo(inv.status);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <tr
                      key={inv.id}
                      onClick={() => handleOpenInvoice(inv)}
                      className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                          {inv.customerCompany}
                        </div>
                        <div className="text-slate-500 text-[11px]">{inv.customerName}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {inv.issueDate}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {inv.dueDate}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        ₹{inv.total.toLocaleString("en-IN")}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={statusInfo.variant} className="text-[11px] inline-flex items-center gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenInvoice(inv);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                          title="View Invoice Preview"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 px-4 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/10 text-slate-400 mx-auto flex items-center justify-center">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-white">No invoices found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No demo invoice records match &quot;{searchQuery}&quot; or status filters.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors inline-block"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        invoice={selectedInvoice}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInvoice(null);
        }}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
