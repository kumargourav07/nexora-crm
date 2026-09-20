"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createWorkflowSchema,
  updateWorkflowSchema,
  getWorkflowsFilterSchema,
  getExecutionsFilterSchema,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  GetWorkflowsFilterInput,
  GetExecutionsFilterInput,
  WorkflowStatus,
  WorkflowExecutionStatus,
} from "@/lib/validations/automations";
import { AutomationEngine } from "@/lib/services/automation-engine";
import { eventBus } from "@/lib/events/event-bus";
import { revalidatePath } from "next/cache";

/**
 * Returns summary KPI metrics for the automations dashboard.
 */
export async function getAutomationMetricsAction() {
  try {
    const { workspaceId } = await requirePermission("automations.read");

    const [activeWorkflows, totalWorkflows, totalRuns, successfulRuns, failedRuns, skippedRuns] =
      await Promise.all([
        prisma.workflow.count({
          where: { workspaceId, status: WorkflowStatus.ACTIVE },
        }),
        prisma.workflow.count({
          where: { workspaceId, status: { not: WorkflowStatus.ARCHIVED } },
        }),
        prisma.workflowExecution.count({
          where: { workspaceId },
        }),
        prisma.workflowExecution.count({
          where: { workspaceId, status: WorkflowExecutionStatus.SUCCESS },
        }),
        prisma.workflowExecution.count({
          where: { workspaceId, status: WorkflowExecutionStatus.FAILED },
        }),
        prisma.workflowExecution.count({
          where: { workspaceId, status: WorkflowExecutionStatus.SKIPPED },
        }),
      ]);

    const successRate =
      totalRuns > 0 ? Math.round((successfulRuns / (totalRuns - skippedRuns || 1)) * 100) : 100;

    return {
      success: true,
      data: {
        activeWorkflows,
        totalWorkflows,
        totalRuns,
        successfulRuns,
        failedRuns,
        skippedRuns,
        successRate: Math.min(100, Math.max(0, successRate)),
      },
    };
  } catch (err: any) {
    console.error("getAutomationMetricsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load automation metrics",
      data: {
        activeWorkflows: 0,
        totalWorkflows: 0,
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        skippedRuns: 0,
        successRate: 0,
      },
    };
  }
}

/**
 * Retrieves list of workflows scoped to workspace with run stats.
 */
export async function getAutomationsAction(params?: GetWorkflowsFilterInput) {
  try {
    const { workspaceId, role } = await requirePermission("automations.read");

    const validation = getWorkflowsFilterSchema.safeParse(params || {});
    const filter = validation.success
      ? validation.data
      : {
          status: "ALL" as const,
          triggerType: "ALL" as const,
          page: 1,
          limit: 20,
          sortBy: "createdAt" as const,
          sortOrder: "desc" as const,
          search: undefined as string | undefined,
        };

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };

    if (filter.status && filter.status !== "ALL") {
      where.status = filter.status;
    } else {
      where.status = { not: WorkflowStatus.ARCHIVED };
    }

    if (filter.triggerType && filter.triggerType !== "ALL") {
      where.triggerType = filter.triggerType;
    }

    if (filter.search && filter.search.trim() !== "") {
      const search = filter.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [workflows, totalCount] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [filter.sortBy || "createdAt"]: filter.sortOrder || "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          executions: {
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              startedAt: true,
              durationMs: true,
            },
          },
          _count: {
            select: { executions: true },
          },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    const formatted = workflows.map((wf) => {
      const totalRuns = wf._count.executions;
      const successfulRuns = wf.executions.filter((e) => e.status === WorkflowExecutionStatus.SUCCESS).length;
      const failedRuns = wf.executions.filter((e) => e.status === WorkflowExecutionStatus.FAILED).length;
      const lastRun = wf.executions[0] ? wf.executions[0].startedAt.toISOString() : null;
      const successRate = totalRuns > 0 ? Math.round((successfulRuns / (successfulRuns + failedRuns || 1)) * 100) : 100;

      return {
        id: wf.id,
        name: wf.name,
        description: wf.description,
        status: wf.status,
        triggerType: wf.triggerType,
        conditionMatch: wf.conditionMatch,
        conditions: JSON.parse(wf.conditions || "[]"),
        actions: JSON.parse(wf.actions || "[]"),
        createdBy: wf.createdBy,
        createdAt: wf.createdAt.toISOString(),
        updatedAt: wf.updatedAt.toISOString(),
        totalRuns,
        successfulRuns,
        failedRuns,
        lastRun,
        successRate,
      };
    });

    return {
      success: true,
      data: {
        workflows: formatted,
        currentUserRole: role,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (err: any) {
    console.error("getAutomationsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load workflows",
      data: { workflows: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } },
    };
  }
}

