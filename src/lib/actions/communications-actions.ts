"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  logCallSchema,
  scheduleMeetingSchema,
  updateMeetingStatusSchema,
  sendEmailSchema,
  logMessageSchema,
  createTemplateSchema,
  updateTemplateSchema,
  communicationFilterSchema,
  LogCallInput,
  ScheduleMeetingInput,
  UpdateMeetingStatusInput,
  SendEmailInput,
  LogMessageInput,
  CreateTemplateInput,
  UpdateTemplateInput,
  CommunicationFilterInput,
  STARTER_COMMUNICATION_TEMPLATES,
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  CallOutcome,
  MeetingStatus,
  FollowUpStatus,
  FollowUpType,
  EmailDeliveryStatus,
} from "@/lib/validations/communications";
import {
  defaultEmailProvider,
  defaultWhatsAppProvider,
  defaultSmsProvider,
  substituteVariables,
  extractTemplateVariables,
} from "@/lib/services/communication-providers";
import { createAuditLog } from "@/lib/services/audit-service";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// 1. LIST COMMUNICATIONS (UNIFIED FEED)
// ---------------------------------------------------------------------------

export async function getCommunicationsListAction(rawFilters: Partial<CommunicationFilterInput> = {}) {
  try {
    const { workspaceId } = await requirePermission("communications.read");
    const filters = communicationFilterSchema.parse({
      page: 1,
      limit: 50,
      ...rawFilters,
    });

    const where: any = {
      workspaceId,
    };

    if (filters.type) {
      where.type = filters.type;
    }
    if (filters.direction) {
      where.direction = filters.direction;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.leadId) {
      where.leadId = filters.leadId;
    }
    if (filters.contactId) {
      where.contactId = filters.contactId;
    }
    if (filters.dealId) {
      where.dealId = filters.dealId;
    }
    if (filters.companyId) {
      where.companyId = filters.companyId;
    }
    if (filters.invoiceId) {
      where.invoiceId = filters.invoiceId;
    }
    if (filters.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { subject: { contains: q, mode: "insensitive" } },
        { content: { contains: q, mode: "insensitive" } },
        { recipientEmail: { contains: q, mode: "insensitive" } },
        { recipientPhone: { contains: q, mode: "insensitive" } },
        { ownerName: { contains: q, mode: "insensitive" } },
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.communication.findMany({
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
          invoice: {
            select: { id: true, invoiceNumber: true, total: true, status: true },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
          followUps: {
            select: { id: true, title: true, dueAt: true, status: true, type: true },
          },
        },
        orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.communication.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items,
        totalCount,
        page: filters.page,
        limit: filters.limit,
        totalPages: Math.ceil(totalCount / filters.limit) || 1,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch communications list",
    };
  }
}

// ---------------------------------------------------------------------------
// 2. COMMUNICATION METRICS & DASHBOARD KPI
// ---------------------------------------------------------------------------

export async function getCommunicationMetricsAction() {
  try {
    const { workspaceId } = await requirePermission("communications.read");

    const [
      totalInteractions,
      totalCalls,
      connectedCalls,
      totalMeetings,
      completedMeetings,
      totalEmails,
      totalWhatsApp,
      totalSms,
      totalNotes,
      overdueFollowUps,
      todayFollowUps,
    ] = await Promise.all([
      prisma.communication.count({ where: { workspaceId } }),
      prisma.communication.count({ where: { workspaceId, type: CommunicationType.CALL } }),
      prisma.communication.count({
        where: { workspaceId, type: CommunicationType.CALL, callOutcome: CallOutcome.CONNECTED },
      }),
      prisma.communication.count({ where: { workspaceId, type: CommunicationType.MEETING } }),
      prisma.communication.count({
        where: { workspaceId, type: CommunicationType.MEETING, meetingStatus: MeetingStatus.COMPLETED },
      }),
      prisma.communication.count({ where: { workspaceId, type: CommunicationType.EMAIL } }),
      prisma.communication.count({ where: { workspaceId, type: CommunicationType.WHATSAPP } }),
      prisma.communication.count({ where: { workspaceId, type: CommunicationType.SMS } }),
      prisma.communication.count({ where: { workspaceId, type: CommunicationType.NOTE } }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: { in: [FollowUpStatus.UPCOMING, FollowUpStatus.OVERDUE] },
          dueAt: { lt: new Date() },
        },
      }),
      prisma.followUp.count({
        where: {
          workspaceId,
          status: { in: [FollowUpStatus.UPCOMING, FollowUpStatus.OVERDUE] },
          dueAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    // Average call duration (seconds)
    const callAgg = await prisma.communication.aggregate({
      where: {
        workspaceId,
        type: CommunicationType.CALL,
        durationSeconds: { not: null, gt: 0 },
      },
      _avg: {
        durationSeconds: true,
      },
      _sum: {
        durationSeconds: true,
      },
    });

    const avgDurationSeconds = Math.round(callAgg._avg.durationSeconds || 0);
    const totalCallMinutes = Math.round((callAgg._sum.durationSeconds || 0) / 60);

    const callConnectRate =
      totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

    return {
      success: true,
      data: {
        totalInteractions,
        totalCalls,
        connectedCalls,
        callConnectRate,
        totalMeetings,
        completedMeetings,
        totalEmails,
        totalWhatsApp,
        totalSms,
        totalNotes,
        avgDurationSeconds,
        totalCallMinutes,
        overdueFollowUps,
        todayFollowUps,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to calculate communication metrics",
    };
  }
}

// ---------------------------------------------------------------------------
// 3. LOG / SCHEDULE A CALL
// ---------------------------------------------------------------------------

export async function logCallAction(rawInput: LogCallInput) {
  try {
    const { session, workspaceId } = await requirePermission("communications.create");
    const input = logCallSchema.parse(rawInput);

    const userName = session.name || session.email || "User";

    // 1. Create communication record
    const communication = await prisma.communication.create({
      data: {
        workspaceId,
        type: CommunicationType.CALL,
        direction: input.direction,
        status: input.scheduledAt && new Date(input.scheduledAt) > new Date()
          ? CommunicationStatus.SCHEDULED
          : CommunicationStatus.COMPLETED,
        callOutcome: input.callOutcome,
        durationSeconds: input.durationSeconds || 0,
        subject: input.subject || `${input.direction === CommunicationDirection.INBOUND ? "Inbound" : "Outbound"} Call (${input.callOutcome})`,
        content: input.content,
        recipientPhone: input.recipientPhone,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        invoiceId: input.invoiceId || undefined,
        ownerId: session.userId,
        ownerName: userName,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
        completedAt: input.scheduledAt && new Date(input.scheduledAt) > new Date() ? null : new Date(),
      },
    });

    // 2. Log timeline activity
    const durationText = input.durationSeconds ? ` (${Math.round(input.durationSeconds / 60)} min)` : "";
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        invoiceId: input.invoiceId || undefined,
        userId: session.userId,
        type: "CALL_LOGGED",
        title: `Logged ${input.direction.toLowerCase()} call: ${input.callOutcome}${durationText}`,
        description: input.content,
        author: userName,
        metadata: JSON.stringify({
          communicationId: communication.id,
          direction: input.direction,
          outcome: input.callOutcome,
          duration: input.durationSeconds,
        }),
      },
    });

    // 3. Create follow-up if requested
    let createdFollowUpId: string | undefined;
    if (input.createFollowUp && input.followUpDueAt) {
      const followUp = await prisma.followUp.create({
        data: {
          workspaceId,
          type: FollowUpType.CALL,
          title: input.followUpTitle || `Follow-up call with ${userName}`,
          dueAt: new Date(input.followUpDueAt),
          notes: `Follow-up scheduled from call on ${new Date().toLocaleDateString()}: "${input.content.substring(0, 100)}"`,
          leadId: input.leadId || undefined,
          contactId: input.contactId || undefined,
          companyId: input.companyId || undefined,
          dealId: input.dealId || undefined,
          communicationId: communication.id,
          ownerId: session.userId,
          ownerName: userName,
        },
      });
      createdFollowUpId = followUp.id;
    }

    // 4. Audit Log
    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_CALL_LOGGED",
      entityType: "COMMUNICATION",
      entityId: communication.id,
      metadata: {
        direction: input.direction,
        outcome: input.callOutcome,
        duration: input.durationSeconds,
        createdFollowUpId,
      },
    });

    revalidatePath("/app/communications");
    revalidatePath("/app/follow-ups");
    if (input.leadId) revalidatePath(`/app/leads/${input.leadId}`);
    if (input.dealId) revalidatePath(`/app/deals/${input.dealId}`);

    return {
      success: true,
      data: communication,
      followUpId: createdFollowUpId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to log call",
    };
  }
}

// ---------------------------------------------------------------------------
// 4. SCHEDULE / UPDATE A MEETING
// ---------------------------------------------------------------------------

export async function scheduleMeetingAction(rawInput: ScheduleMeetingInput) {
  try {
    const { session, workspaceId } = await requirePermission("communications.create");
    const input = scheduleMeetingSchema.parse(rawInput);

    const userName = session.name || session.email || "User";
    const startDate = new Date(input.meetingStart);
    const endDate = input.meetingEnd ? new Date(input.meetingEnd) : new Date(startDate.getTime() + 30 * 60000);

    // 1. Create communication record
    const communication = await prisma.communication.create({
      data: {
        workspaceId,
        type: CommunicationType.MEETING,
        direction: CommunicationDirection.OUTBOUND,
        status: CommunicationStatus.SCHEDULED,
        meetingStatus: MeetingStatus.SCHEDULED,
        meetingStart: startDate,
        meetingEnd: endDate,
        meetingLocation: input.meetingLocation || undefined,
        meetingLink: input.meetingLink || undefined,
        subject: input.title,
        content: input.content || `Meeting scheduled for ${startDate.toLocaleString()}`,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        ownerId: input.ownerId || session.userId,
        ownerName: userName,
        scheduledAt: startDate,
      },
    });

    // 2. Auto-create an upcoming Follow-up of type MEETING
    const followUp = await prisma.followUp.create({
      data: {
        workspaceId,
        type: FollowUpType.MEETING,
        title: `Meeting: ${input.title}`,
        dueAt: startDate,
        notes: `Location / Link: ${input.meetingLink || input.meetingLocation || "Online"}\nAgenda: ${input.content || "N/A"}`,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        communicationId: communication.id,
        ownerId: input.ownerId || session.userId,
        ownerName: userName,
      },
    });

    // 3. Activity record
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        userId: session.userId,
        type: "MEETING_SCHEDULED",
        title: `Scheduled meeting: ${input.title}`,
        description: `Time: ${startDate.toLocaleString()} | Link/Location: ${input.meetingLink || input.meetingLocation || "Virtual"}`,
        author: userName,
        metadata: JSON.stringify({
          communicationId: communication.id,
          followUpId: followUp.id,
          start: startDate.toISOString(),
        }),
      },
    });

    // 4. Audit Log
    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_MEETING_SCHEDULED",
      entityType: "COMMUNICATION",
      entityId: communication.id,
      metadata: {
        title: input.title,
        start: startDate.toISOString(),
      },
    });

    revalidatePath("/app/communications");
    revalidatePath("/app/follow-ups");
    revalidatePath("/app/follow-ups/calendar");

    return {
      success: true,
      data: communication,
      followUpId: followUp.id,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to schedule meeting",
    };
  }
}

