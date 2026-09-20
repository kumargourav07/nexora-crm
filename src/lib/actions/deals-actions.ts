"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
  markDealWonSchema,
  markDealLostSchema,
  reopenDealSchema,
  assignDealSchema,
  bulkUpdateDealsSchema,
  CreateDealInput,
  UpdateDealInput,
  UpdateDealStageInput,
  MarkDealWonInput,
  MarkDealLostInput,
  ReopenDealInput,
  AssignDealInput,
  BulkUpdateDealsInput,
} from "@/lib/validations/sales";
import { DealStatus, LeadSource, TaskPriority, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { ensureDefaultPipeline } from "./pipelines-actions";
import { eventBus } from "@/lib/events/event-bus";
import { WorkflowTriggerType } from "@/lib/validations/automations";

export interface GetDealsParams {
  search?: string;
  status?: DealStatus | "ALL";
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  contactId?: string;
  companyId?: string;
  priority?: TaskPriority | "ALL";
  page?: number;
  limit?: number;
  sortBy?: "expectedCloseDate" | "value" | "probability" | "createdAt" | "name" | "priority";
  sortOrder?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
}

const STALE_DEAL_DAYS = 14;

/**
 * Checks if deal is stale based on last activity or update timestamp.
 */
function isDealStale(lastActivityDate: Date | null, updatedAt: Date): boolean {
  const referenceDate = lastActivityDate || updatedAt;
  const diffDays = Math.floor((Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= STALE_DEAL_DAYS;
}

/**
 * Searches and paginates deals scoped to workspace with metrics summary.
 */
export async function getDealsAction(params: GetDealsParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("deals.read");

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.DealWhereInput = {
      workspaceId,
    };

    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params.priority && params.priority !== "ALL") {
      where.priority = params.priority;
    }

    if (params.pipelineId) {
      where.pipelineId = params.pipelineId;
    }

    if (params.stageId) {
      where.stageId = params.stageId;
    }

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }

    if (params.contactId) {
      where.contactId = params.contactId;
    }

    if (params.companyId) {
      where.companyId = params.companyId;
    }

    if (params.startDate && params.endDate) {
      where.expectedCloseDate = {
        gte: new Date(params.startDate),
        lte: new Date(params.endDate),
      };
    }

    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { contact: { firstName: { contains: search, mode: "insensitive" } } },
        { contact: { lastName: { contains: search, mode: "insensitive" } } },
        { company: { name: { contains: search, mode: "insensitive" } } },
        { ownerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const sortField = params.sortBy || (params.status === "OPEN" ? "expectedCloseDate" : "createdAt");
    const sortOrder = params.sortOrder || (sortField === "expectedCloseDate" ? "asc" : "desc");

    const orderBy: Prisma.DealOrderByWithRelationInput = {
      [sortField]: sortOrder,
    };

    // Parallel fetch for paginated items and workspace metrics
    const [deals, totalCount, allWorkspaceDeals] = await Promise.all([
      prisma.deal.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
          company: {
            select: { id: true, name: true, industry: true },
          },
          pipeline: {
            select: { id: true, name: true },
          },
          stage: {
            select: { id: true, name: true, probability: true, color: true, order: true, isWon: true, isLost: true },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      }),
      prisma.deal.count({ where }),
      prisma.deal.findMany({
        where: { workspaceId },
        select: {
          id: true,
          value: true,
          probability: true,
          status: true,
        },
      }),
    ]);

    // Compute global metrics
    let openDealsCount = 0;
    let pipelineValue = 0;
    let weightedPipeline = 0;
    let wonRevenue = 0;
    let lostValue = 0;

    for (const d of allWorkspaceDeals) {
      const val = Number(d.value);
      if (d.status === DealStatus.OPEN) {
        openDealsCount++;
        pipelineValue += val;
        weightedPipeline += Math.round((val * d.probability) / 100);
      } else if (d.status === DealStatus.WON) {
        wonRevenue += val;
      } else if (d.status === DealStatus.LOST) {
        lostValue += val;
      }
    }

    const formatted = deals.map((d) => {
      const valueNum = Number(d.value);
      const weightedValue = Math.round((valueNum * d.probability) / 100);
      const lastAct = d.activities[0]?.createdAt || null;
      const stale = d.status === DealStatus.OPEN && isDealStale(lastAct, d.updatedAt);

      return {
        id: d.id,
        name: d.name,
        valueNumeric: valueNum,
        valueFormatted: `₹${valueNum.toLocaleString("en-IN")}`,
        weightedValue,
        weightedValueFormatted: `₹${weightedValue.toLocaleString("en-IN")}`,
        currency: d.currency,
        probability: d.probability,
        priority: d.priority || TaskPriority.MEDIUM,
        status: d.status,
        source: d.source,
        description: d.description,
        isStale: stale,
        lastActivityAt: lastAct ? lastAct.toISOString() : null,
        expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.toISOString() : null,
        wonAt: d.wonAt ? d.wonAt.toISOString() : null,
        lostAt: d.lostAt ? d.lostAt.toISOString() : null,
        lostReason: d.lostReason,
        contactId: d.contactId,
        contactName: d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") : null,
        companyId: d.companyId,
        companyName: d.company?.name || null,
        pipelineId: d.pipelineId,
        pipelineName: d.pipeline.name,
        stageId: d.stageId,
        stageName: d.stage.name,
        stageColor: d.stage.color || "#3B82F6",
        isWonStage: d.stage.isWon || d.stage.name.toLowerCase() === "won",
        isLostStage: d.stage.isLost || d.stage.name.toLowerCase() === "lost",
        ownerId: d.ownerId,
        ownerName: d.owner?.name || d.ownerName,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        deals: formatted,
        summary: {
          openDealsCount,
          pipelineValue,
          pipelineValueFormatted: `₹${pipelineValue.toLocaleString("en-IN")}`,
          weightedPipeline,
          weightedPipelineFormatted: `₹${weightedPipeline.toLocaleString("en-IN")}`,
          wonRevenue,
          wonRevenueFormatted: `₹${wonRevenue.toLocaleString("en-IN")}`,
          lostValue,
          lostValueFormatted: `₹${lostValue.toLocaleString("en-IN")}`,
        },
        currentUserRole: role,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      },
    };
  } catch (err) {
    console.error("getDealsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load deals",
      data: {
        deals: [],
        summary: {
          openDealsCount: 0,
          pipelineValue: 0,
          pipelineValueFormatted: "₹0",
          weightedPipeline: 0,
          weightedPipelineFormatted: "₹0",
          wonRevenue: 0,
          wonRevenueFormatted: "₹0",
          lostValue: 0,
          lostValueFormatted: "₹0",
        },
        pagination: { page: 1, limit: 25, totalCount: 0, totalPages: 0 },
      },
    };
  }
}

/**
 * Retrieves deals grouped by stage for Kanban Board view.
 */
export async function getDealsForPipelineBoardAction(pipelineId?: string) {
  try {
    const { workspaceId, role } = await requirePermission("deals.read");

    let activePipelineId = pipelineId;
    if (!activePipelineId) {
      const defaultPipeline = await ensureDefaultPipeline(workspaceId);
      activePipelineId = defaultPipeline.id;
    }

    const pipeline = await prisma.pipeline.findFirst({
      where: { id: activePipelineId, workspaceId },
      include: {
        stages: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!pipeline) {
      return { success: false, error: "Pipeline not found", data: null };
    }

    const deals = await prisma.deal.findMany({
      where: {
        workspaceId,
        pipelineId: activePipelineId,
      },
      orderBy: { expectedCloseDate: "asc" },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, name: true } },
        stage: { select: { id: true, name: true, color: true, isWon: true, isLost: true } },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const columns = pipeline.stages.map((stage) => {
      const stageDeals = deals.filter((d) => d.stageId === stage.id);
      const totalValue = stageDeals.reduce((sum, d) => sum + Number(d.value), 0);
      const weightedValue = stageDeals.reduce(
        (sum, d) => sum + Math.round((Number(d.value) * d.probability) / 100),
        0
      );

      return {
        stageId: stage.id,
        stageName: stage.name,
        order: stage.order,
        probability: stage.probability,
        color: stage.color || "#3B82F6",
        isWon: stage.isWon || stage.name.toLowerCase() === "won",
        isLost: stage.isLost || stage.name.toLowerCase() === "lost",
        totalValue,
        totalValueFormatted: `₹${totalValue.toLocaleString("en-IN")}`,
        weightedValue,
        weightedValueFormatted: `₹${weightedValue.toLocaleString("en-IN")}`,
        dealsCount: stageDeals.length,
        deals: stageDeals.map((d) => {
          const lastAct = d.activities[0]?.createdAt || null;
          const stale = d.status === DealStatus.OPEN && isDealStale(lastAct, d.updatedAt);

          return {
            id: d.id,
            name: d.name,
            valueNumeric: Number(d.value),
            valueFormatted: `₹${Number(d.value).toLocaleString("en-IN")}`,
            probability: d.probability,
            priority: d.priority || TaskPriority.MEDIUM,
            status: d.status,
            isStale: stale,
            expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.toISOString() : null,
            contactName: d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(" ") : null,
            companyName: d.company?.name || null,
            ownerName: d.owner?.name || d.ownerName,
            createdAt: d.createdAt.toISOString(),
          };
        }),
      };
    });

    return {
      success: true,
      data: {
        pipeline: {
          id: pipeline.id,
          name: pipeline.name,
          isDefault: pipeline.isDefault,
        },
        columns,
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getDealsForPipelineBoardAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load pipeline board",
      data: null,
    };
  }
}

/**
 * Retrieves full details for a single deal.
 */
export async function getDealByIdAction(id: string) {
  try {
    const { workspaceId, role } = await requirePermission("deals.read");

    const deal = await prisma.deal.findFirst({
      where: { id, workspaceId },
      include: {
        pipeline: {
          include: {
            stages: { orderBy: { order: "asc" } },
          },
        },
        stage: true,
        contact: true,
        company: true,
        owner: { select: { id: true, name: true, email: true } },
        invoices: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            invoiceNumber: true,
            customerName: true,
            status: true,
            total: true,
            amountPaid: true,
            balanceDue: true,
            issueDate: true,
            dueDate: true,
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        tasks: {
          orderBy: { dueDate: "asc" },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
        communications: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        followUps: {
          orderBy: { dueAt: "asc" },
        },
      },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    const valueNum = Number(deal.value);
    const weightedValue = Math.round((valueNum * deal.probability) / 100);
    const lastAct = deal.activities[0]?.createdAt || null;
    const stale = deal.status === DealStatus.OPEN && isDealStale(lastAct, deal.updatedAt);

    return {
      success: true,
      data: {
        ...deal,
        valueNumeric: valueNum,
        valueFormatted: `₹${valueNum.toLocaleString("en-IN")}`,
        weightedValue,
        weightedValueFormatted: `₹${weightedValue.toLocaleString("en-IN")}`,
        priority: deal.priority || TaskPriority.MEDIUM,
        isStale: stale,
        expectedCloseDate: deal.expectedCloseDate ? deal.expectedCloseDate.toISOString() : null,
        wonAt: deal.wonAt ? deal.wonAt.toISOString() : null,
        lostAt: deal.lostAt ? deal.lostAt.toISOString() : null,
        createdAt: deal.createdAt.toISOString(),
        updatedAt: deal.updatedAt.toISOString(),
        contact: deal.contact
          ? {
              ...deal.contact,
              fullName: [deal.contact.firstName, deal.contact.lastName].filter(Boolean).join(" "),
              createdAt: deal.contact.createdAt.toISOString(),
            }
          : null,
        company: deal.company
          ? {
              ...deal.company,
              createdAt: deal.company.createdAt.toISOString(),
            }
          : null,
        pipelineStages: deal.pipeline.stages.map((s) => ({
          id: s.id,
          name: s.name,
          order: s.order,
          probability: s.probability,
          color: s.color,
          isWon: s.isWon || s.name.toLowerCase() === "won",
          isLost: s.isLost || s.name.toLowerCase() === "lost",
        })),
        invoices: deal.invoices.map((inv) => ({
          ...inv,
          total: Number(inv.total),
          amountPaid: Number(inv.amountPaid),
          balanceDue: Number(inv.balanceDue),
          issueDate: inv.issueDate.toISOString(),
          dueDate: inv.dueDate.toISOString(),
        })),
        activities: deal.activities.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
        tasks: deal.tasks.map((t) => ({
          ...t,
          dueDate: t.dueDate.toISOString(),
          createdAt: t.createdAt.toISOString(),
        })),
        notes: deal.notes.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        communications: deal.communications.map((c) => ({
          ...c,
          scheduledAt: c.scheduledAt ? c.scheduledAt.toISOString() : null,
          completedAt: c.completedAt ? c.completedAt.toISOString() : null,
          createdAt: c.createdAt.toISOString(),
        })),
        followUps: deal.followUps.map((f) => ({
          ...f,
          dueAt: f.dueAt.toISOString(),
          completedAt: f.completedAt ? f.completedAt.toISOString() : null,
          createdAt: f.createdAt.toISOString(),
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getDealByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load deal" };
  }
}

/**
 * Creates a new deal in the workspace.
 */
export async function createDealAction(input: CreateDealInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.create");

    const validation = createDealSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid deal data",
      };
    }

    const data = validation.data;

    // Verify pipeline & stage belong to workspace
    const stage = await prisma.pipelineStage.findFirst({
      where: {
        id: data.stageId,
        pipelineId: data.pipelineId,
        workspaceId,
      },
    });

    if (!stage) {
      return { success: false, error: "Invalid pipeline or stage selected" };
    }

    // Verify contact if provided
    if (data.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { id: data.contactId, workspaceId },
      });
      if (!contact) {
        return { success: false, error: "Referenced contact not found in workspace" };
      }
    }

    // Verify company if provided
    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, workspaceId },
      });
      if (!company) {
        return { success: false, error: "Referenced company not found in workspace" };
      }
    }

    // If ownerId provided, verify membership
    let ownerName = data.ownerName || session.name;
    if (data.ownerId) {
      const member = await prisma.membership.findFirst({
        where: { userId: data.ownerId, workspaceId },
        include: { user: { select: { name: true } } },
      });
      if (!member) {
        return { success: false, error: "Assigned owner is not a member of this workspace" };
      }
      ownerName = member.user.name;
    }

    const probability = data.probability !== undefined ? data.probability : stage.probability;

    const newDeal = await prisma.$transaction(async (tx) => {
      const created = await tx.deal.create({
        data: {
          workspaceId,
          name: data.name,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          ownerId: data.ownerId || userId,
          ownerName,
          pipelineId: data.pipelineId,
          stageId: data.stageId,
          value: new Prisma.Decimal(data.value),
          currency: data.currency || "INR",
          probability,
          priority: data.priority || TaskPriority.MEDIUM,
          expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
          source: data.source || LeadSource.WEBSITE,
          description: data.description || null,
          status: DealStatus.OPEN,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId: created.id,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          userId,
          type: "deal_created",
          title: "Deal created",
          description: `Created opportunity "${created.name}" valued at ₹${Number(data.value).toLocaleString("en-IN")}`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_CREATED",
          entityType: "DEAL",
          entityId: created.id,
          metadata: JSON.stringify({
            name: created.name,
            value: data.value,
            stageId: data.stageId,
            probability,
            priority: data.priority,
          }),
        },
      });

      return created;
    });

    revalidatePath("/app/deals");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    // Emit domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.DEAL_CREATED,
        entityType: "DEAL",
        entityId: newDeal.id,
        payload: {
          id: newDeal.id,
          name: newDeal.name,
          value: Number(newDeal.value),
          stageId: newDeal.stageId,
          stageName: stage.name,
          probability: newDeal.probability,
          status: newDeal.status,
          priority: newDeal.priority,
          ownerName: newDeal.ownerName,
        },
        context: { source: "USER" },
      })
    );

    return {
      success: true,
      data: {
        id: newDeal.id,
        name: newDeal.name,
      },
    };
  } catch (err) {
    console.error("createDealAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create deal" };
  }
}

