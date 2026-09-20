"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createPipelineSchema,
  updatePipelineSchema,
  createStageSchema,
  updateStageSchema,
  reorderStagesSchema,
  CreatePipelineInput,
  UpdatePipelineInput,
  CreateStageInput,
  UpdateStageInput,
  ReorderStagesInput,
  DEFAULT_PIPELINE_STAGES,
} from "@/lib/validations/sales";
import { revalidatePath } from "next/cache";

/**
 * Ensures at least one default sales pipeline with default stages exists for the workspace.
 */
export async function ensureDefaultPipeline(workspaceId: string) {
  let defaultPipeline = await prisma.pipeline.findFirst({
    where: { workspaceId, isDefault: true },
    include: { stages: { orderBy: { order: "asc" } } },
  });

  if (!defaultPipeline) {
    // Check if any pipeline exists
    defaultPipeline = await prisma.pipeline.findFirst({
      where: { workspaceId },
      include: { stages: { orderBy: { order: "asc" } } },
    });
  }

  if (!defaultPipeline) {
    defaultPipeline = await prisma.pipeline.create({
      data: {
        workspaceId,
        name: "Sales Pipeline",
        isDefault: true,
        stages: {
          create: DEFAULT_PIPELINE_STAGES.map((s) => ({
            workspaceId,
            name: s.name,
            order: s.order,
            probability: s.probability,
            color: s.color,
            isWon: s.isWon,
            isLost: s.isLost,
          })),
        },
      },
      include: { stages: { orderBy: { order: "asc" } } },
    });
  }

  return defaultPipeline;
}

/**
 * Gets all pipelines for the workspace with their stages.
 */
export async function getPipelinesAction() {
  try {
    const { workspaceId, role } = await requirePermission("deals.read");

    // Ensure default pipeline exists
    await ensureDefaultPipeline(workspaceId);

    const pipelines = await prisma.pipeline.findMany({
      where: { workspaceId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            _count: {
              select: { deals: true },
            },
          },
        },
        _count: {
          select: { deals: true },
        },
      },
    });

    return {
      success: true,
      data: {
        pipelines: pipelines.map((p) => ({
          id: p.id,
          name: p.name,
          isDefault: p.isDefault,
          dealCount: p._count.deals,
          stages: p.stages.map((s) => ({
            id: s.id,
            name: s.name,
            order: s.order,
            probability: s.probability,
            color: s.color,
            isWon: s.isWon || s.name.toLowerCase() === "won",
            isLost: s.lostReason ? true : (s.isLost || s.name.toLowerCase() === "lost"),
            dealCount: s._count.deals,
          })),
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getPipelinesAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load pipelines",
      data: { pipelines: [] },
    };
  }
}

/**
 * Gets single pipeline with stages.
 */
export async function getPipelineByIdAction(id: string) {
  try {
    const { workspaceId, role } = await requirePermission("deals.read");

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, workspaceId },
      include: {
        stages: {
          orderBy: { order: "asc" },
          include: {
            _count: { select: { deals: true } },
          },
        },
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) {
      return { success: false, error: "Pipeline not found" };
    }

    return {
      success: true,
      data: {
        id: pipeline.id,
        name: pipeline.name,
        isDefault: pipeline.isDefault,
        dealCount: pipeline._count.deals,
        stages: pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          probability: s.probability,
          color: s.color,
          isWon: s.isWon || s.name.toLowerCase() === "won",
          isLost: s.isLost || s.name.toLowerCase() === "lost",
          dealCount: s._count.deals,
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getPipelineByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load pipeline" };
  }
}

/**
 * Creates a new pipeline with standard default stages.
 */
export async function createPipelineAction(input: CreatePipelineInput) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const validation = createPipelineSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid pipeline data",
      };
    }

    const data = validation.data;

    const newPipeline = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.pipeline.updateMany({
          where: { workspaceId, isDefault: true },
          data: { isDefault: false },
        });
      }

      const created = await tx.pipeline.create({
        data: {
          workspaceId,
          name: data.name,
          isDefault: data.isDefault,
          stages: {
            create: DEFAULT_PIPELINE_STAGES.map((s) => ({
              workspaceId,
              name: s.name,
              order: s.order,
              probability: s.probability,
              color: s.color,
              isWon: s.isWon,
              isLost: s.isLost,
            })),
          },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "PIPELINE_CREATED",
          entityType: "PIPELINE",
          entityId: created.id,
          metadata: JSON.stringify({ name: created.name }),
        },
      });

      return created;
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/forecast");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return {
      success: true,
      data: {
        id: newPipeline.id,
        name: newPipeline.name,
      },
    };
  } catch (err) {
    console.error("createPipelineAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create pipeline",
    };
  }
}

/**
 * Updates a pipeline.
 */