/**
 * Retrieves a single workflow by ID.
 */
export async function getWorkflowByIdAction(id: string) {
  try {
    const { workspaceId, role } = await requirePermission("automations.read");

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        executions: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    return {
      success: true,
      data: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        triggerType: workflow.triggerType,
        conditionMatch: workflow.conditionMatch,
        conditions: JSON.parse(workflow.conditions || "[]"),
        actions: JSON.parse(workflow.actions || "[]"),
        createdBy: workflow.createdBy,
        createdAt: workflow.createdAt.toISOString(),
        updatedAt: workflow.updatedAt.toISOString(),
        executions: workflow.executions.map((e) => ({
          id: e.id,
          status: e.status,
          startedAt: e.startedAt.toISOString(),
          completedAt: e.completedAt ? e.completedAt.toISOString() : null,
          durationMs: e.durationMs,
          errorMessage: e.errorMessage,
          entityType: e.entityType,
          entityId: e.entityId,
        })),
        currentUserRole: role,
      },
    };
  } catch (err: any) {
    console.error("getWorkflowByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch workflow" };
  }
}

/**
 * Creates a new workflow in the workspace.
 */
export async function createWorkflowAction(input: CreateWorkflowInput) {
  try {
    const { workspaceId, userId } = await requirePermission("automations.create");

    const validation = createWorkflowSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid workflow data",
      };
    }

    const data = validation.data;

    const created = await prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.create({
        data: {
          workspaceId,
          name: data.name,
          description: data.description,
          status: data.status || WorkflowStatus.DRAFT,
          triggerType: data.triggerType,
          triggerConfig: JSON.stringify(data.triggerConfig || {}),
          conditionMatch: data.conditionMatch,
          conditions: JSON.stringify(data.conditions || []),
          actions: JSON.stringify(data.actions || []),
          createdById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKFLOW_CREATED",
          entityType: "WORKFLOW",
          entityId: wf.id,
          metadata: JSON.stringify({
            name: wf.name,
            triggerType: wf.triggerType,
            status: wf.status,
          }),
        },
      });

      return wf;
    });

    revalidatePath("/app/automations");
    revalidatePath("/app/automations/runs");

    return {
      success: true,
      data: { id: created.id, name: created.name },
    };
  } catch (err: any) {
    console.error("createWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create workflow" };
  }
}

/**
 * Updates an existing workflow.
 */
export async function updateWorkflowAction(input: UpdateWorkflowInput) {
  try {
    const { workspaceId, userId } = await requirePermission("automations.update");

    const validation = updateWorkflowSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid workflow update",
      };
    }

    const { id, ...data } = validation.data;

    const existing = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Workflow not found" };
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
    if (data.conditionMatch !== undefined) updateData.conditionMatch = data.conditionMatch;
    if (data.conditions !== undefined) updateData.conditions = JSON.stringify(data.conditions);
    if (data.actions !== undefined) updateData.actions = JSON.stringify(data.actions);
    if (data.status !== undefined) updateData.status = data.status;

    const updated = await prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.update({
        where: { id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKFLOW_UPDATED",
          entityType: "WORKFLOW",
          entityId: wf.id,
          metadata: JSON.stringify({ name: wf.name }),
        },
      });

      return wf;
    });

    revalidatePath("/app/automations");
    revalidatePath(`/app/automations/${id}`);

    return { success: true, data: { id: updated.id, name: updated.name } };
  } catch (err: any) {
    console.error("updateWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update workflow" };
  }
}

/**
 * Activates a workflow after comprehensive validation.
 */