/**
 * Updates an existing deal.
 */
export async function updateDealAction(input: UpdateDealInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.update");

    const validation = updateDealSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || "Invalid deal data" };
    }

    const data = validation.data;
    if (!data.id) {
      return { success: false, error: "Deal ID is required" };
    }

    const deal = await prisma.deal.findFirst({
      where: { id: data.id, workspaceId },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    const updateData: Prisma.DealUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.value !== undefined) updateData.value = new Prisma.Decimal(data.value);
    if (data.currency !== undefined) updateData.currency = data.currency;
    if (data.probability !== undefined) updateData.probability = data.probability;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.expectedCloseDate !== undefined) {
      updateData.expectedCloseDate = data.expectedCloseDate ? new Date(data.expectedCloseDate) : null;
    }
    if (data.contactId !== undefined) updateData.contact = data.contactId ? { connect: { id: data.contactId } } : { disconnect: true };
    if (data.companyId !== undefined) updateData.company = data.companyId ? { connect: { id: data.companyId } } : { disconnect: true };

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: data.id },
        data: updateData,
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId: deal.id,
          userId,
          type: "deal_updated",
          title: "Deal updated",
          description: `Updated deal details for "${deal.name}"`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_UPDATED",
          entityType: "DEAL",
          entityId: deal.id,
          metadata: JSON.stringify(data),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${data.id}`);
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");

    return { success: true };
  } catch (err) {
    console.error("updateDealAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update deal" };
  }
}

/**
 * Updates a deal stage (e.g., Kanban drag and drop or stage progression bar).
 */
export async function updateDealStageAction(input: UpdateDealStageInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.move_stage");

    const validation = updateDealStageSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: "Invalid stage data" };
    }

    const { dealId, stageId } = validation.data;

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { stage: true },
    });

    if (!deal) {
      return { success: false, error: "Deal not found in workspace" };
    }

    // Verify stage belongs to same pipeline & workspace
    const newStage = await prisma.pipelineStage.findFirst({
      where: {
        id: stageId,
        pipelineId: deal.pipelineId,
        workspaceId,
      },
    });

    if (!newStage) {
      return { success: false, error: "Target stage does not belong to this pipeline" };
    }

    // Determine target stage characteristics
    const isTargetWon = newStage.isWon || newStage.name.toLowerCase() === "won";
    const isTargetLost = newStage.isLost || newStage.name.toLowerCase() === "lost";

    // Protection: If deal is already WON or LOST and moving to another non-terminal stage
    if (deal.status !== DealStatus.OPEN && newStage.id !== deal.stageId) {
      if (!isTargetWon && !isTargetLost) {
        return {
          success: false,
          error: `Deal is already ${deal.status}. Please reopen the deal to move it to active stages.`,
        };
      }
    }

    let newStatus: DealStatus = deal.status;
    let wonAt = deal.wonAt;
    let wonById = deal.wonById;
    let lostAt = deal.lostAt;
    let lostById = deal.lostById;
    let lostReason = deal.lostReason;
    let newProb = deal.probability;

    if (isTargetWon) {
      newStatus = DealStatus.WON;
      wonAt = new Date();
      wonById = userId;
      lostAt = null;
      lostById = null;
      lostReason = null;
      newProb = 100;
    } else if (isTargetLost) {
      newStatus = DealStatus.LOST;
      lostAt = new Date();
      lostById = userId;
      wonAt = null;
      wonById = null;
      if (!lostReason) lostReason = "OTHER";
      newProb = 0;
    } else {
      newStatus = DealStatus.OPEN;
      wonAt = null;
      wonById = null;
      lostAt = null;
      lostById = null;
      lostReason = null;
      newProb = newStage.probability;
    }

    const fromStageName = deal.stage.name;
    const toStageName = newStage.name;

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: dealId },
        data: {
          stageId: newStage.id,
          status: newStatus,
          probability: newProb,
          wonAt,
          wonById,
          lostAt,
          lostById,
          lostReason,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          userId,
          type: "deal_stage_changed",
          title: "Deal stage updated",
          description: `Moved deal "${deal.name}" from ${fromStageName} to ${toStageName}`,
          metadata: JSON.stringify({ fromStage: fromStageName, toStage: toStageName }),
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_STAGE_CHANGED",
          entityType: "DEAL",
          entityId: dealId,
          metadata: JSON.stringify({
            dealName: deal.name,
            fromStage: fromStageName,
            toStage: toStageName,
            newStatus,
          }),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${dealId}`);
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    // Emit appropriate domain events
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.DEAL_STAGE_CHANGED,
        entityType: "DEAL",
        entityId: dealId,
        payload: {
          id: dealId,
          name: deal.name,
          value: Number(deal.value),
          fromStageName,
          stageName: toStageName,
          stageId: newStage.id,
          probability: newProb,
          status: newStatus,
          ownerName: deal.ownerName,
        },
        context: { source: "USER" },
      })
    );

    if (newStatus === DealStatus.WON) {
      eventBus.publish(
        eventBus.createEvent({
          workspaceId,
          type: WorkflowTriggerType.DEAL_WON,
          entityType: "DEAL",
          entityId: dealId,
          payload: {
            id: dealId,
            name: deal.name,
            value: Number(deal.value),
            ownerName: deal.ownerName,
            wonAt: wonAt?.toISOString(),
          },
          context: { source: "USER" },
        })
      );
    } else if (newStatus === DealStatus.LOST) {
      eventBus.publish(
        eventBus.createEvent({
          workspaceId,
          type: WorkflowTriggerType.DEAL_LOST,
          entityType: "DEAL",
          entityId: dealId,
          payload: {
            id: dealId,
            name: deal.name,
            value: Number(deal.value),
            lostReason,
            ownerName: deal.ownerName,
            lostAt: lostAt?.toISOString(),
          },
          context: { source: "USER" },
        })
      );
    }

    return { success: true };
  } catch (err) {
    console.error("updateDealStageAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update stage" };
  }
}

