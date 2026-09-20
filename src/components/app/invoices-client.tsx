"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileEdit,
  Send,
  CreditCard,
  Copy,
  Trash2,
  MoreVertical,
  Download,
  Building2,
  User,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Eye,
} from "lucide-react";
import {
  getInvoicesAction,
  deleteInvoiceAction,
  sendInvoiceAction,
  cancelInvoiceAction,
  duplicateInvoiceAction,
} from "@/lib/actions/invoices-actions";
import { InvoiceStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface InvoiceItemDisplay {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerCompany?: string | null;
  customerEmail: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  totalFormatted: string;
  amountPaid: number;
  amountPaidFormatted: string;
  balanceDue: number;
  balanceDueFormatted: string;
  ownerName: string;
  contactName?: string | null;
  companyName?: string | null;
  dealName?: string | null;
  itemsCount: number;
  createdAt: string;
}

const STATUS_FILTERS = [
  { label: "All Invoices", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Partially Paid", value: "PARTIALLY_PAID" },
  { label: "Paid", value: "PAID" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

export function InvoicesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = useState<InvoiceItemDisplay[]>([]);
  const [stats, setStats] = useState({
    totalInvoicedFormatted: "₹0",
    totalInvoicedCount: 0,
    paidFormatted: "₹0",
    paidCount: 0,
    outstandingFormatted: "₹0",
    overdueFormatted: "₹0",
    overdueCount: 0,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 15,
    totalCount: 0,
    totalPages: 1,
  });

  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "ALL");
  const [sortBy, setSortBy] = useState<"createdAt" | "dueDate" | "issueDate" | "total" | "invoiceNumber">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const loadInvoices = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await getInvoicesAction({
          search: searchQuery,
          status: statusFilter === "ALL" ? undefined : (statusFilter as InvoiceStatus),
          sortBy,
          sortOrder,
          page,
          limit: 15,
        });

        if (res.success && res.data) {
          setInvoices(res.data.invoices as InvoiceItemDisplay[]);
          setStats(res.data.stats);
          setPagination(res.data.pagination);
        } else {
          setError(res.error || "Failed to load invoices");
        }
      } catch {
        setError("Unable to connect to server");
      } finally {
        setIsLoading(false);
      }
    },
    [searchQuery, statusFilter, sortBy, sortOrder]
  );

  useEffect(() => {
    loadInvoices(1);
  }, [loadInvoices]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadInvoices(1);
  };

  const handleSendInvoice = async (id: string) => {
    if (!confirm("Send this invoice to the customer?")) return;
    try {
      const res = await sendInvoiceAction(id);
      if (res.success) {
        alert(res.message || "Invoice sent successfully!");
        loadInvoices(pagination.page);
      } else {
        alert(res.error || "Failed to send invoice");
      }
    } catch {
      alert("Error sending invoice");
    }
  };

  const handleDuplicateInvoice = async (id: string) => {
    try {
      const res = await duplicateInvoiceAction(id);
      if (res.success && res.data) {
        router.push(`/app/invoices/${res.data.id}`);
      } else {
        alert(res.error || "Failed to duplicate invoice");
      }
    } catch {
      alert("Error duplicating invoice");
    }
  };

  const handleCancelInvoice = async (id: string) => {
    const reason = prompt("Enter cancellation reason (optional):");
    if (reason === null) return;
    try {
      const res = await cancelInvoiceAction(id, reason);
      if (res.success) {
        loadInvoices(pagination.page);
      } else {
        alert(res.error || "Failed to cancel invoice");
      }
    } catch {
      alert("Error cancelling invoice");
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this DRAFT invoice?")) return;
    try {
      const res = await deleteInvoiceAction(id);
      if (res.success) {
        loadInvoices(pagination.page);
      } else {
        alert(res.error || "Failed to delete invoice");
      }
    } catch {
      alert("Error deleting invoice");
    }
  };

  const getStatusBadge = (st: InvoiceStatus) => {
    switch (st) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Paid
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Clock className="w-3 h-3" /> Partially Paid
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
            <AlertCircle className="w-3 h-3" /> Overdue
          </span>
        );
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Send className="w-3 h-3" /> Sent / Open
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
      case "DRAFT":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-zinc-700/30 text-zinc-300 border border-zinc-700/50">
            <FileEdit className="w-3 h-3" /> Draft
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Receipt className="w-5 h-5" />
            </div>
            Invoices & Billing
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage professional customer invoices, track payments, GST calculations, and collection health.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/app/reports/invoices"
            className="px-3 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Billing Reports
          </Link>
          <Link
            href="/app/invoices/new"
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/80 relative overflow-hidden group">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Total Invoiced</span>
            <Receipt className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-black text-foreground">{stats.totalInvoicedFormatted}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.totalInvoicedCount} total active invoices
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/80 relative overflow-hidden group">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Collected Revenue</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-black text-emerald-400">{stats.paidFormatted}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            {stats.paidCount} cleared invoices
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/80 relative overflow-hidden group">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Outstanding Balance</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-black text-amber-400">{stats.outstandingFormatted}</div>
          <div className="text-[11px] text-muted-foreground mt-1">
            Pending collection from clients
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-elevated/70 border border-border/80 relative overflow-hidden group">
          <div className="flex items-center justify-between text-muted-foreground mb-1.5">
            <span className="text-xs font-medium">Overdue Invoices</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-black text-rose-400">{stats.overdueFormatted}</div>
          <div className="text-[11px] text-rose-400/80 mt-1 font-medium">
            {stats.overdueCount} invoices past due date
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface-elevated/40 p-3 rounded-2xl border border-border/80">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Invoice #, Customer, Company, or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface/80 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </form>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Tabs */}
          <div className="flex items-center bg-surface border border-border rounded-xl p-0.5 overflow-x-auto max-w-full">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors cursor-pointer",
                  statusFilter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort Menu */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="createdAt">Date Created</option>
            <option value="dueDate">Due Date</option>
            <option value="issueDate">Issue Date</option>
            <option value="total">Total Value</option>
            <option value="invoiceNumber">Invoice Number</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-border bg-surface-elevated/30 overflow-hidden">
        {isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-xs text-muted-foreground font-mono">Loading invoices...</p>
          </div>
        ) : error ? (
          <div className="py-16 text-center text-rose-400 text-xs">{error}</div>
        ) : invoices.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border mx-auto flex items-center justify-center text-muted-foreground">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No invoices found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              No invoices match your current filter criteria. Create a new invoice or adjust filters.
            </p>
            <Link
              href="/app/invoices/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" /> Create Invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-surface/50 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Issue / Due Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Balance Due</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-surface-elevated/80 transition-colors group cursor-pointer"
                    onClick={() => router.push(`/app/invoices/${inv.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-primary flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-muted-foreground" />
                      {inv.invoiceNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{inv.customerName}</div>
                      <div className="text-[11px] text-muted-foreground truncate max-w-[200px]">
                        {inv.customerCompany ? `${inv.customerCompany} • ` : ""}
                        {inv.customerEmail}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div>Issued: {new Date(inv.issueDate).toLocaleDateString("en-IN")}</div>
                      <div
                        className={cn(
                          "text-[11px]",
                          inv.status === "OVERDUE" ? "text-rose-400 font-bold" : "text-muted-foreground"
                        )}
                      >
                        Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-foreground">
                      {inv.totalFormatted}
                      <span className="block text-[10px] text-muted-foreground font-normal">
                        {inv.itemsCount} line items
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={cn(
                          "font-bold",
                          inv.balanceDue > 0 ? "text-amber-400" : "text-emerald-400"
                        )}
                      >
                        {inv.balanceDueFormatted}
                      </span>
                      {inv.amountPaid > 0 && (
                        <span className="block text-[10px] text-muted-foreground">
                          Paid: {inv.amountPaidFormatted}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>

                    <td className="py-3.5 px-4 text-muted-foreground truncate max-w-[120px]">
                      {inv.ownerName}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/app/invoices/${inv.id}`}
                          className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors"
                          title="View Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {inv.status === "DRAFT" && (
                          <button
                            onClick={() => handleSendInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer"
                            title="Send Invoice"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={() => handleDuplicateInvoice(inv.id)}
                          className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          title="Duplicate Invoice"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        {inv.status === "DRAFT" ? (
                          <button
                            onClick={() => handleDeleteInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : inv.status !== "CANCELLED" && inv.status !== "PAID" ? (
                          <button
                            onClick={() => handleCancelInvoice(inv.id)}
                            className="p-1.5 rounded-lg bg-surface border border-border text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                            title="Cancel Invoice"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground bg-surface/40">
            <div>
              Showing page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadInvoices(pagination.page - 1)}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadInvoices(pagination.page + 1)}
                className="px-2.5 py-1.5 rounded-lg bg-surface border border-border hover:bg-surface-elevated disabled:opacity-40 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
