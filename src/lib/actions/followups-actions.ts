"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  followUpFilterSchema,
  CreateFollowUpInput,
  CompleteFollowUpInput,
  RescheduleFollowUpInput,
  FollowUpFilterInput,
  FollowUpStatus,
  FollowUpType,
  CommunicationType,
  CommunicationStatus,
} from "@/lib/validations/communications";
import { createAuditLog } from "@/lib/services/audit-service";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// 1. LIST FOLLOW-UPS (WITH SMART TIME-BASED FILTERS)
// ---------------------------------------------------------------------------

export async function getFollowUpsListAction(rawFilters: Partial<FollowUpFilterInput> = {}) {
  try {
    const { workspaceId } = await requirePermission("followups.read");
    const filters = followUpFilterSchema.parse({
      page: 1,
      limit: 50,
      tab: "TODAY",
      ...rawFilters,
    });

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);

    const where: any = {
      workspaceId,
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    // Apply smart tabs
    switch (filters.tab) {
      case "TODAY":
        where.status = { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] };
        where.dueAt = {
          gte: startOfToday,
          lte: endOfToday,
        };
        break;

      case "TOMORROW":
        where.status = { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] };
        where.dueAt = {
          gte: startOfTomorrow,
          lte: endOfTomorrow,
        };
        break;

      case "THIS_WEEK":
        where.status = { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] };
        where.dueAt = {
          gte: startOfWeek,
          lte: endOfWeek,
        };
        break;

      case "OVERDUE":
        where.status = { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] };
        where.dueAt = {
          lt: now,
        };
        break;

      case "UPCOMING":
        where.status = { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] };
        where.dueAt = {
          gte: now,
        };
        break;

      case "COMPLETED":
        where.status = FollowUpStatus.COMPLETED;
        break;

      case "ALL":
      default:
        // no time or status constraints
        break;
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { notes: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
        { outcome: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          lead: {
            select: { id: true, name: true, email: true, phone: true, company: true, status: true },
          },
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, jobTitle: true },
          },
          company: {
            select: { id: true, name: true, industry: true },
          },
          deal: {
            select: { id: true, name: true, value: true, stage: { select: { name: true } } },
          },
          communication: {
            select: { id: true, type: true, subject: true, scheduledAt: true, status: true },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.followUp.count({ where }),
    ]);

    // Compute dynamic overdue flag on items
    const enrichedItems = items.map((item) => {
      const isOverdue =
        item.status !== FollowUpStatus.COMPLETED &&
        item.status !== FollowUpStatus.CANCELLED &&
        new Date(item.dueAt) < now;
      return {
        ...item,
        isOverdue,
      };
    });

    return {
      success: true,
      data: {
        items: enrichedItems,
        totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit) || 1,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch follow-ups",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. FOLLOW-UP METRICS
// ---------------------------------------------------------------------------

export async function getFollowUpMetricsAction() {
  try {
    const { workspaceId } = await requirePermission("followups.read");

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
    const endOfTomorrow = new Date(endOfToday.getTime() + 24 * 60 * 60 * 1000);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

    const [
      totalCount,
      overdueCount,
      todayCount,
      tomorrowCount,
      completedMonthCount,
      totalCompleted,
    ] = await Promise.all([
      prisma.followUp.count({ where: { workspaceId } }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] },
          dueAt: { lt: now },
        },
      }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] },
          dueAt: { gte: startOfToday, lte: endOfToday },
        },
      }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: { notIn: [FollowUpStatus.COMPLETED, FollowUpStatus.CANCELLED] },
          dueAt: { gte: startOfTomorrow, lte: endOfTomorrow },
        },
      }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: FollowUpStatus.COMPLETED,
          completedAt: { gte: startOfMonth },
        },
      }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: FollowUpStatus.COMPLETED,
        },
      }),
    ]);

    const completionRate =
      totalCount > 0 ? Math.round((totalCompleted / totalCount) * 100) : 0;

    return {
      success: true,
      data: {
        totalCount,
        overdueCount,
        todayCount,
        tomorrowCount,
        completedMonthCount,
        totalCompleted,
        completionRate,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch follow-up metrics",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. CREATE FOLLOW-UP
// ---------------------------------------------------------------------------

export async function createFollowUpAction(rawInput: CreateFollowUpInput) {
  try {
    const { session, workspaceId } = await requirePermission("followups.create");
    const input = createFollowUpSchema.parse(rawInput);

    const userName = session.name || session.email || "User";
    const dueDate = new Date(input.dueAt);

    const followUp = await prisma.followUp.create({
      data: {
        workspaceId,
        title: input.title,
        type: input.type,
        dueAt: dueDate,
        notes: input.notes || null,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        communicationId: input.communicationId || undefined,
        ownerId: input.ownerId || session.userId,
        ownerName: userName,
      },
    });

    // Create Activity
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        userId: session.userId,
        type: "FOLLOWUP_CREATED",
        title: `Scheduled follow-up: ${input.title}`,
        description: `Due: ${dueDate.toLocaleString()} | Type: ${input.type}`,
        author: userName,
        metadata: JSON.stringify({ followUpId: followUp.id, type: input.type }),
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "FOLLOWUP_CREATED",
      entityType: "FOLLOW_UP",
      entityId: followUp.id,
      metadata: { title: input.title, dueAt: dueDate.toISOString(), type: input.type },
    });

    revalidatePath("/app/follow-ups");
    revalidatePath("/app/follow-ups/calendar");
    revalidatePath("/app/communications");

    return {
      success: true,
      data: followUp,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create follow-up",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. COMPLETE FOLLOW-UP (WITH OUTCOME & OPTIONAL NEXT STEP)
// ---------------------------------------------------------------------------

export async function completeFollowUpAction(rawInput: CompleteFollowUpInput) {
  try {
    const { session, workspaceId } = await requirePermission("followups.update");
    const input = completeFollowUpSchema.parse(rawInput);

    const existing = await prisma.followUp.findUnique({
      where: { id: input.id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Follow-up not found" };
    }

    const userName = session.name || session.email || "User";

    const completed = await prisma.followUp.update({
      where: { id: input.id },
      data: {
        status: FollowUpStatus.COMPLETED,
        completedAt: new Date(),
        outcome: input.outcome,
        completionNotes: input.completionNotes || null,
      },
    });

    // Create Activity
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: existing.leadId,
        contactId: existing.contactId,
        companyId: existing.companyId,
        dealId: existing.dealId,
        userId: session.userId,
        type: "FOLLOWUP_COMPLETED",
        title: `Completed follow-up: ${existing.title}`,
        description: `Outcome: ${input.outcome}${input.completionNotes ? ` | Notes: ${input.completionNotes}` : ""}`,
        author: userName,
        metadata: JSON.stringify({
          followUpId: existing.id,
          outcome: input.outcome,
        }),
      },
    });

    // Optionally schedule next follow-up
    let nextFollowUp = null;
    if (input.createNextFollowUp && input.nextFollowUpDueAt) {
      nextFollowUp = await prisma.followUp.create({
        data: {
          workspaceId,
          type: input.nextFollowUpType || existing.type,
          title: input.nextFollowUpTitle || `Next follow-up after: ${existing.title}`,
          dueAt: new Date(input.nextFollowUpDueAt),
          notes: `Created from previous follow-up outcome: "${input.outcome}"`,
          leadId: existing.leadId,
          contactId: existing.contactId,
          companyId: existing.companyId,
          dealId: existing.dealId,
          ownerId: session.userId,
          ownerName: userName,
        },
      });
    }

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "FOLLOWUP_COMPLETED",
      entityType: "FOLLOW_UP",
      entityId: input.id,
      metadata: {
        outcome: input.outcome,
        nextFollowUpId: nextFollowUp?.id,
      },
    });

    revalidatePath("/app/follow-ups");
    revalidatePath("/app/follow-ups/calendar");
    revalidatePath("/app/communications");

    return {
      success: true,
      data: completed,
      nextFollowUp,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to complete follow-up",
    };
  }
}

