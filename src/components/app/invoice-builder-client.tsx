"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Trash2,
  Building2,
  User,
  Briefcase,
  ArrowLeft,
  Save,
  Send,
  Loader2,
  Calculator,
  Calendar,
  Percent,
  AlertCircle,
  FileText,
} from "lucide-react";
import { createInvoiceAction } from "@/lib/actions/invoices-actions";
import { getContactsAction } from "@/lib/actions/contacts-actions";
import { getCompaniesAction } from "@/lib/actions/companies-actions";
import { getDealsAction } from "@/lib/actions/deals-actions";
import { getWorkspaceTeamAction } from "@/lib/actions/team-actions";
import { GST_TAX_RATES, InvoiceItemInput } from "@/lib/validations/invoices";
import { calculateInvoiceTotals } from "@/lib/services/invoice-service";
import { InvoiceStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface ContactOption {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  companyName?: string | null;
}

interface CompanyOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface DealOption {
  id: string;
  name: string;
  value: number;
  contactId?: string | null;
  companyId?: string | null;
}

export function InvoiceBuilderClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialContactId = searchParams.get("contactId") || "";
  const initialCompanyId = searchParams.get("companyId") || "";
  const initialDealId = searchParams.get("dealId") || "";

  // Data Options
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [deals, setDeals] = useState<DealOption[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

  // Customer Form State
  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerGst, setCustomerGst] = useState("");
  const [placeOfSupply, setPlaceOfSupply] = useState("Maharashtra (27)");

  // Links
  const [selectedContactId, setSelectedContactId] = useState(initialContactId);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const [selectedDealId, setSelectedDealId] = useState(initialDealId);
  const [ownerId, setOwnerId] = useState("");

  // Invoice Metadata
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split("T")[0];
  });
  const [currency, setCurrency] = useState("INR");

  // Line Items
  const [items, setItems] = useState<InvoiceItemInput[]>([
    { description: "Consulting & Implementation Services", quantity: 1, unitPrice: 50000, discount: 0, taxRate: 18 },
  ]);

  // Order Adjustments
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"FIXED" | "PERCENTAGE">("FIXED");
  const [taxRate, setTaxRate] = useState<number>(18);
  const [isGstSplit, setIsGstSplit] = useState<boolean>(true);

  // Notes & Terms
  const [notes, setNotes] = useState("Thank you for your business. Please remit payment via bank transfer or UPI.");
  const [terms, setTerms] = useState("Payment is due within 14 days of invoice date. 2% monthly late fee applies to overdue invoices.");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load CRM Entities for Selection
  useEffect(() => {
    Promise.all([
      getContactsAction({ limit: 100 }),
      getCompaniesAction({ limit: 100 }),
      getDealsAction({ limit: 100 }),
      getWorkspaceTeamAction(),
    ]).then(([conRes, compRes, dealRes, teamRes]) => {
      if (conRes.success && conRes.data?.contacts) {
        setContacts(
          conRes.data.contacts.map((c) => ({
            id: c.id,
            firstName: c.firstName,
            lastName: c.lastName,
            email: c.email,
            phone: c.phone,
            companyId: c.companyId,
            companyName: c.companyName,
          }))
        );
      }

      if (compRes.success && compRes.data?.companies) {
        setCompanies(
          compRes.data.companies.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            address: c.address,
          }))
        );
      }

      if (dealRes.success && dealRes.data?.deals) {
        setDeals(
          dealRes.data.deals.map((d) => ({
            id: d.id,
            name: d.name,
            value: Number(d.valueNumeric ?? (d as any).value ?? 0),
            contactId: d.contactId,
            companyId: d.companyId,
          }))
        );
      }

      if (teamRes.success && teamRes.data?.members) {
        setTeamMembers(teamRes.data.members.map((m) => ({ id: m.userId, name: m.name })));
      }
    });
  }, []);

  // Handle Contact selection
  const handleContactChange = (cId: string) => {
    setSelectedContactId(cId);
    const contact = contacts.find((c) => c.id === cId);
    if (contact) {
      setCustomerName([contact.firstName, contact.lastName].filter(Boolean).join(" "));
      if (contact.email) setCustomerEmail(contact.email);
      if (contact.phone) setCustomerPhone(contact.phone);
      if (contact.companyId) {
        setSelectedCompanyId(contact.companyId);
        const comp = companies.find((cp) => cp.id === contact.companyId);
        if (comp) {
          setCustomerCompany(comp.name);
          if (comp.address) setCustomerAddress(comp.address);
        }
      }
    }
  };

  // Handle Company selection
  const handleCompanyChange = (compId: string) => {
    setSelectedCompanyId(compId);
    const comp = companies.find((c) => c.id === compId);
    if (comp) {
      setCustomerCompany(comp.name);
      if (comp.email && !customerEmail) setCustomerEmail(comp.email);
      if (comp.phone && !customerPhone) setCustomerPhone(comp.phone);
      if (comp.address) setCustomerAddress(comp.address);
      if (!customerName) setCustomerName(comp.name);
    }
  };

  // Handle Deal selection
  const handleDealChange = (dId: string) => {
    setSelectedDealId(dId);
    const deal = deals.find((d) => d.id === dId);
    if (deal) {
      if (deal.contactId) handleContactChange(deal.contactId);
      if (deal.companyId) handleCompanyChange(deal.companyId);
      if (deal.value > 0) {
        setItems([
          {
            description: `${deal.name} - Contract Deliverables`,
            quantity: 1,
            unitPrice: deal.value,
            discount: 0,
            taxRate: 18,
          },
        ]);
      }
    }
  };

  // Line item handlers
  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: 1, unitPrice: 0, discount: 0, taxRate: taxRate },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceItemInput, val: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  // Live calculation preview
  const totals = useMemo(() => {
    return calculateInvoiceTotals(items, orderDiscount, discountType, taxRate, isGstSplit);
  }, [items, orderDiscount, discountType, taxRate, isGstSplit]);

  const handleSubmit = async (targetStatus: InvoiceStatus) => {
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!customerEmail.trim()) {
      setError("Customer email is required.");
      return;
    }
    if (items.length === 0 || items.some((it) => !it.description.trim())) {
      setError("All line items must have a description.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createInvoiceAction({
        customerName,
        customerCompany,
        customerEmail,
        customerPhone,
        customerAddress,
        customerGst,
        placeOfSupply,
        contactId: selectedContactId || null,
        companyId: selectedCompanyId || null,
        dealId: selectedDealId || null,
        ownerId: ownerId || null,
        issueDate,
        dueDate,
        currency,
        discount: orderDiscount,
        discountType,
        taxRate,
        isGstSplit,
        notes,
        terms,
        status: targetStatus,
        items,
      });

      if (res.success && res.data) {
        router.push(`/app/invoices/${res.data.id}`);
      } else {
        setError(res.error || "Failed to create invoice.");
      }
    } catch {
      setError("Unable to connect to server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
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
              <Receipt className="w-5 h-5" />
            </div>
            Create New Invoice
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Build a professional invoice, apply discounts, calculate GST, and link directly to CRM deals.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(InvoiceStatus.DRAFT)}
            className="px-4 py-2 rounded-xl bg-surface-elevated hover:bg-surface border border-border text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5 text-muted-foreground" />
            Save Draft
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit(InvoiceStatus.SENT)}
            className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold shadow-md shadow-primary/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Save & Finalize Invoice
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* CRM Quick Links Selector Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-surface-elevated/40 p-4 rounded-2xl border border-border/80">
        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Autofill from Contact
          </label>
          <select
            value={selectedContactId}
            onChange={(e) => handleContactChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">-- Select Contact --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.firstName} {c.lastName || ""} ({c.companyName || c.email || "Contact"})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Autofill from Company
          </label>
          <select
            value={selectedCompanyId}
            onChange={(e) => handleCompanyChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">-- Select Company --</option>
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-primary" /> Link to Deal
          </label>
          <select
            value={selectedDealId}
            onChange={(e) => handleDealChange(e.target.value)}
            className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            <option value="">-- Select Deal --</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} (₹{d.value.toLocaleString("en-IN")})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Snapshot & Invoice Terms Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Customer Information Card */}
        <div className="p-5 rounded-2xl bg-surface-elevated/30 border border-border/80 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2.5">
            <User className="w-4 h-4 text-primary" /> Billed Customer Information
          </h3>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Customer / Contact Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Customer Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="billing@customer.com"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Customer Phone
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="Acme Enterprises Pvt Ltd"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  GSTIN / Tax ID
                </label>
                <input
                  type="text"
                  value={customerGst}
                  onChange={(e) => setCustomerGst(e.target.value.toUpperCase())}
                  placeholder="27ABCDE1234F1Z5"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Billing Address
              </label>
              <textarea
                rows={2}
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Suite 400, Tech Park, Mumbai 400001"
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>
        </div>

        {/* Invoice Parameters Card */}
        <div className="p-5 rounded-2xl bg-surface-elevated/30 border border-border/80 space-y-4">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border/60 pb-2.5">
            <Calendar className="w-4 h-4 text-primary" /> Dates & Terms
          </h3>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Issue Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Due Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value="INR">INR (₹) - Indian Rupee</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Place of Supply (GST)
                </label>
                <input
                  type="text"
                  value={placeOfSupply}
                  onChange={(e) => setPlaceOfSupply(e.target.value)}
                  placeholder="e.g. Maharashtra (27)"
                  className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Assigned Sales Owner
              </label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="">Current User (Default)</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Line Items Table */}
      <div className="p-5 rounded-2xl bg-surface-elevated/30 border border-border/80 space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" /> Invoice Line Items
          </h3>

          <button
            type="button"
            onClick={handleAddItem}
            className="px-3 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold border border-primary/30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add Item
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                <th className="py-2.5 px-3 min-w-[260px]">Description</th>
                <th className="py-2.5 px-3 w-20">Qty</th>
                <th className="py-2.5 px-3 w-32">Unit Price (₹)</th>
                <th className="py-2.5 px-3 w-24">Disc %</th>
                <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs">
              {items.map((item, idx) => {
                const lineTotal = Math.round(
                  item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)
                );

                return (
                  <tr key={idx} className="group">
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        placeholder="Product or service description"
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        required
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)
                        }
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-center font-mono"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={item.unitPrice}
                        onChange={(e) =>
                          handleItemChange(idx, "unitPrice", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-right"
                      />
                    </td>
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount || 0}
                        onChange={(e) =>
                          handleItemChange(idx, "discount", parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-center"
                      />
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-right text-foreground">
                      ₹{lineTotal.toLocaleString("en-IN")}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation & Summary Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
          {/* Notes & Terms */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Client Notes
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes visible to customer..."
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Payment Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Payment terms..."
                className="w-full px-3 py-2 bg-surface border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </div>

          {/* Subtotal, Discount, Tax, Grand Total */}
          <div className="p-4 rounded-xl bg-surface border border-border space-y-3 text-xs">
            <div className="flex items-center justify-between text-muted-foreground">
              <span>Line Items Subtotal</span>
              <span className="font-mono font-bold text-foreground">
                ₹{totals.subtotal.toLocaleString("en-IN")}
              </span>
            </div>

            {/* Discount Control */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5 text-primary" /> Order Discount
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(parseFloat(e.target.value) || 0)}
                  className="w-20 px-2 py-1 bg-surface-elevated border border-border rounded-lg text-xs font-mono text-right"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-2 py-1 bg-surface-elevated border border-border rounded-lg text-xs cursor-pointer"
                >
                  <option value="FIXED">₹ (Fixed)</option>
                  <option value="PERCENTAGE">% (Percent)</option>
                </select>
                <span className="font-mono text-rose-400 font-bold ml-2">
                  -₹{totals.discountAmount.toLocaleString("en-IN")}
                </span>
              </div>
            </div>

            {/* GST Tax Control */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">GST Tax Rate</span>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="px-2 py-1 bg-surface-elevated border border-border rounded-lg text-xs cursor-pointer font-mono"
                >
                  {GST_TAX_RATES.map((rate) => (
                    <option key={rate} value={rate}>
                      {rate}% GST
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={isGstSplit}
                  onChange={(e) => setIsGstSplit(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                Intrastate (CGST+SGST)
              </label>
            </div>

            {/* Tax Split Breakdown */}
            {totals.taxAmount > 0 && (
              <div className="space-y-1.5 pl-4 text-[11px] text-muted-foreground border-l-2 border-primary/30">
                {isGstSplit ? (
                  <>
                    <div className="flex justify-between">
                      <span>CGST ({(taxRate / 2).toFixed(1)}%)</span>
                      <span className="font-mono">₹{totals.cgst.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SGST ({(taxRate / 2).toFixed(1)}%)</span>
                      <span className="font-mono">₹{totals.sgst.toLocaleString("en-IN")}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>IGST ({taxRate}%)</span>
                    <span className="font-mono">₹{totals.igst.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            )}

            {/* Grand Total */}
            <div className="flex items-center justify-between pt-3 border-t border-border/80 text-sm font-black text-foreground">
              <span>Grand Total</span>
              <span className="text-base text-primary font-mono font-black">
                ₹{totals.total.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
