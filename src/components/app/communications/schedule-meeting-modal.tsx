"use client";

import * as React from "react";
import { Calendar, Video, MapPin, Link2, Clock, X, Users2 } from "lucide-react";
import { scheduleMeetingAction } from "@/lib/actions/communications-actions";

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialLeadId?: string;
  initialDealId?: string;
  leads?: Array<{ id: string; name: string }>;
  deals?: Array<{ id: string; name: string }>;
}

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  onSuccess,
  initialLeadId,
  initialDealId,
  leads = [],
  deals = [],
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = React.useState("");
  const [startDateStr, setStartDateStr] = React.useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);
    // Format YYYY-MM-DDTHH:mm for datetime-local input
    return tomorrow.toISOString().slice(0, 16);
  });
  const [durationMinutes, setDurationMinutes] = React.useState<number>(30);
  const [meetingLocation, setMeetingLocation] = React.useState("");
  const [meetingLink, setMeetingLink] = React.useState("");
  const [selectedLeadId, setSelectedLeadId] = React.useState(initialLeadId || "");
  const [selectedDealId, setSelectedDealId] = React.useState(initialDealId || "");
  const [content, setContent] = React.useState("");
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
      setError("Please provide a meeting title");
      return;
    }

    setLoading(true);
    setError(null);

    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const res = await scheduleMeetingAction({
      title: title.trim(),
      meetingStart: startDate.toISOString(),
      meetingEnd: endDate.toISOString(),
      meetingLocation: meetingLocation || undefined,
      meetingLink: meetingLink || undefined,
      content: content.trim(),
      leadId: selectedLeadId || undefined,
      dealId: selectedDealId || undefined,
    });

    setLoading(false);

    if (res.success) {
      setTitle("");
      setContent("");
      setMeetingLink("");
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setError(res.error || "Failed to schedule meeting");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Schedule Meeting</h2>
              <p className="text-xs text-muted-foreground">Add calendar invite & automated follow-up</p>
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
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Meeting Title <span className="text-rose-400">*</span>
            </label>
            <input
              required
              type="text"
              placeholder="e.g. Product Demo & Architecture Walkthrough"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
            />
          </div>

          {/* Start Date-Time & Duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Date & Start Time <span className="text-rose-400">*</span>
              </label>
              <input
                required
                type="datetime-local"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Duration
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>1 Hour</option>
                <option value={90}>1.5 Hours</option>
              </select>
            </div>
          </div>

          {/* Virtual Link & Physical Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Video className="h-3 w-3 text-purple-400" />
                Meeting Link (URL)
              </label>
              <input
                type="url"
                placeholder="https://meet.google.com/xyz-abc"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <MapPin className="h-3 w-3 text-purple-400" />
                Physical Location
              </label>
              <input
                type="text"
                placeholder="e.g. Headquarters Conf Room A"
                value={meetingLocation}
                onChange={(e) => setMeetingLocation(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Link Entity (Lead / Deal) */}
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
                <option value="">-- None / Internal --</option>
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

          {/* Meeting Agenda / Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agenda & Preparation Notes
            </label>
            <textarea
              rows={3}
              placeholder="1. Introduction & Overview&#10;2. Security & Compliance Review&#10;3. Next Steps & SLA"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-elevated px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none resize-none"
            />
          </div>

          {/* Action Buttons */}
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
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition-all disabled:opacity-50"
            >
              {loading ? "Scheduling..." : "Schedule Meeting"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
