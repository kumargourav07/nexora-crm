import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getAutomationsAction,
  getAutomationMetricsAction,
} from "@/lib/actions/automations-actions";
import { AutomationsClient } from "@/components/app/automations/automations-client";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "automations.read")) {
    redirect("/app/dashboard");
  }

  const [workflowsRes, metricsRes] = await Promise.all([
    getAutomationsAction({ page: 1, limit: 50 }),
    getAutomationMetricsAction(),
  ]);

  return (
    <AutomationsClient
      initialWorkflows={workflowsRes.success && workflowsRes.data ? workflowsRes.data.workflows : []}
      initialMetrics={
        metricsRes.success && metricsRes.data
          ? metricsRes.data
          : {
              activeWorkflows: 0,
              totalWorkflows: 0,
              totalRuns: 0,
              successfulRuns: 0,
              failedRuns: 0,
              skippedRuns: 0,
              successRate: 0,
            }
      }
      currentUserRole={session.role}
    />
  );
}
