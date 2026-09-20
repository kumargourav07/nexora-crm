"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  CreateLeadInput,
  UpdateLeadInput,
} from "@/lib/validations/crm";
import { LeadStatus, LeadSource, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { eventBus } from "@/lib/events/event-bus";
import { WorkflowTriggerType } from "@/lib/validations/automations";

export interface GetLeadsParams {
  search?: string;
  status?: LeadStatus | "ALL";
  source?: LeadSource | "ALL";
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "value" | "name";
  sortOrder?: "asc" | "desc";
}

/**
 * Reads leads strictly scoped to the authenticated user's workspace.
 * Requires `leads.read` permission.
 */
export async function getLeadsAction(params: GetLeadsParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("leads.read");

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.LeadWhereInput = {
      workspaceId,
    };

    if (params.status && params.status !== "ALL") {
      where.status = params.status;
    }

    if (params.source && params.source !== "ALL") {
      where.source = params.source;
    }

    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { company: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { ownerName: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.LeadOrderByWithRelationInput = {
      [params.sortBy || "createdAt"]: params.sortOrder || "desc",
    };

    const [leads, totalCount] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          activities: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    const formattedLeads = leads.map((lead) => ({
      ...lead,
      valueNumeric: Number(lead.value),
      valueFormatted: `₹${(Number(lead.value) / 100000).toFixed(1)}L`,
      tags: typeof lead.tags === "string" ? JSON.parse(lead.tags || "[]") : lead.tags,
      createdAt: lead.createdAt.toISOString(),
      updatedAt: lead.updatedAt.toISOString(),
      activities: lead.activities.map((a) => ({
        id: a.id,
        type: a.type,
        title: a.title,
        description: a.description,
        timestamp: a.createdAt.toISOString(),
        author: a.author,
      })),
    }));

    return {
      success: true,
      data: {
        leads: formattedLeads,
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
    console.error("getLeadsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to fetch leads from database",
      data: { leads: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } },
    };
  }
}

/**
 * Retrieves a single lead strictly scoped to workspace.
 * Requires `leads.read` permission.
 */
export async function getLeadByIdAction(id: string) {
  try {
    const { workspaceId } = await requirePermission("leads.read");

    const lead = await prisma.lead.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: {
        activities: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!lead) {
      return { success: false, error: "Lead not found" };
    }

    return {
      success: true,
      data: {
        ...lead,
        valueNumeric: Number(lead.value),
        valueFormatted: `₹${(Number(lead.value) / 100000).toFixed(1)}L`,
        tags: typeof lead.tags === "string" ? JSON.parse(lead.tags || "[]") : lead.tags,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
        activities: lead.activities.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          description: a.description,
          timestamp: a.createdAt.toISOString(),
          author: a.author,
        })),
      },
    };
  } catch (err) {
    console.error("getLeadByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unable to load lead details" };
  }
}

/**
 * Creates a new lead in workspace.
 * Requires `leads.create` permission.
 */
export async function createLeadAction(input: CreateLeadInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("leads.create");

    const validation = createLeadSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid lead data",
      };
    }

    const data = validation.data;

    const newLead = await prisma.$transaction(async (tx) => {
      const created = await tx.lead.create({
        data: {
          workspaceId,
          name: data.name,
          company: data.company,
          email: data.email,
          phone: data.phone,
          source: data.source,
          status: data.status,
          ownerName: data.ownerName || session.name,
          value: new Prisma.Decimal(data.value),
          tags: JSON.stringify(data.tags || []),
          notes: data.notes,
        },
      });

      // Timeline activity
      await tx.activity.create({
        data: {
          workspaceId,
          leadId: created.id,
          userId: session.userId,
          type: "lead_created",
          title: `Lead created via ${data.source}`,
          description: `New inbound inquiry from ${data.company} added with value ₹${(data.value / 100000).toFixed(1)}L`,
          author: session.name,
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "LEAD_CREATED",
          entityType: "LEAD",
          entityId: created.id,
          metadata: JSON.stringify({
            name: created.name,
            company: created.company,
            value: data.value,
            source: data.source,
            status: data.status,
          }),
        },
      });

      return created;
    });

    revalidatePath("/app/leads");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    // Publish domain event asynchronously for workflow engine
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.LEAD_CREATED,
        entityType: "LEAD",
        entityId: newLead.id,
        payload: {
          id: newLead.id,
          name: newLead.name,
          company: newLead.company,
          email: newLead.email,
          phone: newLead.phone,
          source: newLead.source,
          status: newLead.status,
          value: Number(newLead.value),
          ownerName: newLead.ownerName,
        },
        context: { source: "USER" },
      })
    );

    return {
      success: true,
      data: {
        id: newLead.id,
        name: newLead.name,
      },
    };
  } catch (err) {
    console.error("createLeadAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create lead in database",
    };
  }
}

