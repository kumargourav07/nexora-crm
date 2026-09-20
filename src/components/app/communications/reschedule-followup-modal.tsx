"use client";

import * as React from "react";
import { Clock, Calendar, X, AlertCircle } from "lucide-react";
import { rescheduleFollowUpAction } from "@/lib/actions/followups-actions";

interface RescheduleFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  followUp: {
    id: string;
    title: string;
    dueAt: string | Date;
  } | null;
}

export function RescheduleFollowUpModal({
  isOpen,
  onClose,
  onSuccess,
  followUp,
}: RescheduleFollowUpModalProps) {
  const [dueDateStr, setDueDateStr] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (followUp?.dueAt) {
      const d = new Date(followUp.dueAt);
      setDueDateStr(d.toISOString().slice(0, 16));
    }
  }, [followUp]);

  if (!isOpen || !followUp) return null;

  function setQuickDays(daysToAdd: number) {
    const d = new Date();
    d.setDate(d.getDate() + daysToAdd);
    d.setHours(11, 0, 0, 0);
    setDueDateStr(d.toISOString().slice(0, 16));
  }

  function setNextMonday() {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? 1 : 8 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(10, 0, 0, 0);
    setDueDateStr(d.toISOString().slice(0, 16));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dueDateStr) {
      setError("Please select a new due date and time");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await rescheduleFollowUpAction({
      id: followUp!.id,
      dueAt: new Date(dueDateStr).toISOString(),
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      setNotes("");
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "Failed to reschedule follow-up");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Reschedule Follow-up</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Reschedule Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Shortcuts
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setQuickDays(1)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-xs font-semibold text-foreground transition-colors"
              >
                +1 Day (Tmrw)
              </button>
              <button
                type="button"
                onClick={() => setQuickDays(2)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-xs font-semibold text-foreground transition-colors"
              >
                +2 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickDays(3)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-xs font-semibold text-foreground transition-colors"
              >
                +3 Days
              </button>
              <button
                type="button"
                onClick={() => setNextMonday()}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-xs font-semibold text-foreground transition-colors col-span-2"
              >
                Next Monday
              </button>
              <button
                type="button"
                onClick={() => setQuickDays(7)}
                className="px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-xs font-semibold text-foreground transition-colors"
              >
                +1 Week
              </button>
            </div>
          </div>

          {/* New Due Date-Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Target Date & Time <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="datetime-local"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Reason / Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Reschedule Reason (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Client requested callback next Tuesday after internal budget review..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-foreground focus:border-primary focus:outline-none resize-none"
            />
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
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/30 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Confirm Reschedule"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
