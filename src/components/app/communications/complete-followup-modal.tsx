"use client";

import * as React from "react";
import { CheckCircle2, CalendarPlus, X, AlertCircle, Sparkles } from "lucide-react";
import { FollowUpType } from "@/lib/validations/communications";
import { completeFollowUpAction } from "@/lib/actions/followups-actions";

interface CompleteFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  followUp: {
    id: string;
    title: string;
    type: FollowUpType;
  } | null;
}

const COMMON_OUTCOMES = [
  "Spoke with Client - Interested",
  "Sent Revised Proposal",
  "Left Voicemail / Message",
  "Meeting Successfully Held",
  "Client Requested Callback Next Week",
  "Price Negotiation In Progress",
];

export function CompleteFollowUpModal({
  isOpen,
  onClose,
  onSuccess,
  followUp,
}: CompleteFollowUpModalProps) {
  const [outcome, setOutcome] = React.useState("Spoke with Client - Interested");
  const [customOutcome, setCustomOutcome] = React.useState("");
  const [completionNotes, setCompletionNotes] = React.useState("");
  const [createNext, setCreateNext] = React.useState(false);
  const [nextTitle, setNextTitle] = React.useState("");
  const [nextType, setNextType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [nextDueDays, setNextDueDays] = React.useState(3);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  if (!isOpen || !followUp) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalOutcome = customOutcome.trim() || outcome;
    if (!finalOutcome) {
      setError("Please select or enter an outcome");
      return;
    }

    setLoading(true);
    setError(null);

    let nextDueDate: Date | undefined;
    if (createNext) {
      nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + nextDueDays);
      nextDueDate.setHours(10, 0, 0, 0);
    }

    const res = await completeFollowUpAction({
      id: followUp!.id,
      outcome: finalOutcome,
      completionNotes: completionNotes.trim() || undefined,
      createNextFollowUp: createNext,
      nextFollowUpTitle: nextTitle || (createNext ? `Follow-up after: ${finalOutcome}` : undefined),
      nextFollowUpType: nextType,
      nextFollowUpDueAt: nextDueDate?.toISOString(),
    });

    setLoading(false);

    if (res.success) {
      setCompletionNotes("");
      setCustomOutcome("");
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "Failed to complete follow-up");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Complete Follow-up</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[260px]">
                {followUp.title}
              </p>
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

          {/* Outcome Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Follow-up Outcome <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_OUTCOMES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    setOutcome(item);
                    setCustomOutcome("");
                  }}
                  className={`text-left p-2 rounded-xl border text-xs font-medium transition-all ${
                    outcome === item && !customOutcome
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>

            {/* Custom Outcome input */}
            <input
              type="text"
              placeholder="Or write custom outcome..."
              value={customOutcome}
              onChange={(e) => setCustomOutcome(e.target.value)}
              className="w-full mt-2 rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Completion Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Discussion Summary / Next Action Plan
            </label>
            <textarea
              rows={3}
              placeholder="Briefly describe what was decided or learned during this touchpoint..."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Optional Next Step Follow-up */}
          <div className="rounded-xl border border-border/80 bg-surface-elevated/60 p-3.5 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createNext}
                onChange={(e) => setCreateNext(e.target.checked)}
                className="rounded border-border bg-surface text-emerald-500 focus:ring-emerald-500 h-4 w-4"
              />
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarPlus className="h-3.5 w-3.5 text-emerald-400" />
                Schedule immediate next follow-up
              </span>
            </label>

            {createNext && (
              <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Due In</label>
                  <select
                    value={nextDueDays}
                    onChange={(e) => setNextDueDays(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                  >
                    <option value={1}>Tomorrow (+1 day)</option>
                    <option value={2}>In 2 Days</option>
                    <option value={3}>In 3 Days</option>
                    <option value={5}>In 5 Days</option>
                    <option value={7}>Next Week (7 days)</option>
                    <option value={14}>In 2 Weeks (14 days)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] text-muted-foreground">Next Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Confirm payment settlement"
                    value={nextTitle}
                    onChange={(e) => setNextTitle(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-foreground"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border/60">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-surface-hover"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {loading ? "Recording..." : "Mark Completed"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