// ---------------------------------------------------------------------------
// 5. RESCHEDULE FOLLOW-UP
// ---------------------------------------------------------------------------

export async function rescheduleFollowUpAction(rawInput: RescheduleFollowUpInput) {
  try {
    const { session, workspaceId } = await requirePermission("followups.update");
    const input = rescheduleFollowUpSchema.parse(rawInput);

    const existing = await prisma.followUp.findUnique({
      where: { id: input.id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Follow-up not found" };
    }

    const newDueDate = new Date(input.dueAt);

    const updated = await prisma.followUp.update({
      where: { id: input.id },
      data: {
        dueAt: newDueDate,
        status: FollowUpStatus.UPCOMING,
        notes: input.notes
          ? `${existing.notes ? `${existing.notes}\n` : ""}[Rescheduled to ${newDueDate.toLocaleDateString()}]: ${input.notes}`
          : existing.notes,
      },
    });

    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: existing.leadId,
        contactId: existing.contactId,
        companyId: existing.companyId,
        dealId: existing.dealId,
        userId: session.userId,
        type: "FOLLOWUP_RESCHEDULED",
        title: `Rescheduled follow-up: ${existing.title}`,
        description: `New Due Date: ${newDueDate.toLocaleString()}${input.notes ? ` | Reason: ${input.notes}` : ""}`,
        author: session.name || session.email || "User",
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "FOLLOWUP_RESCHEDULED",
      entityType: "FOLLOW_UP",
      entityId: input.id,
      metadata: {
        previousDueAt: existing.dueAt.toISOString(),
        newDueAt: newDueDate.toISOString(),
      },
    });

    revalidatePath("/app/follow-ups");
    revalidatePath("/app/follow-ups/calendar");
    revalidatePath("/app/communications");

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to reschedule follow-up",
    };
  }
}

// ---------------------------------------------------------------------------
// 6. CANCEL FOLLOW-UP
// ---------------------------------------------------------------------------