/**
 * Marks a deal as WON with confirmation data.
 */
export async function markDealWonAction(input: MarkDealWonInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.mark_won");

    const validation = markDealWonSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: "Invalid deal data" };
    }

    const { dealId, wonAt } = validation.data;

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { pipeline: { include: { stages: true } } },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    // Find "Won" stage in pipeline
    const wonStage =
      deal.pipeline.stages.find((s) => s.isWon || s.name.toLowerCase() === "won") ||
      deal.pipeline.stages[deal.pipeline.stages.length - 1];

    const wonDate = wonAt ? new Date(wonAt) : new Date();

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: dealId },
        data: {
          status: DealStatus.WON,
          stageId: wonStage?.id || deal.stageId,
          probability: 100,
          wonAt: wonDate,
          wonById: userId,
          lostAt: null,
          lostById: null,
          lostReason: null,
          lossNotes: null,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          userId,
          type: "deal_won",
          title: "Deal Closed / Won 🎉",
          description: `Successfully closed deal "${deal.name}" for ₹${Number(deal.value).toLocaleString("en-IN")}`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_WON",
          entityType: "DEAL",
          entityId: dealId,
          metadata: JSON.stringify({
            dealName: deal.name,
            value: Number(deal.value),
            wonAt: wonDate.toISOString(),
          }),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${dealId}`);
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    // Emit domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.DEAL_WON,
        entityType: "DEAL",
        entityId: dealId,
        payload: {
          id: dealId,
          name: deal.name,
          value: Number(deal.value),
          ownerName: deal.ownerName,
          wonAt: wonDate.toISOString(),
        },
        context: { source: "USER" },
      })
    );

    return { success: true };
  } catch (err) {
    console.error("markDealWonAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to mark deal as won" };
  }
}

/**
 * Marks a deal as LOST with structured reason.
 */
export async function markDealLostAction(input: MarkDealLostInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.mark_lost");

    const validation = markDealLostSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Lost reason is required",
      };
    }

    const { dealId, lostReason, notes } = validation.data;

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { pipeline: { include: { stages: true } } },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    // Find "Lost" stage in pipeline
    const lostStage =
      deal.pipeline.stages.find((s) => s.isLost || s.name.toLowerCase() === "lost") ||
      deal.pipeline.stages[deal.pipeline.stages.length - 1];

    const lostDate = new Date();

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: dealId },
        data: {
          status: DealStatus.LOST,
          stageId: lostStage?.id || deal.stageId,
          probability: 0,
          lostAt: lostDate,
          lostById: userId,
          wonAt: null,
          wonById: null,
          lostReason,
          lossNotes: notes || null,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          userId,
          type: "deal_lost",
          title: `Deal Lost: ${lostReason}`,
          description: notes
            ? `Opportunity marked lost due to: ${lostReason}. Details: ${notes}`
            : `Opportunity marked lost due to: ${lostReason}`,
          metadata: JSON.stringify({ lostReason, notes }),
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_LOST",
          entityType: "DEAL",
          entityId: dealId,
          metadata: JSON.stringify({
            dealName: deal.name,
            lostReason,
            notes,
            value: Number(deal.value),
          }),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${dealId}`);
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    // Emit domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.DEAL_LOST,
        entityType: "DEAL",
        entityId: dealId,
        payload: {
          id: dealId,
          name: deal.name,
          value: Number(deal.value),
          lostReason,
          notes,
          ownerName: deal.ownerName,
        },
        context: { source: "USER" },
      })
    );

    return { success: true };
  } catch (err) {
    console.error("markDealLostAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to mark deal as lost" };
  }
}

