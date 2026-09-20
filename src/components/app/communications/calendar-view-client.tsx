"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  Mail,
  CheckSquare,
  CheckCircle2,
  CalendarDays,
  User,
  Briefcase,
  Building,
  ArrowLeft,
  X,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import {
  CalendarEvent,
  getCalendarEventsAction,
} from "@/lib/actions/followups-actions";
import { CreateFollowUpModal } from "./create-followup-modal";
import { ScheduleMeetingModal } from "./schedule-meeting-modal";
import { CompleteFollowUpModal } from "./complete-followup-modal";
import { RescheduleFollowUpModal } from "./reschedule-followup-modal";

interface CalendarViewClientProps {
  initialEvents: CalendarEvent[];
  leads?: Array<{ id: string; name: string }>;
  deals?: Array<{ id: string; name: string }>;
}

type ViewMode = "MONTH" | "WEEK" | "DAY" | "AGENDA";

export function CalendarViewClient({
  initialEvents,
  leads = [],
  deals = [],
}: CalendarViewClientProps) {
  const [currentDate, setCurrentDate] = React.useState<Date>(new Date());
  const [viewMode, setViewMode] = React.useState<ViewMode>("MONTH");
  const [events, setEvents] = React.useState<CalendarEvent[]>(initialEvents);
  const [loading, setLoading] = React.useState(false);

  // Selected event for detail drawer
  const [selectedEvent, setSelectedEvent] = React.useState<CalendarEvent | null>(null);

  // Modals
  const [isCreateFollowUpOpen, setIsCreateFollowUpOpen] = React.useState(false);
  const [isScheduleMeetingOpen, setIsScheduleMeetingOpen] = React.useState(false);
  const [completeFollowUpTarget, setCompleteFollowUpTarget] = React.useState<any | null>(null);
  const [rescheduleFollowUpTarget, setRescheduleFollowUpTarget] = React.useState<any | null>(null);

  // Compute view date range
  const dateRange = React.useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === "MONTH") {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      // Pad to full weeks
      const start = new Date(firstDay);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); // Monday start
      const end = new Date(lastDay);
      end.setDate(end.getDate() + (7 - end.getDay()));
      return { start, end };
    } else if (viewMode === "WEEK") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = (day === 0 ? -6 : 1 - day);
      start.setDate(start.getDate() + diff);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    } else {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
  }, [currentDate, viewMode]);

  const fetchEvents = React.useCallback(async () => {
    setLoading(true);
    const res = await getCalendarEventsAction(
      dateRange.start.toISOString(),
      dateRange.end.toISOString()
    );
    if (res.success && res.data) {
      setEvents(res.data);
    }
    setLoading(false);
  }, [dateRange]);

  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Navigation helpers
  function navigatePrev() {
    const d = new Date(currentDate);
    if (viewMode === "MONTH") d.setMonth(d.getMonth() - 1);
    else if (viewMode === "WEEK") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  }

  function navigateNext() {
    const d = new Date(currentDate);
    if (viewMode === "MONTH") d.setMonth(d.getMonth() + 1);
    else if (viewMode === "WEEK") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  }

  function navigateToday() {
    setCurrentDate(new Date());
  }

  // Month grid day list
  const monthDays = React.useMemo(() => {
    const days: Date[] = [];
    const cur = new Date(dateRange.start);
    while (cur <= dateRange.end) {
      days.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [dateRange]);

  const monthName = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/app/follow-ups"
              className="p-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight sm:text-2xl">
              Sales Schedule & Calendar
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 ml-8">
            Unified view of meetings, scheduled calls, touchpoints & follow-up deadlines
          </p>
        </div>

        {/* Quick Event CTAs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleMeetingOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all cursor-pointer"
          >
            <Video className="h-3.5 w-3.5" />
            Schedule Meeting
          </button>
          <button
            onClick={() => setIsCreateFollowUpOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Follow-up
          </button>
        </div>
      </div>

      {/* Calendar Control Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-3 rounded-2xl border border-border bg-surface-elevated shadow-xs">
        {/* Month Navigation */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={navigatePrev}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={navigateToday}
              className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-foreground transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-foreground tracking-tight">
            {viewMode === "DAY"
              ? currentDate.toLocaleDateString("default", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
              : monthName}
          </h2>

          {loading && (
            <span className="text-[11px] text-muted-foreground animate-pulse">
              Syncing...
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
          {(["MONTH", "WEEK", "DAY", "AGENDA"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-elevated"
              }`}
            >
              {mode.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Body Rendering */}
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden min-h-[500px]">
        {viewMode === "MONTH" && (
          <div className="flex flex-col">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-border/80 bg-surface-elevated text-center text-[11px] font-bold text-muted-foreground uppercase py-2.5">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Month Day Grid */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border/60">
              {monthDays.map((day) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday = day.toDateString() === new Date().toDateString();
                const dayStr = day.toISOString().slice(0, 10);

                const dayEvents = events.filter((e) => e.start.slice(0, 10) === dayStr);

                return (
                  <div
                    key={dayStr}
                    className={`min-h-[110px] p-2 space-y-1.5 transition-colors ${
                      !isCurrentMonth
                        ? "bg-surface-elevated/30 text-muted-foreground/50"
                        : "bg-surface"
                    } ${isToday ? "bg-primary/[0.03]" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-bold inline-flex h-6 w-6 items-center justify-center rounded-full ${
                          isToday
                            ? "bg-primary text-primary-foreground font-black shadow-xs"
                            : isCurrentMonth
                            ? "text-foreground"
                            : "text-muted-foreground/60"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {dayEvents.length > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {dayEvents.length}
                        </span>
                      )}
                    </div>

                    {/* Day Events */}
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const isMeeting = event.eventType === "MEETING";
                        const isCall = event.eventType === "CALL";
                        const timeDisplay = new Date(event.start).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={event.id}
                            onClick={() => setSelectedEvent(event)}
                            className={`p-1.5 rounded-lg border text-[11px] font-medium truncate cursor-pointer transition-all hover:scale-[1.02] ${
                              isMeeting
                                ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                                : isCall
                                ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                                : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                            }`}
                          >
                            <span className="font-bold mr-1 text-[10px] opacity-80">{timeDisplay}</span>
                            {event.title}
                          </div>
                        );
                      })}

                      {dayEvents.length > 3 && (
                        <p
                          onClick={() => {
                            setCurrentDate(day);
                            setViewMode("DAY");
                          }}
                          className="text-[10px] text-muted-foreground hover:text-foreground cursor-pointer text-center font-semibold pt-0.5"
                        >
                          +{dayEvents.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {viewMode === "AGENDA" && (
          <div className="p-6 space-y-6">
            {events.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No scheduled events or follow-ups in this time range.
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => {
                  const isMeeting = event.eventType === "MEETING";
                  const isCall = event.eventType === "CALL";
                  const startDate = new Date(event.start);

                  return (
                    <div
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-start gap-4 p-4 rounded-2xl border border-border/80 bg-surface-elevated hover:bg-surface hover:border-primary/50 transition-all cursor-pointer group"
                    >
                      <div className="text-center shrink-0 w-14">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                          {startDate.toLocaleString("default", { month: "short" })}
                        </span>
                        <span className="text-xl font-black text-foreground block leading-none">
                          {startDate.getDate()}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground block mt-1">
                          {startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>

                      <div className="h-10 w-px bg-border/80 shrink-0 self-center" />

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              isMeeting
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : isCall
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}
                          >
                            {event.eventType}
                          </span>
                          <span className="text-xs font-bold text-foreground">{event.title}</span>
                        </div>
                        {event.notes && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {event.notes}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                          {event.entityName && (
                            <span className="font-semibold text-foreground">
                              Target: {event.entityName}
                            </span>
                          )}
                          <span>Rep: {event.ownerName}</span>
                          {event.locationOrLink && (
                            <span className="text-purple-400 truncate max-w-xs">
                              📍 {event.locationOrLink}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 self-center">
                        <button className="px-3 py-1.5 rounded-xl border border-border bg-surface text-xs font-semibold text-foreground group-hover:border-primary">
                          Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {(viewMode === "WEEK" || viewMode === "DAY") && (
          <div className="p-6 space-y-4">
            <div className="text-xs text-muted-foreground">
              Showing {events.length} event(s) for selected view.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {events.map((event) => {
                const isMeeting = event.eventType === "MEETING";
                const isCall = event.eventType === "CALL";
                const startDate = new Date(event.start);

                return (
                  <div
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className="p-4 rounded-2xl border border-border/80 bg-surface-elevated hover:bg-surface hover:border-primary/50 transition-all cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                          isMeeting
                            ? "bg-purple-500/10 text-purple-400"
                            : isCall
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {event.eventType}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {startDate.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">{event.title}</h4>
                      {event.notes && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                          {event.notes}
                        </p>
                      )}
                    </div>
                    <div className="pt-1 border-t border-border/60 text-[10px] text-muted-foreground flex items-center justify-between">
                      <span>{event.entityName || "General"}</span>
                      <span>{event.ownerName}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Event Detail Drawer / Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/70 bg-surface-elevated">
              <div className="flex items-center gap-2.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-xl border ${
                    selectedEvent.eventType === "MEETING"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      : selectedEvent.eventType === "CALL"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {selectedEvent.eventType === "MEETING" && <Video className="h-4 w-4" />}
                  {selectedEvent.eventType === "CALL" && <Phone className="h-4 w-4" />}
                  {selectedEvent.eventType === "FOLLOW_UP" && <CheckSquare className="h-4 w-4" />}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{selectedEvent.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(selectedEvent.start).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-xs">
              {selectedEvent.notes && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Details / Agenda
                  </span>
                  <p className="text-foreground p-3 rounded-xl bg-surface-elevated border border-border whitespace-pre-wrap font-sans">
                    {selectedEvent.notes}
                  </p>
                </div>
              )}

              {selectedEvent.locationOrLink && (
                <div className="space-y-1">
                  <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
                    Meeting Location / Link
                  </span>
                  {selectedEvent.locationOrLink.startsWith("http") ? (
                    <a
                      href={selectedEvent.locationOrLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>{selectedEvent.locationOrLink}</span>
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    </a>
                  ) : (
                    <p className="text-foreground p-2 rounded-xl bg-surface-elevated border border-border">
                      {selectedEvent.locationOrLink}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Target Entity
                  </span>
                  <p className="font-bold text-foreground">{selectedEvent.entityName || "N/A"}</p>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    Assigned Owner
                  </span>
                  <p className="font-bold text-foreground">{selectedEvent.ownerName}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                {selectedEvent.eventType === "FOLLOW_UP" && (
                  <>
                    <button
                      onClick={() => {
                        const rawId = selectedEvent.id.replace("fu_", "");
                        setRescheduleFollowUpTarget({
                          id: rawId,
                          title: selectedEvent.title,
                          dueAt: selectedEvent.start,
                        });
                        setSelectedEvent(null);
                      }}
                      className="px-3 py-1.5 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface-hover"
                    >
                      Reschedule
                    </button>
                    <button
                      onClick={() => {
                        const rawId = selectedEvent.id.replace("fu_", "");
                        setCompleteFollowUpTarget({
                          id: rawId,
                          title: selectedEvent.title,
                          type: selectedEvent.channelType,
                        });
                        setSelectedEvent(null);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs"
                    >
                      Complete
                    </button>
                  </>
                )}
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-surface-hover"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateFollowUpModal
        isOpen={isCreateFollowUpOpen}
        onClose={() => setIsCreateFollowUpOpen(false)}
        onSuccess={fetchEvents}
        leads={leads}
        deals={deals}
      />

      <ScheduleMeetingModal
        isOpen={isScheduleMeetingOpen}
        onClose={() => setIsScheduleMeetingOpen(false)}
        onSuccess={fetchEvents}
        leads={leads}
        deals={deals}
      />

      <CompleteFollowUpModal
        isOpen={Boolean(completeFollowUpTarget)}
        onClose={() => setCompleteFollowUpTarget(null)}
        onSuccess={fetchEvents}
        followUp={completeFollowUpTarget}
      />

      <RescheduleFollowUpModal
        isOpen={Boolean(rescheduleFollowUpTarget)}
        onClose={() => setRescheduleFollowUpTarget(null)}
        onSuccess={fetchEvents}
        followUp={rescheduleFollowUpTarget}
      />
    </div>
  );
}
