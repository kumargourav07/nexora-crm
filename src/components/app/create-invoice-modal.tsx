"use client";

import React, { useState, useTransition, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Receipt, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { createInvoiceAction } from "@/lib/actions/invoices-actions";
import { InvoiceStatus } from "@prisma/client";

export interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDealId?: string;
  initialContactId?: string;
  initialCompanyId?: string;
  initialCustomerName?: string;
  initialCustomerCompany?: string;
  initialCustomerEmail?: string;
  initialAmount?: number;
  initialDescription?: string;
}

interface ItemRow {
  description: string;
  quantity: number;
  unitPrice: number;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  initialDealId,
  initialContactId,
  initialCompanyId,
  initialCustomerName,
  initialCustomerCompany,
  initialCustomerEmail,
  initialAmount,
  initialDescription,
}: CreateInvoiceModalProps) {
  const [customerName, setCustomerName] = useState(initialCustomerName || "");
  const [customerCompany, setCustomerCompany] = useState(initialCustomerCompany || "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomerEmail || "");
  const [customerGst, setCustomerGst] = useState("");
  const [dueDate, setDueDate] = useState("2026-05-30");
  const [status, setStatus] = useState<InvoiceStatus>(InvoiceStatus.DRAFT);
  const [items, setItems] = useState<ItemRow[]>([
    {
      description: initialDescription || "NEXORA CRM Enterprise License (Annual)",
      quantity: 1,
      unitPrice: initialAmount || 240000,
    },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) {
      if (initialCustomerName) setCustomerName(initialCustomerName);
      if (initialCustomerCompany) setCustomerCompany(initialCustomerCompany);
      if (initialCustomerEmail) setCustomerEmail(initialCustomerEmail);
      if (initialAmount) {
        setItems([
          {
            description: initialDescription || "Professional CRM Solution Implementation",
            quantity: 1,
            unitPrice: initialAmount,
          },
        ]);
      }
      const d = new Date();
      d.setDate(d.getDate() + 30);
      setDueDate(d.toISOString().split("T")[0]);
    }
  }, [isOpen, initialCustomerName, initialCustomerCompany, initialCustomerEmail, initialAmount, initialDescription]);

  if (!isOpen) return null;

  const handleItemChange = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: typeof value === "string" ? (field === "description" ? value : Number(value) || 0) : value,
      };
      return updated;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { description: "Additional Professional Services", quantity: 1, unitPrice: 25000 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (items.some((i) => !i.description.trim() || i.quantity <= 0 || i.unitPrice <= 0)) {
      setError("Please ensure all line items have valid descriptions, quantities, and prices.");
      return;
    }

    startTransition(async () => {
      const res = await createInvoiceAction({
        customerName: customerName || "Customer",
        customerCompany: customerCompany || undefined,
        customerEmail: customerEmail || "billing@client.com",
        customerGst: customerGst || undefined,
        contactId: initialContactId || undefined,
        companyId: initialCompanyId || undefined,
        dealId: initialDealId || undefined,
        status,
        issueDate: new Date().toISOString().split("T")[0],
        dueDate,
        currency: "INR",
        discount: 0,
        discountType: "FIXED",
        taxRate: 18,
        isGstSplit: true,
        items: items.map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxRate: 18,
          discount: 0,
        })),
      });

      if (!res.success) {
        setError(res.error || "Failed to generate invoice.");
      } else {
        onSuccess();
        onClose();
      }
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-2xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/80 bg-surface-elevated">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Create Invoice</h3>
                <p className="text-xs text-muted-foreground">
                  {initialDealId ? "Linked to Opportunity" : "Issue GST-compliant commercial invoice"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-xs text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Customer Company
                </label>
                <input
                  type="text"
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  placeholder="e.g. Apex Global Ltd"
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Customer Email *
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="e.g. accounts@client.com"
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Line Items</span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Line Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2.5 rounded-xl border border-border bg-surface-elevated"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Item description..."
                      value={item.description}
                      onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                      className="flex-1 w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground focus:outline-none"
                    />
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-16 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground text-center focus:outline-none"
                      />
                      <input
                        type="number"
                        min="0"
                        required
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                        className="w-24 rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground font-mono text-right focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Summary */}
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border space-y-1 text-xs font-mono">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>GST (18%):</span>
                <span>₹{tax.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-foreground pt-1 border-t border-border">
                <span>Total Amount:</span>
                <span className="text-primary">₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-surface-elevated cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Invoice...</span>
                  </>
                ) : (
                  <span>Create Invoice</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
