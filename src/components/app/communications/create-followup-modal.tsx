"use client";

import * as React from "react";
import { CalendarClock, Phone, Mail, Calendar, CheckSquare, MessageCircle, X, AlertCircle } from "lucide-react";
import { FollowUpType } from "@/lib/validations/communications";
import { createFollowUpAction } from "@/lib/actions/followups-actions";

interface CreateFollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialLeadId?: string;
  initialDealId?: string;
  leads?: Array<{ id: string; name: string }>;
  deals?: Array<{ id: string; name: string }>;
}

export function CreateFollowUpModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialDealId,
  leads = [],
  deals = [],
}: CreateFollowUpModalProps) {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<FollowUpType>(FollowUpType.CALL);
  const [dueDateStr, setDueDateStr] = React.useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [notes, setNotes] = React.useState("");
  const [selectedLeadId, setSelectedLeadId] = React.useState(initialLeadId || "");
  const [selectedDealId, setSelectedDealId] = React.useState(initialDealId || "");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (initialLeadId) setSelectedLeadId(initialLeadId);
    if (initialDealId) setSelectedDealId(initialDealId);
  }, [initialLeadId, initialDealId]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide follow-up title");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await createFollowUpAction({
      title: title.trim(),
      type,
      dueAt: new Date(dueDateStr).toISOString(),
      notes: notes.trim() || undefined,
      leadId: selectedLeadId || undefined,
      dealId: selectedDealId || undefined,
    });

    setLoading(false);

    if (res.success) {
      setTitle("");
      setNotes("");
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "Failed to create follow-up");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CalendarClock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Schedule Follow-up</h2>
              <p className="text-xs text-muted-foreground">Keep sales momentum with timed task reminders</p>
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

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Follow-up Title <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Call client to review revised quotation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Channel Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Follow-up Channel
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { key: FollowUpType.CALL, label: "Call", icon: Phone },
                { key: FollowUpType.EMAIL, label: "Email", icon: Mail },
                { key: FollowUpType.MEETING, label: "Meeting", icon: Calendar },
                { key: FollowUpType.TASK, label: "Task", icon: CheckSquare },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setType(item.key)}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border text-xs font-semibold transition-all ${
                      type === item.key
                        ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10"
                        : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Due Date & Time <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="datetime-local"
              value={dueDateStr}
              onChange={(e) => setDueDateStr(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {/* Associated Entity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Associated Lead
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
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

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Context Notes
            </label>
            <textarea
              rows={3}
              placeholder="What needs to be discussed or prepared before reaching out?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none"
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
              {loading ? "Scheduling..." : "Save Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
