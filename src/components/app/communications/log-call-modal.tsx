"use client";

import * as React from "react";
import { Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Clock, CheckCircle2, X } from "lucide-react";
import { CallOutcome, CommunicationDirection } from "@/lib/validations/communications";
import { logCallAction } from "@/lib/actions/communications-actions";

interface EntityOption {
  id: string;
  name: string;
  type: "lead" | "contact" | "deal" | "company";
}

interface LogCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialLeadId?: string;
  initialContactId?: string;
  initialDealId?: string;
  initialPhone?: string;
  leads?: Array<{ id: string; name: string; phone?: string | null }>;
  deals?: Array<{ id: string; name: string }>;
  contacts?: Array<{ id: string; name: string; phone?: string | null }>;
}

export function LogCallModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialContactId,
  initialDealId,
  initialPhone,
  leads = [],
  deals = [],
  contacts = [],
}: LogCallModalProps) {
  const [direction, setDirection] = React.useState<CommunicationDirection>(
    CommunicationDirection.OUTBOUND
  );
  const [callOutcome, setCallOutcome] = React.useState<CallOutcome>(CallOutcome.CONNECTED);
  const [durationMinutes, setDurationMinutes] = React.useState<number>(5);
  const [recipientPhone, setRecipientPhone] = React.useState<string>(initialPhone || "");
  const [selectedLeadId, setSelectedLeadId] = React.useState<string>(initialLeadId || "");
  const [selectedContactId, setSelectedContactId] = React.useState<string>(initialContactId || "");
  const [selectedDealId, setSelectedDealId] = React.useState<string>(initialDealId || "");
  const [content, setContent] = React.useState<string>("");
  const [createFollowUp, setCreateFollowUp] = React.useState<boolean>(false);
  const [followUpDueDays, setFollowUpDueDays] = React.useState<number>(2);
  const [followUpTitle, setFollowUpTitle] = React.useState<string>("");
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialLeadId) setSelectedLeadId(initialLeadId);
    if (initialContactId) setSelectedContactId(initialContactId);
    if (initialDealId) setSelectedDealId(initialDealId);
    if (initialPhone) setRecipientPhone(initialPhone);
  }, [initialLeadId, initialContactId, initialDealId, initialPhone]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) {
      setError("Please provide call summary notes");
      return;
    }

    setLoading(true);
    setError(null);

    let followUpDate: Date | undefined;
    if (createFollowUp) {
      followUpDate = new Date();
      followUpDate.setDate(followUpDate.getDate() + followUpDueDays);
      followUpDate.setHours(11, 0, 0, 0);
    }

    const res = await logCallAction({
      direction,
      callOutcome,
      durationSeconds: durationMinutes * 60,
      content: content.trim(),
      recipientPhone: recipientPhone || undefined,
      leadId: selectedLeadId || undefined,
      contactId: selectedContactId || undefined,
      dealId: selectedDealId || undefined,
      createFollowUp,
      followUpDueAt: followUpDate?.toISOString(),
      followUpTitle: followUpTitle || (createFollowUp ? `Follow-up on ${callOutcome.toLowerCase()} call` : undefined),
    });

    setLoading(false);

    if (res.success) {
      setContent("");
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "Failed to log call");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <PhoneCall className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Log Sales Call</h2>
              <p className="text-xs text-muted-foreground">Record call summary, outcome & automatic follow-up</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Direction Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Call Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection(CommunicationDirection.OUTBOUND)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  direction === CommunicationDirection.OUTBOUND
                    ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <PhoneOutgoing className="h-3.5 w-3.5" />
                Outbound Call
              </button>
              <button
                type="button"
                onClick={() => setDirection(CommunicationDirection.INBOUND)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  direction === CommunicationDirection.INBOUND
                    ? "border-blue-500 bg-blue-500/10 text-blue-400 shadow-sm shadow-blue-500/10"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <PhoneIncoming className="h-3.5 w-3.5" />
                Inbound Call
              </button>
            </div>
          </div>

          {/* Outcome & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Call Outcome
              </label>
              <select
                value={callOutcome}
                onChange={(e) => setCallOutcome(e.target.value as CallOutcome)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value={CallOutcome.CONNECTED}>Connected / Spoke</option>
                <option value={CallOutcome.NO_ANSWER}>No Answer / Ringing</option>
                <option value={CallOutcome.BUSY}>Busy Line</option>
                <option value={CallOutcome.CALLBACK_REQUESTED}>Callback Requested</option>
                <option value={CallOutcome.WRONG_NUMBER}>Wrong Number</option>
                <option value={CallOutcome.OTHER}>Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duration (Minutes)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="480"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
                  className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
                <span className="absolute right-3 top-2 text-[10px] text-muted-foreground">mins</span>
              </div>
            </div>
          </div>

          {/* Link Entity (Lead / Deal / Contact) */}
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

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Call Summary Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Call Notes & Key Takeaways <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="Discussed requirements, client requested proposal by Thursday, pricing objections addressed..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Create Automatic Follow-up */}
          <div className="rounded-xl border border-border/80 bg-surface-elevated/60 p-3.5 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createFollowUp}
                onChange={(e) => setCreateFollowUp(e.target.checked)}
                className="rounded border-border bg-surface text-primary focus:ring-primary h-4 w-4"
              />
              <span className="text-xs font-semibold text-foreground">
                Schedule follow-up reminder for this call
              </span>
            </label>

            {createFollowUp && (
              <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Due In</label>
                  <select
                    value={followUpDueDays}
                    onChange={(e) => setFollowUpDueDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value={1}>Tomorrow</option>
                    <option value={2}>In 2 Days</option>
                    <option value={3}>In 3 Days</option>
                    <option value={7}>Next Week (7 days)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Follow-up Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Share quotation & confirm"
                    value={followUpTitle}
                    onChange={(e) => setFollowUpTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Action */}
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all disabled:opacity-50"
            >
              {loading ? "Saving Call..." : "Log Call"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