/**
 * Reopens a Won or Lost deal back to Open status.
 */
export async function reopenDealAction(input: ReopenDealInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.update");

    const validation = reopenDealSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: "Invalid deal data" };
    }

    const { dealId, stageId } = validation.data;

    const deal = await prisma.deal.findFirst({
      where: { id: dealId, workspaceId },
      include: { pipeline: { include: { stages: { orderBy: { order: "asc" } } } } },
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    // Pick target stage (first non-won/lost stage or provided stage)
    let targetStage = deal.pipeline.stages.find((s) => s.id === stageId);
    if (!targetStage) {
      targetStage =
        deal.pipeline.stages.find(
          (s) => !s.isWon && !s.isLost && s.name.toLowerCase() !== "won" && s.name.toLowerCase() !== "lost"
        ) || deal.pipeline.stages[0];
    }

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: dealId },
        data: {
          status: DealStatus.OPEN,
          stageId: targetStage.id,
          probability: targetStage.probability || 10,
          wonAt: null,
          wonById: null,
          lostAt: null,
          lostById: null,
          lostReason: null,
          lossNotes: null,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          userId,
          type: "deal_reopened",
          title: "Deal Reopened",
          description: `Reopened opportunity "${deal.name}" and placed into "${targetStage.name}" stage`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_REOPENED",
          entityType: "DEAL",
          entityId: dealId,
          metadata: JSON.stringify({
            dealName: deal.name,
            targetStage: targetStage.name,
          }),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${dealId}`);
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (err) {
    console.error("reopenDealAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to reopen deal" };
  }
}

/**
 * Assigns or reassigns a deal to a workspace member.
 */
export async function assignDealAction(input: AssignDealInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.assign");

    const validation = assignDealSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: "Invalid assignment data" };
    }

    const { dealId, ownerId } = validation.data;

    const [deal, member] = await Promise.all([
      prisma.deal.findFirst({ where: { id: dealId, workspaceId } }),
      prisma.membership.findFirst({
        where: { userId: ownerId, workspaceId },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ]);

    if (!deal) return { success: false, error: "Deal not found" };
    if (!member) return { success: false, error: "Selected user is not a member of this workspace" };

    if (deal.ownerId === ownerId) {
      return { success: true, message: "Deal is already assigned to this user" };
    }

    const previousOwnerName = deal.ownerName;
    const newOwnerName = member.user.name;

    await prisma.$transaction(async (tx) => {
      await tx.deal.update({
        where: { id: dealId },
        data: {
          ownerId,
          ownerName: newOwnerName,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          userId,
          type: "deal_assigned",
          title: "Deal reassigned",
          description: `Deal reassigned from ${previousOwnerName} to ${newOwnerName}`,
          author: session.name,
        },
      });

      // Notification for new owner
      if (ownerId !== userId) {
        await tx.notification.create({
          data: {
            workspaceId,
            userId: ownerId,
            title: "New Deal Assigned",
            description: `You have been assigned to deal "${deal.name}" (₹${Number(deal.value).toLocaleString("en-IN")})`,
            type: "deal_assigned",
            link: `/app/deals/${dealId}`,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_ASSIGNED",
          entityType: "DEAL",
          entityId: dealId,
          metadata: JSON.stringify({
            dealName: deal.name,
            previousOwnerName,
            newOwnerId: ownerId,
            newOwnerName,
          }),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath(`/app/deals/${dealId}`);
    return { success: true };
  } catch (err) {
    console.error("assignDealAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to assign deal" };
  }
}

/**
 * Performs bulk actions on multiple deals.
 */
export async function bulkUpdateDealsAction(input: BulkUpdateDealsInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.update");

    const validation = bulkUpdateDealsSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: validation.error.issues[0]?.message || "Invalid bulk update payload" };
    }

    const { dealIds, action, stageId, ownerId, priority } = validation.data;

    // Verify all deals belong to workspace
    const existingDeals = await prisma.deal.findMany({
      where: { id: { in: dealIds }, workspaceId },
    });

    if (existingDeals.length === 0) {
      return { success: false, error: "No matching deals found in workspace" };
    }

    const validIds = existingDeals.map((d) => d.id);

    if (action === "MOVE_STAGE") {
      if (!stageId) return { success: false, error: "Stage ID is required for moving deals" };
      const targetStage = await prisma.pipelineStage.findFirst({
        where: { id: stageId, workspaceId },
      });
      if (!targetStage) return { success: false, error: "Target stage not found" };

      await prisma.$transaction(async (tx) => {
        await tx.deal.updateMany({
          where: { id: { in: validIds } },
          data: {
            stageId: targetStage.id,
            probability: targetStage.probability,
          },
        });

        for (const deal of existingDeals) {
          await tx.activity.create({
            data: {
              workspaceId,
              dealId: deal.id,
              userId,
              type: "deal_stage_changed",
              title: "Bulk stage update",
              description: `Bulk moved deal "${deal.name}" to ${targetStage.name}`,
              author: session.name,
            },
          });
        }
      });
    } else if (action === "ASSIGN_OWNER") {
      if (!ownerId) return { success: false, error: "Owner ID is required" };
      const member = await prisma.membership.findFirst({
        where: { userId: ownerId, workspaceId },
        include: { user: { select: { name: true } } },
      });
      if (!member) return { success: false, error: "Target owner is not a member of this workspace" };

      await prisma.$transaction(async (tx) => {
        await tx.deal.updateMany({
          where: { id: { in: validIds } },
          data: {
            ownerId,
            ownerName: member.user.name,
          },
        });

        for (const deal of existingDeals) {
          await tx.activity.create({
            data: {
              workspaceId,
              dealId: deal.id,
              userId,
              type: "deal_assigned",
              title: "Bulk reassignment",
              description: `Bulk reassigned deal "${deal.name}" to ${member.user.name}`,
              author: session.name,
            },
          });
        }
      });
    } else if (action === "UPDATE_PRIORITY") {
      if (!priority) return { success: false, error: "Priority is required" };
      await prisma.deal.updateMany({
        where: { id: { in: validIds } },
        data: { priority },
      });
    } else if (action === "DELETE") {
      const { role } = await requirePermission("deals.delete");
      await prisma.deal.deleteMany({
        where: { id: { in: validIds } },
      });
    }

    revalidatePath("/app/deals");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");

    return {
      success: true,
      updatedCount: validIds.length,
      failedCount: dealIds.length - validIds.length,
    };
  } catch (err) {
    console.error("bulkUpdateDealsAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to execute bulk action" };
  }
}

/**
 * Adds a note to a deal.
 */
export async function addDealNoteAction(params: { dealId: string; content: string }) {
  try {
    const { workspaceId, userId, session } = await requirePermission("deals.update");
    if (!params.content || params.content.trim() === "") {
      return { success: false, error: "Note content cannot be empty" };
    }

    const deal = await prisma.deal.findFirst({
      where: { id: params.dealId, workspaceId },
    });

    if (!deal) return { success: false, error: "Deal not found" };

    await prisma.$transaction(async (tx) => {
      await tx.note.create({
        data: {
          workspaceId,
          dealId: deal.id,
          userId,
          authorName: session.name,
          content: params.content.trim(),
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId: deal.id,
          userId,
          type: "note_added",
          title: "Note added",
          description: params.content.trim().slice(0, 100),
          author: session.name,
        },
      });
    });

    revalidatePath(`/app/deals/${params.dealId}`);
    return { success: true };
  } catch (err) {
    console.error("addDealNoteAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to add note" };
  }
}

/**
 * Creates a task linked to a deal.
 */
export async function createDealTaskAction(params: {
  dealId: string;
  title: string;
  dueDate: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  description?: string;
  assignedToId?: string;
}) {
  try {
    const { workspaceId, userId, session } = await requirePermission("tasks.create");
    if (!params.title || params.title.trim() === "") {
      return { success: false, error: "Task title is required" };
    }

    const deal = await prisma.deal.findFirst({
      where: { id: params.dealId, workspaceId },
    });

    if (!deal) return { success: false, error: "Deal not found" };

    let assignedName: string | null = null;
    if (params.assignedToId) {
      const user = await prisma.user.findUnique({ where: { id: params.assignedToId } });
      assignedName = user?.name || null;
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.create({
        data: {
          workspaceId,
          dealId: deal.id,
          title: params.title.trim(),
          description: params.description || null,
          dueDate: new Date(params.dueDate),
          priority: (params.priority as TaskPriority) || TaskPriority.MEDIUM,
          assignedToId: params.assignedToId || userId,
          assignedToName: assignedName || session.name,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          dealId: deal.id,
          userId,
          type: "task_created",
          title: "Task created",
          description: `Created task: ${params.title.trim()}`,
          author: session.name,
        },
      });
    });

    revalidatePath(`/app/deals/${params.dealId}`);
    return { success: true };
  } catch (err) {
    console.error("createDealTaskAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create task" };
  }
}

/**
 * Deletes a deal from workspace.
 */
export async function deleteDealAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("deals.delete");

    const deal = await prisma.deal.findFirst({
      where: { id, workspaceId },
    });

    if (!deal) return { success: false, error: "Deal not found" };

    await prisma.$transaction(async (tx) => {
      await tx.deal.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "DEAL_DELETED",
          entityType: "DEAL",
          entityId: id,
          metadata: JSON.stringify({ name: deal.name }),
        },
      });
    });

    revalidatePath("/app/deals");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/reports/sales");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (err) {
    console.error("deleteDealAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete deal" };
  }
}
