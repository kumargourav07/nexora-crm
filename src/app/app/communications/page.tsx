import { Metadata } from "next";
import { requirePermission } from "@/lib/auth/permissions";
import prisma from "@/lib/prisma";
import {
  getCommunicationsListAction,
  getCommunicationMetricsAction,
} from "@/lib/actions/communications-actions";
import { CommunicationsClient } from "@/components/app/communications/communications-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Communication Hub | NEXORA Advanced CRM",
  description: "Unified communication management, calls, meetings, emails and template outreach.",
};

export default async function CommunicationsPage() {
  const { workspaceId } = await requirePermission("communications.read");

  const [listRes, metricsRes, leads, deals] = await Promise.all([
    getCommunicationsListAction({ page: 1, limit: 50 }),
    getCommunicationMetricsAction(),
    prisma.lead.findMany({
      where: { workspaceId },
      select: { id: true, name: true, email: true, phone: true },
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
        totalInteractions: 0,
        totalCalls: 0,
        connectedCalls: 0,
        callConnectRate: 0,
        totalMeetings: 0,
        completedMeetings: 0,
        totalEmails: 0,
        totalWhatsApp: 0,
        totalSms: 0,
        totalNotes: 0,
        avgDurationSeconds: 0,
        totalCallMinutes: 0,
        overdueFollowUps: 0,
        todayFollowUps: 0,
      };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <CommunicationsClient
        initialData={initialData}
        initialMetrics={initialMetrics}
        leads={leads}
        deals={deals}
      />
    </div>
  );
}