export async function updateMeetingStatusAction(rawInput: UpdateMeetingStatusInput) {
  try {
    const { session, workspaceId } = await requirePermission("communications.update");
    const input = updateMeetingStatusSchema.parse(rawInput);

    const existing = await prisma.communication.findUnique({
      where: { id: input.id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Meeting not found" };
    }

    const isCompleted = input.meetingStatus === MeetingStatus.COMPLETED;
    const isCancelled = input.meetingStatus === MeetingStatus.CANCELLED;

    const updated = await prisma.communication.update({
      where: { id: input.id },
      data: {
        meetingStatus: input.meetingStatus,
        status: isCompleted
          ? CommunicationStatus.COMPLETED
          : isCancelled
          ? CommunicationStatus.CANCELLED
          : CommunicationStatus.SCHEDULED,
        completedAt: isCompleted ? new Date() : existing.completedAt,
        content: input.notes
          ? `${existing.content}\n\n[Status Update - ${input.meetingStatus}]: ${input.notes}`
          : existing.content,
      },
    });

    // Sync corresponding follow-up if present
    if (isCompleted || isCancelled) {
      await prisma.followUp.updateMany({
        where: { communicationId: input.id, workspaceId },
        data: {
          status: isCompleted ? FollowUpStatus.COMPLETED : FollowUpStatus.CANCELLED,
          completedAt: isCompleted ? new Date() : null,
          outcome: `Meeting ${input.meetingStatus}`,
          completionNotes: input.notes || undefined,
        },
      });
    }

    // Activity
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: existing.leadId,
        contactId: existing.contactId,
        companyId: existing.companyId,
        dealId: existing.dealId,
        userId: session.userId,
        type: "MEETING_UPDATED",
        title: `Meeting status updated to: ${input.meetingStatus}`,
        description: input.notes || `Meeting ${existing.subject || ""} status changed to ${input.meetingStatus}`,
        author: session.name || session.email || "User",
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_MEETING_STATUS_CHANGED",
      entityType: "COMMUNICATION",
      entityId: input.id,
      metadata: { newStatus: input.meetingStatus },
    });

    revalidatePath("/app/communications");
    revalidatePath("/app/follow-ups");
    revalidatePath("/app/follow-ups/calendar");

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update meeting status",
    };
  }
}

