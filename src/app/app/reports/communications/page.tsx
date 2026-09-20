import { Metadata } from "next";
import { requirePermission } from "@/lib/auth/permissions";
import { getCommunicationReportsAction } from "@/lib/actions/communications-actions";
import { CommunicationReportsClient } from "@/components/app/communications/communication-reports-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Communication Reports & Analytics | NEXORA Advanced CRM",
  description: "Sales outreach metrics, call outcome analysis, and team performance leaderboard.",
};

export default async function CommunicationReportsPage() {
  await requirePermission("communication_reports.read");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const res = await getCommunicationReportsAction({
    startDate: thirtyDaysAgo.toISOString(),
  });

  const initialReport = res.success && res.data
    ? res.data
    : {
        totalInteractions: 0,
        channelCounts: { CALL: 0, MEETING: 0, EMAIL: 0, WHATSAPP: 0, SMS: 0, NOTE: 0 },
        outcomeBreakdown: [],
        leaderboard: [],
      };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <CommunicationReportsClient initialReport={initialReport} />
    </div>
  );
}