export async function activateWorkflowAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("automations.activate");

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    // Validate workflow structure before activating
    const actions = JSON.parse(workflow.actions || "[]");
    if (!actions || actions.length === 0) {
      return {
        success: false,
        error: "Cannot activate workflow without at least one configured action",
      };
    }

    await prisma.$transaction([
      prisma.workflow.update({
        where: { id },
        data: { status: WorkflowStatus.ACTIVE },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKFLOW_ACTIVATED",
          entityType: "WORKFLOW",
          entityId: id,
          metadata: JSON.stringify({ name: workflow.name }),
        },
      }),
    ]);

    revalidatePath("/app/automations");
    revalidatePath(`/app/automations/${id}`);

    return { success: true, message: `Workflow "${workflow.name}" is now ACTIVE` };
  } catch (err: any) {
    console.error("activateWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to activate workflow" };
  }
}

/**
 * Pauses an active workflow.
 */
export async function pauseWorkflowAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("automations.pause");

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    await prisma.$transaction([
      prisma.workflow.update({
        where: { id },
        data: { status: WorkflowStatus.PAUSED },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKFLOW_PAUSED",
          entityType: "WORKFLOW",
          entityId: id,
          metadata: JSON.stringify({ name: workflow.name }),
        },
      }),
    ]);

    revalidatePath("/app/automations");
    revalidatePath(`/app/automations/${id}`);

    return { success: true, message: `Workflow "${workflow.name}" is now PAUSED` };
  } catch (err: any) {
    console.error("pauseWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to pause workflow" };
  }
}

/**
 * Duplicates a workflow into a new DRAFT copy.
 */
export async function duplicateWorkflowAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("automations.create");

    const existing = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Workflow not found" };
    }

    const duplicated = await prisma.workflow.create({
      data: {
        workspaceId,
        name: `Copy of ${existing.name}`,
        description: existing.description,
        status: WorkflowStatus.DRAFT,
        triggerType: existing.triggerType,
        triggerConfig: existing.triggerConfig,
        conditionMatch: existing.conditionMatch,
        conditions: existing.conditions,
        actions: existing.actions,
        createdById: userId,
      },
    });

    revalidatePath("/app/automations");

    return {
      success: true,
      data: { id: duplicated.id, name: duplicated.name },
    };
  } catch (err: any) {
    console.error("duplicateWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to duplicate workflow" };
  }
}

/**
 * Archives a workflow (soft delete that preserves execution logs).
 */
export async function archiveWorkflowAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("automations.delete");

    const workflow = await prisma.workflow.findFirst({
      where: { id, workspaceId },
    });

    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    await prisma.$transaction([
      prisma.workflow.update({
        where: { id },
        data: { status: WorkflowStatus.ARCHIVED },
      }),
      prisma.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "WORKFLOW_ARCHIVED",
          entityType: "WORKFLOW",
          entityId: id,
          metadata: JSON.stringify({ name: workflow.name }),
        },
      }),
    ]);

    revalidatePath("/app/automations");

    return { success: true, message: `Workflow "${workflow.name}" archived successfully` };
  } catch (err: any) {
    console.error("archiveWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to archive workflow" };
  }
}

/**
 * Retrieves execution history runs ledger scoped to workspace.
 */