// ---------------------------------------------------------------------------
// 5. SEND / COMPOSE EMAIL WITH HONEST PROVIDER ABSTRACTION
// ---------------------------------------------------------------------------

export async function sendEmailAction(rawInput: SendEmailInput) {
  try {
    const { session, workspaceId } = await requirePermission("communications.send");
    const input = sendEmailSchema.parse(rawInput);

    const userName = session.name || session.email || "User";

    // 1. Fetch contextual entity data for variable interpolation if available
    let leadData = null;
    let contactData = null;
    let dealData = null;
    let companyData = null;
    let invoiceData = null;

    if (input.leadId) {
      leadData = await prisma.lead.findUnique({ where: { id: input.leadId } });
    }
    if (input.contactId) {
      contactData = await prisma.contact.findUnique({ where: { id: input.contactId } });
    }
    if (input.dealId) {
      dealData = await prisma.deal.findUnique({ where: { id: input.dealId } });
    }
    if (input.companyId) {
      companyData = await prisma.company.findUnique({ where: { id: input.companyId } });
    }
    if (input.invoiceId) {
      invoiceData = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    const templateContext = {
      lead: leadData,
      contact: contactData,
      deal: dealData,
      company: companyData,
      invoice: invoiceData,
      sender: {
        name: userName,
        email: session.email,
        role: session.role,
      },
      workspace: {
        name: workspace?.name || "Nexora CRM",
      },
    };

    // Interpolate subject and content
    const finalSubject = substituteVariables(input.subject, templateContext);
    const finalContent = substituteVariables(input.content, templateContext);

    // 2. Dispatch via Email Provider
    const deliveryResult = await defaultEmailProvider.sendEmail({
      to: input.recipientEmail,
      subject: finalSubject,
      htmlContent: `<p>${finalContent.replace(/\n/g, "<br/>")}</p>`,
      textContent: finalContent,
      fromName: userName,
    });

    // 3. Record communication
    const communication = await prisma.communication.create({
      data: {
        workspaceId,
        type: CommunicationType.EMAIL,
        direction: CommunicationDirection.OUTBOUND,
        status: deliveryResult.success ? CommunicationStatus.COMPLETED : CommunicationStatus.FAILED,
        deliveryStatus: deliveryResult.success
          ? EmailDeliveryStatus.SENT
          : deliveryResult.status === "NOT_CONFIGURED"
          ? EmailDeliveryStatus.DRAFT
          : EmailDeliveryStatus.FAILED,
        subject: finalSubject,
        content: finalContent,
        recipientEmail: input.recipientEmail,
        externalMessageId: deliveryResult.messageId || null,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        invoiceId: input.invoiceId || undefined,
        ownerId: session.userId,
        ownerName: userName,
        completedAt: deliveryResult.success ? new Date() : null,
        metadata: JSON.stringify({
          provider: deliveryResult.provider,
          deliveryStatus: deliveryResult.status,
          diagnosticInfo: deliveryResult.diagnosticInfo,
          errorMessage: deliveryResult.errorMessage,
        }),
      },
    });

    // 4. Record Activity
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        invoiceId: input.invoiceId || undefined,
        userId: session.userId,
        type: "EMAIL_SENT",
        title: `Email: ${finalSubject} to ${input.recipientEmail}`,
        description: finalContent.substring(0, 300),
        author: userName,
        metadata: JSON.stringify({
          communicationId: communication.id,
          deliveryStatus: deliveryResult.status,
          providerStatus: deliveryResult.errorMessage || "Delivered",
        }),
      },
    });

    // 5. Audit Log
    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_EMAIL_SENT",
      entityType: "COMMUNICATION",
      entityId: communication.id,
      metadata: {
        to: input.recipientEmail,
        subject: finalSubject,
        provider: deliveryResult.provider,
        providerStatus: deliveryResult.status,
      },
    });

    revalidatePath("/app/communications");

    return {
      success: true,
      data: communication,
      deliveryResult,
      providerNotice: deliveryResult.status === "NOT_CONFIGURED"
        ? deliveryResult.errorMessage
        : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to send email",
    };
  }
}