export async function updatePipelineAction(input: UpdatePipelineInput) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const validation = updatePipelineSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || "Invalid data" };
    }

    const { id, name, isDefault } = validation.data;

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, workspaceId },
    });

    if (!pipeline) {
      return { success: false, error: "Pipeline not found" };
    }

    await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.pipeline.updateMany({
          where: { workspaceId, isDefault: true },
          data: { isDefault: false },
        });
      }

      await tx.pipeline.update({
        where: { id },
        data: {
          name,
          ...(isDefault !== undefined ? { isDefault } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "PIPELINE_UPDATED",
          entityType: "PIPELINE",
          entityId: id,
          metadata: JSON.stringify({ name, isDefault }),
        },
      });
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return { success: true };
  } catch (err) {
    console.error("updatePipelineAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update pipeline" };
  }
}

/**
 * Deletes a pipeline if not default and contains no deals.
 */
export async function deletePipelineAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const pipeline = await prisma.pipeline.findFirst({
      where: { id, workspaceId },
      include: {
        _count: { select: { deals: true } },
      },
    });

    if (!pipeline) {
      return { success: false, error: "Pipeline not found" };
    }

    if (pipeline.isDefault) {
      return { success: false, error: "Cannot delete the default workspace pipeline." };
    }

    if (pipeline._count.deals > 0) {
      return {
        success: false,
        error: `Cannot delete pipeline with ${pipeline._count.deals} existing deal(s). Move or delete deals first.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.pipeline.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "PIPELINE_DELETED",
          entityType: "PIPELINE",
          entityId: id,
          metadata: JSON.stringify({ name: pipeline.name }),
        },
      });
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return { success: true };
  } catch (err) {
    console.error("deletePipelineAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete pipeline" };
  }
}

/**
 * Creates a stage in a pipeline.
 */
export async function createStageAction(input: CreateStageInput) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const validation = createStageSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || "Invalid stage data" };
    }

    const { pipelineId, name, order, probability, color, isWon, isLost } = validation.data;

    const pipeline = await prisma.pipeline.findFirst({
      where: { id: pipelineId, workspaceId },
    });

    if (!pipeline) {
      return { success: false, error: "Pipeline not found" };
    }

    const stage = await prisma.$transaction(async (tx) => {
      const created = await tx.pipelineStage.create({
        data: {
          workspaceId,
          pipelineId,
          name,
          order,
          probability,
          color: color || "#3B82F6",
          isWon: isWon || false,
          isLost: isLost || false,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "STAGE_CREATED",
          entityType: "PIPELINE_STAGE",
          entityId: created.id,
          metadata: JSON.stringify({ name, pipelineId }),
        },
      });

      return created;
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return { success: true, data: { id: stage.id, name: stage.name } };
  } catch (err) {
    console.error("createStageAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create stage" };
  }
}

/**
 * Updates an existing stage.
 */
export async function updateStageAction(input: UpdateStageInput) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const validation = updateStageSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || "Invalid stage data" };
    }

    const { id, name, probability, color, isWon, isLost } = validation.data;

    const stage = await prisma.pipelineStage.findFirst({
      where: { id, workspaceId },
    });

    if (!stage) {
      return { success: false, error: "Stage not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.pipelineStage.update({
        where: { id },
        data: {
          name,
          probability,
          ...(color !== undefined ? { color } : {}),
          ...(isWon !== undefined ? { isWon } : {}),
          ...(isLost !== undefined ? { isLost } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "STAGE_UPDATED",
          entityType: "PIPELINE_STAGE",
          entityId: id,
          metadata: JSON.stringify({ name, probability, isWon, isLost }),
        },
      });
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return { success: true };
  } catch (err) {
    console.error("updateStageAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update stage" };
  }
}

/**
 * Deletes a stage if no deals reside in it.
 */
export async function deleteStageAction(stageId: string) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const stage = await prisma.pipelineStage.findFirst({
      where: { id: stageId, workspaceId },
      include: {
        _count: { select: { deals: true } },
      },
    });

    if (!stage) {
      return { success: false, error: "Stage not found" };
    }

    if (stage._count.deals > 0) {
      return {
        success: false,
        error: `Cannot delete stage with ${stage._count.deals} deal(s). Move deals to another stage first.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.pipelineStage.delete({ where: { id: stageId } });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "STAGE_DELETED",
          entityType: "PIPELINE_STAGE",
          entityId: stageId,
          metadata: JSON.stringify({ name: stage.name }),
        },
      });
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return { success: true };
  } catch (err) {
    console.error("deleteStageAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete stage" };
  }
}

/**
 * Reorders stages within a pipeline.
 */
export async function reorderStagesAction(input: ReorderStagesInput) {
  try {
    const { workspaceId, userId } = await requirePermission("pipelines.manage");

    const validation = reorderStagesSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: "Invalid stage ordering payload" };
    }

    const { pipelineId, stageIds } = validation.data;

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < stageIds.length; i++) {
        await tx.pipelineStage.updateMany({
          where: { id: stageIds[i], pipelineId, workspaceId },
          data: { order: i },
        });
      }

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "STAGES_REORDERED",
          entityType: "PIPELINE",
          entityId: pipelineId,
          metadata: JSON.stringify({ stageIds }),
        },
      });
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/deals");
    revalidatePath("/app/settings/pipelines");

    return { success: true };
  } catch (err) {
    console.error("reorderStagesAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reorder stages" };
  }
}
