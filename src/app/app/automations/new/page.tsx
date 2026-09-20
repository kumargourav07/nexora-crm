import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/auth/permissions";
import prisma from "@/lib/prisma";
import { WorkflowBuilderClient } from "@/components/app/automations/workflow-builder-client";

export const dynamic = "force-dynamic";

export default async function NewWorkflowPage() {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect("/login");
  }

  if (!hasPermission(session.role, "automations.create")) {
    redirect("/app/automations");
  }

  const [members, stages] = await Promise.all([
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
      initialWorkflow={null}
      workspaceUsers={workspaceUsers}
      pipelineStages={pipelineStages}
      currentUserRole={session.role}
    />
  );
}
