import { getSession } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import prisma from "@/lib/prisma";
import { getWorkflowByIdAction } from "@/lib/actions/automations-actions";
import { WorkflowBuilderClient } from "@/components/app/automations/workflow-builder-client";

export const dynamic = "force-dynamic";

interface EditWorkflowPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWorkflowPage({ params }: EditWorkflowPageProps) {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "automations.read")) {
    redirect("/app/automations");
  }

  const { id } = await params;

  const [workflowRes, members, stages] = await Promise.all([
    getWorkflowByIdAction(id),
    prisma.membership.findMany({
      where: { workspaceId: session.workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.pipelineStage.findMany({
      where: { workspaceId: session.workspaceId },
      orderBy: { order: "asc" },
    }),
  ]);

  if (!workflowRes.success || !workflowRes.data) {
    notFound();
  }

  const workspaceUsers = members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
  }));

  const pipelineStages = stages.map((s) => ({
    id: s.id,
    name: s.name,
    order: s.order,
  }));

  return (
    <WorkflowBuilderClient
      initialWorkflow={workflowRes.data as any}
      workspaceUsers={workspaceUsers}
      pipelineStages={pipelineStages}
      currentUserRole={session.role}
    />
  );
}