// ---------------------------------------------------------------------------
// 6. LOG WHATSAPP, SMS, OR INTERNAL NOTE
// ---------------------------------------------------------------------------

export async function logMessageAction(rawInput: LogMessageInput) {
  try {
    const { session, workspaceId } = await requirePermission("communications.create");
    const input = logMessageSchema.parse(rawInput);

    const userName = session.name || session.email || "User";

    let deliveryStatus = EmailDeliveryStatus.DRAFT;
    let providerNotice: string | undefined;

    if (input.type === CommunicationType.WHATSAPP && input.recipientPhone) {
      const res = await defaultWhatsAppProvider.sendMessage({
        toPhone: input.recipientPhone,
        messageText: input.content,
      });
      if (!res.success && res.status === "NOT_CONFIGURED") {
        providerNotice = res.errorMessage;
      }
    } else if (input.type === CommunicationType.SMS && input.recipientPhone) {
      const res = await defaultSmsProvider.sendSms({
        toPhone: input.recipientPhone,
        messageText: input.content,
      });
      if (!res.success && res.status === "NOT_CONFIGURED") {
        providerNotice = res.errorMessage;
      }
    }

    const communication = await prisma.communication.create({
      data: {
        workspaceId,
        type: input.type,
        direction: input.direction,
        status: CommunicationStatus.COMPLETED,
        subject: input.subject || `${input.type} Entry`,
        content: input.content,
        recipientPhone: input.recipientPhone || undefined,
        recipientEmail: input.recipientEmail || undefined,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        invoiceId: input.invoiceId || undefined,
        ownerId: session.userId,
        ownerName: userName,
        completedAt: new Date(),
        metadata: providerNotice ? JSON.stringify({ providerNotice }) : undefined,
      },
    });

    // Activity
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: input.leadId || undefined,
        contactId: input.contactId || undefined,
        companyId: input.companyId || undefined,
        dealId: input.dealId || undefined,
        invoiceId: input.invoiceId || undefined,
        userId: session.userId,
        type: `${input.type}_LOGGED`,
        title: `Logged ${input.type.toLowerCase()}: ${input.subject || ""}`,
        description: input.content,
        author: userName,
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: `COMMUNICATION_${input.type}_LOGGED`,
      entityType: "COMMUNICATION",
      entityId: communication.id,
      metadata: {
        type: input.type,
        recipientPhone: input.recipientPhone,
      },
    });

    revalidatePath("/app/communications");

    return {
      success: true,
      data: communication,
      providerNotice,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to log message",
    };
  }
}