export async function cancelFollowUpAction(id: string) {
  try {
    const { session, workspaceId } = await requirePermission("followups.delete");

    const existing = await prisma.followUp.findUnique({
      where: { id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Follow-up not found" };
    }

    const updated = await prisma.followUp.update({
      where: { id },
      data: {
        status: FollowUpStatus.CANCELLED,
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "FOLLOWUP_CANCELLED",
      entityType: "FOLLOW_UP",
      entityId: id,
      metadata: { title: existing.title },
    });

    revalidatePath("/app/follow-ups");
    revalidatePath("/app/follow-ups/calendar");

    return { success: true, data: updated };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to cancel follow-up",
    };
  }
}

// ---------------------------------------------------------------------------
// 7. AGGREGATED CALENDAR EVENTS FEED (DAY / WEEK / MONTH)
// ---------------------------------------------------------------------------

export interface CalendarEvent {
  id: string;
  title: string;
  eventType: "FOLLOW_UP" | "MEETING" | "CALL";
  channelType: FollowUpType | CommunicationType;
  start: string;
  end: string;
  status: string;
  isOverdue?: boolean;
  notes?: string | null;
  locationOrLink?: string | null;
  ownerName: string;
  entityName?: string | null;
  entityType?: "LEAD" | "CONTACT" | "DEAL" | "COMPANY" | null;
  entityId?: string | null;
}

export async function getCalendarEventsAction(startDateStr: string, endDateStr: string) {
  try {
    const { workspaceId } = await requirePermission("followups.read");

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const now = new Date();

    // 1. Fetch Follow-ups
    const followUps = await prisma.followUp.findMany({
      where: {
        workspaceId,
        dueAt: { gte: start, lte: end },
        status: { not: FollowUpStatus.CANCELLED },
      },
      include: {
        lead: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    });

    // 2. Fetch Scheduled Meetings & Calls
    const communications = await prisma.communication.findMany({
      where: {
        workspaceId,
        type: { in: [CommunicationType.MEETING, CommunicationType.CALL] },
        scheduledAt: { gte: start, lte: end },
        status: { not: CommunicationStatus.CANCELLED },
      },
      include: {
        lead: { select: { id: true, name: true } },
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
      },
    });

    const events: CalendarEvent[] = [];

    // Map follow-ups
    for (const f of followUps as any[]) {
      const entity = f.lead
        ? { type: "LEAD" as const, id: f.lead.id, name: f.lead.name }
        : f.contact
        ? { type: "CONTACT" as const, id: f.contact.id, name: `${f.contact.firstName} ${f.contact.lastName || ""}`.trim() }
        : f.deal
        ? { type: "DEAL" as const, id: f.deal.id, name: f.deal.name }
        : f.company
        ? { type: "COMPANY" as const, id: f.company.id, name: f.company.name }
        : null;

      const isOverdue =
        f.status !== FollowUpStatus.COMPLETED && new Date(f.dueAt) < now;

      events.push({
        id: `fu_${f.id}`,
        title: f.title,
        eventType: "FOLLOW_UP",
        channelType: f.type,
        start: f.dueAt.toISOString(),
        end: new Date(new Date(f.dueAt).getTime() + 30 * 60000).toISOString(),
        status: f.status,
        isOverdue,
        notes: f.notes,
        ownerName: f.ownerName,
        entityName: entity?.name,
        entityType: entity?.type,
        entityId: entity?.id,
      });
    }

    // Map scheduled meetings / calls
    for (const c of communications as any[]) {
      // Skip if already represented by a follow-up with communicationId
      const hasMatchingFollowup = (followUps as any[]).some((fu) => fu.communicationId === c.id);
      if (hasMatchingFollowup) continue;

      const entity = c.lead
        ? { type: "LEAD" as const, id: c.lead.id, name: c.lead.name }
        : c.contact
        ? { type: "CONTACT" as const, id: c.contact.id, name: `${c.contact.firstName} ${c.contact.lastName || ""}`.trim() }
        : c.deal
        ? { type: "DEAL" as const, id: c.deal.id, name: c.deal.name }
        : c.company
        ? { type: "COMPANY" as const, id: c.company.id, name: c.company.name }
        : null;

      const eventStart = c.meetingStart || c.scheduledAt || c.createdAt;
      const eventEnd = c.meetingEnd || new Date(new Date(eventStart).getTime() + 30 * 60000);

      events.push({
        id: `comm_${c.id}`,
        title: c.subject || `${c.type} Session`,
        eventType: c.type === CommunicationType.MEETING ? "MEETING" : "CALL",
        channelType: c.type,
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        status: c.meetingStatus || c.status,
        notes: c.content,
        locationOrLink: c.meetingLink || c.meetingLocation,
        ownerName: c.ownerName,
        entityName: entity?.name,
        entityType: entity?.type,
        entityId: entity?.id,
      });
    }

    // Sort by event start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return {
      success: true,
      data: events,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch calendar events",
    };
  }
}
