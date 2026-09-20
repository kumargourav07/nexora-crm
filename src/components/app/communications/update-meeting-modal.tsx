"use client";

import * as React from "react";
import { CheckCircle, XCircle, UserX, Clock, X, AlertCircle } from "lucide-react";
import { MeetingStatus } from "@/lib/validations/communications";
import { updateMeetingStatusAction } from "@/lib/actions/communications-actions";

interface UpdateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  meeting: {
    id: string;
    subject?: string | null;
    meetingStatus?: MeetingStatus | null;
  } | null;
}

export function UpdateMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  meeting,
}: UpdateMeetingModalProps) {
  const [meetingStatus, setMeetingStatus] = React.useState<MeetingStatus>(
    meeting?.meetingStatus || MeetingStatus.COMPLETED
  );
  const [notes, setNotes] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (meeting?.meetingStatus) {
      setMeetingStatus(meeting.meetingStatus);
    }
  }, [meeting]);

  if (!isOpen || !meeting) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await updateMeetingStatusAction({
      id: meeting!.id,
      meetingStatus,
      notes: notes.trim() || undefined,
    });

    setLoading(false);

    if (res.success) {
      setNotes("");
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "Failed to update meeting status");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Update Meeting Status</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                {meeting.subject || "Meeting"}
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

          {/* Status Selection Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Meeting Outcome
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMeetingStatus(MeetingStatus.COMPLETED)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  meetingStatus === MeetingStatus.COMPLETED
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/10"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                Completed
              </button>
              <button
                type="button"
                onClick={() => setMeetingStatus(MeetingStatus.NO_SHOW)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  meetingStatus === MeetingStatus.NO_SHOW
                    ? "border-amber-500 bg-amber-500/10 text-amber-400 shadow-sm shadow-amber-500/10"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <UserX className="h-4 w-4" />
                No Show
              </button>
              <button
                type="button"
                onClick={() => setMeetingStatus(MeetingStatus.CANCELLED)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  meetingStatus === MeetingStatus.CANCELLED
                    ? "border-rose-500 bg-rose-500/10 text-rose-400 shadow-sm shadow-rose-500/10"
                    : "border-border bg-surface-elevated text-muted-foreground hover:text-foreground"
                }`}
              >
                <XCircle className="h-4 w-4" />
                Cancelled
              </button>
            </div>
          </div>

          {/* Meeting Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Session Notes / Outcome Summary
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Discussed proposal, agreed on timeline, scheduled followup call..."
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {loading ? "Updating..." : "Save Status"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
