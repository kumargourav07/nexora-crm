import { Metadata } from "next";
import { requirePermission } from "@/lib/auth/permissions";
import prisma from "@/lib/prisma";
import { getCalendarEventsAction } from "@/lib/actions/followups-actions";
import { CalendarViewClient } from "@/components/app/communications/calendar-view-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales Calendar & Schedule | NEXORA Advanced CRM",
  description: "Interactive sales calendar, scheduled meetings, calls, and follow-up deadlines.",
};

export default async function CalendarPage() {
  const { workspaceId } = await requirePermission("followups.read");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  start.setDate(start.getDate() - 7);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  end.setDate(end.getDate() + 7);

  const [eventsRes, leads, deals] = await Promise.all([
    getCalendarEventsAction(start.toISOString(), end.toISOString()),
    prisma.lead.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.deal.findMany({
      where: { workspaceId },
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const initialEvents = eventsRes.success && eventsRes.data ? eventsRes.data : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <CalendarViewClient
        initialEvents={initialEvents}
        leads={leads}
        deals={deals}
      />
    </div>
  );
}
