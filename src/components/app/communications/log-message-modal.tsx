"use client";

import * as React from "react";
import { MessageSquare, MessageCircle, FileText, Phone, Send, X, AlertCircle, Info } from "lucide-react";
import { CommunicationType, CommunicationDirection } from "@/lib/validations/communications";
import { logMessageAction } from "@/lib/actions/communications-actions";

interface LogMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialType?: CommunicationType;
  initialLeadId?: string;
  initialDealId?: string;
  initialPhone?: string;
  leads?: Array<{ id: string; name: string; phone?: string | null }>;
  deals?: Array<{ id: string; name: string }>;
}

export function LogMessageModal({
  isOpen,
  onClose,
  onSuccess,
  initialType = CommunicationType.WHATSAPP,
  initialLeadId,
  initialDealId,
  initialPhone,
  leads = [],
  deals = [],
}: LogMessageModalProps) {
  const [type, setType] = React.useState<CommunicationType>(initialType);
  const [direction, setDirection] = React.useState<CommunicationDirection>(
    CommunicationDirection.OUTBOUND
  );
  const [recipientPhone, setRecipientPhone] = React.useState(initialPhone || "");
  const [subject, setSubject] = React.useState("");
  const [content, setContent] = React.useState("");
  const [selectedLeadId, setSelectedLeadId] = React.useState(initialLeadId || "");
  const [selectedDealId, setSelectedDealId] = React.useState(initialDealId || "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [providerNotice, setProviderNotice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialType) setType(initialType);
    if (initialLeadId) setSelectedLeadId(initialLeadId);
    if (initialDealId) setSelectedDealId(initialDealId);
    if (initialPhone) setRecipientPhone(initialPhone);
  }, [initialType, initialLeadId, initialDealId, initialPhone]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please provide content or message notes");
      return;
    }

    setLoading(true);
    setError(null);
    setProviderNotice(null);

    const res = await logMessageAction({
      type,
      direction,
      content: content.trim(),
      subject: subject.trim() || undefined,
      recipientPhone: recipientPhone.trim() || undefined,
      leadId: selectedLeadId || undefined,
      dealId: selectedDealId || undefined,
    });

    setLoading(false);

    if (res.success) {
      if (res.providerNotice) {
        setProviderNotice(res.providerNotice);
      }
      setTimeout(() => {
        setContent("");
        setSubject("");
        onClose();
        if (onSuccess) onSuccess();
      }, res.providerNotice ? 2000 : 400);
    } else {
      setError(res.error || "Failed to log interaction");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Log Message / Note</h2>
              <p className="text-xs text-muted-foreground">WhatsApp, SMS, or Internal Interaction Note</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {providerNotice && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
              <Info className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{providerNotice}</span>
            </div>
          )}

          {/* Type Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Channel Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType(CommunicationType.WHATSAPP)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === CommunicationType.WHATSAPP
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp
              </button>
              <button
                type="button"
                onClick={() => setType(CommunicationType.SMS)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === CommunicationType.SMS
                    ? "border-sky-500 bg-sky-500/10 text-sky-400"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="h-3.5 w-3.5" />
                SMS
              </button>
              <button
                type="button"
                onClick={() => setType(CommunicationType.NOTE)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-semibold transition-all ${
                  type === CommunicationType.NOTE
                    ? "border-amber-500 bg-amber-500/10 text-amber-400"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                CRM Note
              </button>
            </div>
          </div>

          {/* Phone Number (if WhatsApp or SMS) */}
          {type !== CommunicationType.NOTE && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recipient Phone
              </label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}

          {/* Associated Lead / Deal */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Associated Lead
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => {
                  setSelectedLeadId(e.target.value);
                  const found = leads.find((l) => l.id === e.target.value);
                  if (found?.phone && !recipientPhone) setRecipientPhone(found.phone);
                }}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- None / General --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Associated Deal
              </label>
              <select
                value={selectedDealId}
                onChange={(e) => setSelectedDealId(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">-- None / General --</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject / Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {type === CommunicationType.NOTE ? "Note Title" : "Topic / Subject"}
            </label>
            <input
              type="text"
              placeholder={type === CommunicationType.NOTE ? "e.g. Key client decision criteria" : "e.g. WhatsApp follow-up"}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Content / Body */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {type === CommunicationType.NOTE ? "Note Content" : "Message Content"} <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={4}
              placeholder={type === CommunicationType.NOTE ? "Enter detailed internal discussion notes..." : "Enter message text dispatched to customer..."}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/30 transition-all disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              {loading ? "Recording..." : `Log ${type}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