/**
 * Updates an existing lead.
 * Requires `leads.update` permission.
 */
export async function updateLeadAction(id: string, input: UpdateLeadInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("leads.update");

    const validation = updateLeadSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid update data",
      };
    }

    const data = validation.data;

    // Verify lead belongs to workspace
    const existing = await prisma.lead.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Lead not found in this workspace" };
    }

    const updateData: Prisma.LeadUpdateInput = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.company !== undefined) updateData.company = data.company;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.source !== undefined) updateData.source = data.source;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.ownerName !== undefined) updateData.ownerName = data.ownerName;
    if (data.value !== undefined) updateData.value = new Prisma.Decimal(data.value);
    if (data.tags !== undefined) updateData.tags = JSON.stringify(data.tags);
    if (data.notes !== undefined) updateData.notes = data.notes;

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id },
        data: updateData,
      });

      if (data.status && data.status !== existing.status) {
        await tx.activity.create({
          data: {
            workspaceId,
            leadId: id,
            userId: session.userId,
            type: "status_change",
            title: `Status changed to ${data.status}`,
            description: `Moved stage from ${existing.status} to ${data.status}`,
            author: session.name,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: data.status && data.status !== existing.status ? "LEAD_STATUS_CHANGED" : "LEAD_UPDATED",
          entityType: "LEAD",
          entityId: id,
          metadata: JSON.stringify({
            leadName: existing.name,
            previousStatus: existing.status,
            newStatus: data.status || existing.status,
            fieldsUpdated: Object.keys(data),
          }),
        },
      });
    });

    revalidatePath("/app/leads");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    // Publish domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.LEAD_UPDATED,
        entityType: "LEAD",
        entityId: id,
        payload: {
          id,
          name: data.name ?? existing.name,
          company: data.company ?? existing.company,
          status: data.status ?? existing.status,
          source: data.source ?? existing.source,
          value: data.value ?? Number(existing.value),
          ownerName: data.ownerName ?? existing.ownerName,
        },
        context: { source: "USER" },
      })
    );

    return { success: true };
  } catch (err) {
    console.error("updateLeadAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update lead" };
  }
}

/**
 * Dedicated status update action for Kanban Pipeline.
 * Requires `leads.update` permission.
 */
export async function updateLeadStatusAction(leadId: string, newStatus: LeadStatus) {
  try {
    const { workspaceId, userId, session } = await requirePermission("leads.update");

    const validation = updateLeadStatusSchema.safeParse({ leadId, status: newStatus });
    if (!validation.success) {
      return { success: false, error: "Invalid status" };
    }

    const existing = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Lead not found" };
    }

    if (existing.status === newStatus) {
      return { success: true };
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.update({
        where: { id: leadId },
        data: { status: newStatus },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          leadId,
          userId: session.userId,
          type: "status_change",
          title: `Deal advanced to ${newStatus}`,
          description: `Stage updated from ${existing.status} to ${newStatus} in pipeline`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "LEAD_STATUS_CHANGED",
          entityType: "LEAD",
          entityId: leadId,
          metadata: JSON.stringify({
            leadName: existing.name,
            previousStatus: existing.status,
            newStatus,
          }),
        },
      });
    });

    revalidatePath("/app/pipeline");
    revalidatePath("/app/leads");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    // Publish domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.LEAD_STATUS_CHANGED,
        entityType: "LEAD",
        entityId: leadId,
        payload: {
          id: leadId,
          name: existing.name,
          company: existing.company,
          previousStatus: existing.status,
          status: newStatus,
          value: Number(existing.value),
          source: existing.source,
        },
        context: { source: "USER" },
      })
    );

    return { success: true };
  } catch (err) {
    console.error("updateLeadStatusAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unable to update stage" };
  }
}

/**
 * Deletes a lead.
 * Requires `leads.delete` permission (Manager/Admin/Owner only, Member is blocked).
 */
export async function deleteLeadAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("leads.delete");

    const existing = await prisma.lead.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Lead not found in this workspace" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.lead.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "LEAD_DELETED",
          entityType: "LEAD",
          entityId: id,
          metadata: JSON.stringify({
            leadName: existing.name,
            company: existing.company,
            value: Number(existing.value),
          }),
        },
      });
    });

    revalidatePath("/app/leads");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    return { success: true };
  } catch (err) {
    console.error("deleteLeadAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unable to delete lead" };
  }
}