// ---------------------------------------------------------------------------
// 7. DELETE A COMMUNICATION RECORD
// ---------------------------------------------------------------------------

export async function deleteCommunicationAction(id: string) {
  try {
    const { session, workspaceId } = await requirePermission("communications.delete");

    const existing = await prisma.communication.findUnique({
      where: { id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Communication record not found" };
    }

    await prisma.communication.delete({
      where: { id },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_DELETED",
      entityType: "COMMUNICATION",
      entityId: id,
      metadata: {
        type: existing.type,
        subject: existing.subject,
      },
    });

    revalidatePath("/app/communications");
    revalidatePath("/app/follow-ups");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete communication record",
    };
  }
}

// ---------------------------------------------------------------------------
// 8. TEMPLATE MANAGEMENT (CRUD & SEEDING)
// ---------------------------------------------------------------------------

export async function getTemplatesAction() {
  try {
    const { workspaceId } = await requirePermission("templates.read");

    let count = await prisma.communicationTemplate.count({
      where: { workspaceId },
    });

    // Auto-seed starter templates if none exist for workspace
    if (count === 0) {
      for (const starter of STARTER_COMMUNICATION_TEMPLATES) {
        await prisma.communicationTemplate.create({
          data: {
            workspaceId,
            name: starter.name,
            type: starter.type,
            subject: starter.subject || null,
            body: starter.body,
            variables: JSON.stringify(starter.variables),
            isActive: true,
          },
        });
      }
    }

    const templates = await prisma.communicationTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: templates,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to fetch templates",
    };
  }
}