export async function getWorkflowExecutionsAction(params?: GetExecutionsFilterInput) {
  try {
    const { workspaceId, role } = await requirePermission("automation_runs.read");

    const validation = getExecutionsFilterSchema.safeParse(params || {});
    const filter = validation.success
      ? validation.data
      : {
          page: 1,
          limit: 25,
          status: "ALL" as const,
          workflowId: undefined as string | undefined,
          search: undefined as string | undefined,
        };

    const page = filter.page || 1;
    const limit = filter.limit || 25;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId };

    if (filter.workflowId) {
      where.workflowId = filter.workflowId;
    }

    if (filter.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter.search && filter.search.trim() !== "") {
      const search = filter.search.trim();
      where.OR = [
        { id: { contains: search, mode: "insensitive" } },
        { workflow: { name: { contains: search, mode: "insensitive" } } },
        { entityType: { contains: search, mode: "insensitive" } },
      ];
    }

    const [executions, totalCount] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          workflow: { select: { id: true, name: true, triggerType: true } },
        },
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    const formatted = executions.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      workflowName: e.workflow?.name || "Deleted Workflow",
      triggerType: e.workflow?.triggerType || "UNKNOWN",
      status: e.status,
      entityType: e.entityType,
      entityId: e.entityId,
      startedAt: e.startedAt.toISOString(),
      completedAt: e.completedAt ? e.completedAt.toISOString() : null,
      durationMs: e.durationMs || 0,
      errorMessage: e.errorMessage,
      depth: e.depth,
    }));

    return {
      success: true,
      data: {
        executions: formatted,
        currentUserRole: role,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (err: any) {
    console.error("getWorkflowExecutionsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load workflow runs",
      data: { executions: [], pagination: { page: 1, limit: 25, totalCount: 0, totalPages: 0 } },
    };
  }
}

/**
 * Retrieves execution diagnostic details by ID.
 */
export async function getWorkflowExecutionByIdAction(id: string) {
  try {
    const { workspaceId } = await requirePermission("automation_runs.read");

    const execution = await prisma.workflowExecution.findFirst({
      where: { id, workspaceId },
      include: {
        workflow: {
          select: {
            id: true,
            name: true,
            triggerType: true,
            conditionMatch: true,
          },
        },
      },
    });

    if (!execution) {
      return { success: false, error: "Execution log not found" };
    }

    return {
      success: true,
      data: {
        id: execution.id,
        workflowId: execution.workflowId,
        workflowName: execution.workflow?.name || "Workflow",
        triggerType: execution.workflow?.triggerType,
        status: execution.status,
        entityType: execution.entityType,
        entityId: execution.entityId,
        startedAt: execution.startedAt.toISOString(),
        completedAt: execution.completedAt ? execution.completedAt.toISOString() : null,
        durationMs: execution.durationMs,
        errorMessage: execution.errorMessage,
        configurationSnapshot: execution.configurationSnapshot
          ? JSON.parse(execution.configurationSnapshot)
          : null,
        stepResults: execution.stepResults ? JSON.parse(execution.stepResults) : [],
        depth: execution.depth,
      },
    };
  } catch (err: any) {
    console.error("getWorkflowExecutionByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load execution details" };
  }
}

/**
 * Retries a failed workflow execution.
 */
export async function retryWorkflowExecutionAction(executionId: string) {
  try {
    const { workspaceId } = await requirePermission("automation_runs.retry");

    const execution = await prisma.workflowExecution.findFirst({
      where: { id: executionId, workspaceId },
      include: { workflow: true },
    });

    if (!execution) {
      return { success: false, error: "Execution record not found" };
    }

    if (!execution.workflow) {
      return { success: false, error: "Associated workflow no longer exists" };
    }

    const mockEvent = eventBus.createEvent({
      workspaceId,
      type: execution.workflow.triggerType,
      entityType: execution.entityType as any,
      entityId: execution.entityId || "retry_entity",
      payload: { id: execution.entityId, retryOf: executionId },
      context: { source: "WORKFLOW", depth: 1 },
    });

    const result = await AutomationEngine.executeWorkflow(execution.workflow, mockEvent);

    revalidatePath("/app/automations/runs");

    return {
      success: true,
      data: result,
      message: `Execution retried. Result: ${result.status}`,
    };
  } catch (err: any) {
    console.error("retryWorkflowExecutionAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Retry execution failed" };
  }
}

/**
 * Triggers a simulated test run of a workflow.
 */
export async function triggerTestWorkflowAction(params: {
  workflowId: string;
  mockPayload?: Record<string, any>;
}) {
  try {
    const { workspaceId } = await requirePermission("automations.create");

    const workflow = await prisma.workflow.findFirst({
      where: { id: params.workflowId, workspaceId },
    });

    if (!workflow) {
      return { success: false, error: "Workflow not found" };
    }

    const payload = params.mockPayload || {
      name: "Test Lead",
      company: "Acme Enterprises",
      email: "test@example.com",
      source: "FACEBOOK",
      status: "NEW",
      value: 150000,
    };

    const testEvent = eventBus.createEvent({
      workspaceId,
      type: workflow.triggerType,
      entityType: "LEAD",
      entityId: "test_lead_sim",
      payload,
      context: { source: "WORKFLOW", depth: 1 },
    });

    const result = await AutomationEngine.executeWorkflow(workflow, testEvent);

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    console.error("triggerTestWorkflowAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Test execution failed" };
  }
}
