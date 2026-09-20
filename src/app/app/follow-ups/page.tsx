import { Metadata } from "next";
import { requirePermission } from "@/lib/auth/permissions";
import prisma from "@/lib/prisma";
import {
  getFollowUpsListAction,
  getFollowUpMetricsAction,
} from "@/lib/actions/followups-actions";
import { FollowUpsClient } from "@/components/app/communications/followups-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Follow-ups Ledger | NEXORA Advanced CRM",
  description: "Smart follow-up reminders, daily ledger, task rescheduling and completion tracking.",
};

export default async function FollowUpsPage() {
  const { workspaceId } = await requirePermission("followups.read");

  const [listRes, metricsRes, leads, deals] = await Promise.all([
    getFollowUpsListAction({ tab: "TODAY", page: 1, limit: 50 }),
    getFollowUpMetricsAction(),
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

  const initialData = listRes.success && listRes.data
    ? listRes.data
    : { items: [], totalCount: 0, page: 1, limit: 50, totalPages: 1 };

  const initialMetrics = metricsRes.success && metricsRes.data
    ? metricsRes.data
    : {
        totalCount: 0,
        overdueCount: 0,
        todayCount: 0,
        tomorrowCount: 0,
        completedMonthCount: 0,
        totalCompleted: 0,
        completionRate: 0,
      };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <FollowUpsClient
        initialData={initialData}
        initialMetrics={initialMetrics}
        leads={leads}
        deals={deals}
      />
    </div>
  );
}
