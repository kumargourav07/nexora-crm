import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import { getWorkflowExecutionsAction } from "@/lib/actions/automations-actions";
import { AutomationRunsClient } from "@/components/app/automations/automation-runs-client";

export const dynamic = "force-dynamic";

interface AutomationRunsPageProps {
  searchParams: Promise<{
    workflowId?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AutomationRunsPage({ searchParams }: AutomationRunsPageProps) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "automation_runs.read")) {
    redirect("/app/automations");
  }

  const { workflowId, status, page } = await searchParams;

  const res = await getWorkflowExecutionsAction({
    workflowId,
    status: (status as any) || "ALL",
    page: page ? parseInt(page, 10) : 1,
    limit: 30,
  });

  return (
    <AutomationRunsClient
      initialExecutions={res.success && res.data ? res.data.executions : []}
      initialPagination={
        res.success && res.data
          ? res.data.pagination
          : { page: 1, limit: 30, totalCount: 0, totalPages: 0 }
      }
      currentUserRole={session.role}
      workflowIdFilter={workflowId}
    />
  );
}