export async function createTemplateAction(rawInput: CreateTemplateInput) {
  try {
    const { session, workspaceId } = await requirePermission("templates.create");
    const input = createTemplateSchema.parse(rawInput);

    const variables = extractTemplateVariables(input.body + " " + (input.subject || ""));

    const template = await prisma.communicationTemplate.create({
      data: {
        workspaceId,
        name: input.name,
        type: input.type,
        subject: input.subject || null,
        body: input.body,
        variables: JSON.stringify(variables),
        isActive: input.isActive ?? true,
        createdById: session.userId,
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_TEMPLATE_CREATED",
      entityType: "COMMUNICATION_TEMPLATE",
      entityId: template.id,
      metadata: { name: template.name, type: template.type },
    });

    revalidatePath("/app/communications");

    return {
      success: true,
      data: template,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to create template",
    };
  }
}

export async function updateTemplateAction(rawInput: UpdateTemplateInput) {
  try {
    const { session, workspaceId } = await requirePermission("templates.update");
    const input = updateTemplateSchema.parse(rawInput);

    const existing = await prisma.communicationTemplate.findUnique({
      where: { id: input.id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Template not found" };
    }

    const variables = extractTemplateVariables(input.body + " " + (input.subject || ""));

    const updated = await prisma.communicationTemplate.update({
      where: { id: input.id },
      data: {
        name: input.name,
        type: input.type,
        subject: input.subject || null,
        body: input.body,
        variables: JSON.stringify(variables),
        isActive: input.isActive,
      },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_TEMPLATE_UPDATED",
      entityType: "COMMUNICATION_TEMPLATE",
      entityId: updated.id,
      metadata: { name: updated.name },
    });

    revalidatePath("/app/communications");

    return {
      success: true,
      data: updated,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to update template",
    };
  }
}

export async function deleteTemplateAction(id: string) {
  try {
    const { session, workspaceId } = await requirePermission("templates.delete");

    const existing = await prisma.communicationTemplate.findUnique({
      where: { id },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      return { success: false, error: "Template not found" };
    }

    await prisma.communicationTemplate.delete({
      where: { id },
    });

    await createAuditLog({
      workspaceId,
      userId: session.userId,
      action: "COMMUNICATION_TEMPLATE_DELETED",
      entityType: "COMMUNICATION_TEMPLATE",
      entityId: id,
      metadata: { name: existing.name },
    });

    revalidatePath("/app/communications");

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to delete template",
    };
  }
}

// ---------------------------------------------------------------------------
// 9. COMMUNICATION REPORTS & REP LEADERBOARD
// ---------------------------------------------------------------------------

export async function getCommunicationReportsAction(params: {
  startDate?: string;
  endDate?: string;
  repId?: string;
} = {}) {
  try {
    const { workspaceId } = await requirePermission("communication_reports.read");

    const where: any = { workspaceId };
    if (params.repId) {
      where.ownerId = params.repId;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = new Date(params.startDate);
      if (params.endDate) where.createdAt.lte = new Date(params.endDate);
    }

    const [allComms, callOutcomeStats, repActivityGroup] = await Promise.all([
      prisma.communication.findMany({
        where,
        select: {
          id: true,
          type: true,
          callOutcome: true,
          meetingStatus: true,
          durationSeconds: true,
          ownerId: true,
          ownerName: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.communication.groupBy({
        by: ["callOutcome"],
        where: { ...where, type: CommunicationType.CALL, callOutcome: { not: null } },
        _count: { id: true },
      }),
      prisma.communication.groupBy({
        by: ["ownerId", "ownerName", "type"],
        where,
        _count: { id: true },
      }),
    ]);

    // Rep Aggregation
    const repMap = new Map<string, { ownerId: string; ownerName: string; calls: number; meetings: number; emails: number; total: number }>();

    for (const group of repActivityGroup) {
      const key = group.ownerId || "unassigned";
      if (!repMap.has(key)) {
        repMap.set(key, {
          ownerId: key,
          ownerName: group.ownerName || "Unassigned",
          calls: 0,
          meetings: 0,
          emails: 0,
          total: 0,
        });
      }
      const entry = repMap.get(key)!;
      entry.total += group._count.id;
      if (group.type === CommunicationType.CALL) entry.calls += group._count.id;
      if (group.type === CommunicationType.MEETING) entry.meetings += group._count.id;
      if (group.type === CommunicationType.EMAIL) entry.emails += group._count.id;
    }

    const leaderboard = Array.from(repMap.values()).sort((a, b) => b.total - a.total);

    // Call outcomes breakdown
    const outcomeBreakdown = callOutcomeStats.map((item) => ({
      outcome: item.callOutcome || "OTHER",
      count: item._count.id,
    }));

    // Channel breakdown
    const channelCounts = {
      CALL: allComms.filter((c) => c.type === CommunicationType.CALL).length,
      MEETING: allComms.filter((c) => c.type === CommunicationType.MEETING).length,
      EMAIL: allComms.filter((c) => c.type === CommunicationType.EMAIL).length,
      WHATSAPP: allComms.filter((c) => c.type === CommunicationType.WHATSAPP).length,
      SMS: allComms.filter((c) => c.type === CommunicationType.SMS).length,
      NOTE: allComms.filter((c) => c.type === CommunicationType.NOTE).length,
    };

    return {
      success: true,
      data: {
        totalInteractions: allComms.length,
        channelCounts,
        outcomeBreakdown,
        leaderboard,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to generate communication reports",
    };
  }
}
