"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  recordPaymentSchema,
  invoiceFilterSchema,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
  InvoiceFilterParams,
} from "@/lib/validations/invoices";
import {
  generateInvoiceNumber,
  calculateInvoiceTotals,
  deriveInvoiceStatus,
  InvoiceEmailService,
} from "@/lib/services/invoice-service";
import { InvoiceStatus, PaymentMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { eventBus } from "@/lib/events/event-bus";
import { WorkflowTriggerType } from "@/lib/validations/automations";

/**
 * Helper to compute date bounds from preset strings.
 */
function getDateBounds(preset?: string, startDate?: string, endDate?: string): { gte?: Date; lte?: Date } | null {
  const now = new Date();
  if (startDate || endDate) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (startDate) filter.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.lte = end;
    }
    return filter;
  }

  if (!preset || preset === "ALL") return null;

  if (preset === "TODAY") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { gte: start, lte: end };
  }

  if (preset === "THIS_WEEK") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { gte: start };
  }

  if (preset === "THIS_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { gte: start };
  }

  if (preset === "THIS_QUARTER") {
    const quarter = Math.floor(now.getMonth() / 3);
    const start = new Date(now.getFullYear(), quarter * 3, 1);
    return { gte: start };
  }

  if (preset === "THIS_YEAR") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { gte: start };
  }

  return null;
}

/**
 * Fetches paginated, searchable invoices strictly scoped to authenticated workspace.
 */
export async function getInvoicesAction(params: InvoiceFilterParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("invoices.read");

    const validated = invoiceFilterSchema.safeParse(params);
    const filter = validated.success ? validated.data : params;

    const where: Prisma.InvoiceWhereInput = {
      workspaceId,
    };

    if (filter.status && filter.status !== "ALL") {
      where.status = filter.status as InvoiceStatus;
    }

    if (filter.contactId) where.contactId = filter.contactId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.dealId) where.dealId = filter.dealId;
    if (filter.ownerId) where.ownerId = filter.ownerId;

    if (filter.search && filter.search.trim() !== "") {
      const search = filter.search.trim();
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerCompany: { contains: search, mode: "insensitive" } },
        { customerEmail: { contains: search, mode: "insensitive" } },
      ];
    }

    const dateBounds = getDateBounds(filter.datePreset, filter.startDate, filter.endDate);
    if (dateBounds) {
      where.issueDate = dateBounds;
    }

    const page = filter.page || 1;
    const limit = filter.limit || 20;
    const skip = (page - 1) * limit;

    const orderBy: Prisma.InvoiceOrderByWithRelationInput = {};
    if (filter.sortBy === "invoiceNumber") orderBy.invoiceNumber = filter.sortOrder;
    else if (filter.sortBy === "dueDate") orderBy.dueDate = filter.sortOrder;
    else if (filter.sortBy === "issueDate") orderBy.issueDate = filter.sortOrder;
    else if (filter.sortBy === "total") orderBy.total = filter.sortOrder;
    else orderBy.createdAt = filter.sortOrder;

    const [invoices, totalCount, allAgg] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          items: true,
          contact: { select: { id: true, firstName: true, lastName: true } },
          company: { select: { id: true, name: true } },
          deal: { select: { id: true, name: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.invoice.count({ where }),
      // Overall workspace stats
      prisma.invoice.findMany({
        where: { workspaceId },
        select: {
          status: true,
          total: true,
          amountPaid: true,
          balanceDue: true,
          dueDate: true,
        },
      }),
    ]);

    // Calculate aggregated metrics
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let paidCount = 0;

    const nowTime = Date.now();

    allAgg.forEach((inv) => {
      const tot = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const bal = Number(inv.balanceDue);

      if (inv.status !== InvoiceStatus.CANCELLED && inv.status !== InvoiceStatus.DRAFT) {
        totalInvoiced += tot;
        totalPaid += paid;
        if (inv.status !== InvoiceStatus.PAID) {
          totalOutstanding += bal;
        }

        const isPastDue = new Date(inv.dueDate).getTime() < nowTime;
        if (isPastDue && inv.status !== InvoiceStatus.PAID && bal > 0) {
          totalOverdue += bal;
          overdueCount += 1;
        }
      }

      if (inv.status === InvoiceStatus.PAID) {
        paidCount += 1;
      }
    });

    const formattedInvoices = invoices.map((inv) => {
      const derivedStatus = deriveInvoiceStatus(
        Number(inv.total),
        Number(inv.amountPaid),
        inv.dueDate,
        inv.status
      );

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: inv.customerName,
        customerCompany: inv.customerCompany,
        customerEmail: inv.customerEmail,
        customerPhone: inv.customerPhone,
        customerGst: inv.customerGst,
        status: derivedStatus,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate.toISOString(),
        currency: inv.currency,
        subtotal: Number(inv.subtotal),
        discount: Number(inv.discount),
        tax: Number(inv.tax),
        total: Number(inv.total),
        totalFormatted: `₹${Number(inv.total).toLocaleString("en-IN")}`,
        amountPaid: Number(inv.amountPaid),
        amountPaidFormatted: `₹${Number(inv.amountPaid).toLocaleString("en-IN")}`,
        balanceDue: Number(inv.balanceDue),
        balanceDueFormatted: `₹${Number(inv.balanceDue).toLocaleString("en-IN")}`,
        ownerName: inv.owner?.name || inv.ownerName,
        contactName: inv.contact ? [inv.contact.firstName, inv.contact.lastName].filter(Boolean).join(" ") : null,
        companyName: inv.company?.name || null,
        dealName: inv.deal?.name || null,
        itemsCount: inv.items.length,
        createdAt: inv.createdAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        invoices: formattedInvoices,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit) || 1,
        },
        stats: {
          totalInvoiced,
          totalInvoicedFormatted: `₹${totalInvoiced.toLocaleString("en-IN")}`,
          totalInvoicedCount: allAgg.filter((i) => i.status !== InvoiceStatus.CANCELLED).length,
          paid: totalPaid,
          paidFormatted: `₹${totalPaid.toLocaleString("en-IN")}`,
          paidCount,
          outstanding: totalOutstanding,
          outstandingFormatted: `₹${totalOutstanding.toLocaleString("en-IN")}`,
          overdue: totalOverdue,
          overdueFormatted: `₹${totalOverdue.toLocaleString("en-IN")}`,
          overdueCount,
        },
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getInvoicesAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load invoices",
      data: null,
    };
  }
}

/**
 * Retrieves full details for a single invoice with line items, payments, timeline, and CRM links.
 */
export async function getInvoiceByIdAction(invoiceId: string) {
  try {
    const { workspaceId, role } = await requirePermission("invoices.read");

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: { recordedBy: { select: { id: true, name: true } } },
        },
        contact: true,
        company: true,
        deal: true,
        owner: { select: { id: true, name: true, email: true } },
        activities: { orderBy: { createdAt: "desc" } },
        notesList: { orderBy: { createdAt: "desc" } },
        tasks: { orderBy: { dueDate: "asc" } },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found in this workspace", data: null };
    }

    const derivedStatus = deriveInvoiceStatus(
      Number(invoice.total),
      Number(invoice.amountPaid),
      invoice.dueDate,
      invoice.status
    );

    return {
      success: true,
      data: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerCompany: invoice.customerCompany,
        customerEmail: invoice.customerEmail,
        customerPhone: invoice.customerPhone,
        customerAddress: invoice.customerAddress,
        customerGst: invoice.customerGst,
        placeOfSupply: invoice.placeOfSupply,
        status: derivedStatus,
        issueDate: invoice.issueDate.toISOString(),
        dueDate: invoice.dueDate.toISOString(),
        sentAt: invoice.sentAt?.toISOString() || null,
        paidAt: invoice.paidAt?.toISOString() || null,
        cancelledAt: invoice.cancelledAt?.toISOString() || null,
        currency: invoice.currency,
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount),
        discountType: invoice.discountType,
        tax: Number(invoice.tax),
        taxRate: Number(invoice.taxRate),
        cgst: Number(invoice.cgst),
        sgst: Number(invoice.sgst),
        igst: Number(invoice.igst),
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        balanceDue: Number(invoice.balanceDue),
        notes: invoice.notes,
        terms: invoice.terms,
        owner: invoice.owner,
        contact: invoice.contact,
        company: invoice.company,
        deal: invoice.deal,
        items: invoice.items.map((it) => ({
          id: it.id,
          description: it.description,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          taxRate: Number(it.taxRate),
          discount: Number(it.discount),
          amount: Number(it.amount),
        })),
        payments: invoice.payments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString(),
          paymentMethod: p.paymentMethod,
          reference: p.reference,
          notes: p.notes,
          recordedByName: p.recordedBy?.name || "System",
        })),
        activities: invoice.activities.map((a) => ({
          id: a.id,
          type: a.type,
          title: a.title,
          description: a.description,
          author: a.author,
          createdAt: a.createdAt.toISOString(),
        })),
        tasks: invoice.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate.toISOString(),
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getInvoiceByIdAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load invoice",
      data: null,
    };
  }
}

/**
 * Creates an Invoice and line items with server-side Decimal calculations.
 */
export async function createInvoiceAction(input: CreateInvoiceInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("invoices.create");

    const validation = createInvoiceSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid invoice data",
      };
    }

    const data = validation.data;

    // Verify contact, company, deal belong to workspace if provided
    if (data.contactId) {
      const c = await prisma.contact.findFirst({ where: { id: data.contactId, workspaceId } });
      if (!c) return { success: false, error: "Selected Contact not found in workspace" };
    }
    if (data.companyId) {
      const comp = await prisma.company.findFirst({ where: { id: data.companyId, workspaceId } });
      if (!comp) return { success: false, error: "Selected Company not found in workspace" };
    }
    if (data.dealId) {
      const d = await prisma.deal.findFirst({ where: { id: data.dealId, workspaceId } });
      if (!d) return { success: false, error: "Selected Deal not found in workspace" };
    }

    // Calculate server-side financial decimals
    const calc = calculateInvoiceTotals(
      data.items,
      data.discount,
      data.discountType,
      data.taxRate,
      data.isGstSplit
    );

    const result = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await generateInvoiceNumber(workspaceId, tx);

      const createdInvoice = await tx.invoice.create({
        data: {
          workspaceId,
          invoiceNumber,
          customerName: data.customerName.trim(),
          customerCompany: data.customerCompany?.trim() || null,
          customerEmail: data.customerEmail.trim(),
          customerPhone: data.customerPhone?.trim() || null,
          customerAddress: data.customerAddress?.trim() || null,
          customerGst: data.customerGst?.trim() || null,
          placeOfSupply: data.placeOfSupply?.trim() || null,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          dealId: data.dealId || null,
          ownerId: data.ownerId || userId,
          ownerName: session?.name || "Alex Chen",
          status: data.status,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          currency: data.currency || "INR",
          subtotal: new Prisma.Decimal(calc.subtotal),
          discount: new Prisma.Decimal(calc.discountAmount),
          discountType: data.discountType,
          tax: new Prisma.Decimal(calc.taxAmount),
          taxRate: new Prisma.Decimal(data.taxRate),
          cgst: new Prisma.Decimal(calc.cgst),
          sgst: new Prisma.Decimal(calc.sgst),
          igst: new Prisma.Decimal(calc.igst),
          total: new Prisma.Decimal(calc.total),
          amountPaid: new Prisma.Decimal(0),
          balanceDue: new Prisma.Decimal(calc.total),
          notes: data.notes?.trim() || null,
          terms: data.terms?.trim() || null,
          items: {
            create: calc.items.map((it) => ({
              description: it.description.trim(),
              quantity: it.quantity,
              unitPrice: new Prisma.Decimal(it.unitPrice),
              taxRate: new Prisma.Decimal(it.taxRate || 0),
              discount: new Prisma.Decimal(it.discount || 0),
              amount: new Prisma.Decimal(it.amount),
            })),
          },
        },
      });

      // Audit Activity
      await tx.activity.create({
        data: {
          workspaceId,
          invoiceId: createdInvoice.id,
          dealId: data.dealId || null,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          userId,
          type: "INVOICE_CREATED",
          title: `Invoice ${invoiceNumber} created`,
          description: `Created invoice for ${data.customerName} totalling ₹${calc.total.toLocaleString("en-IN")}`,
          author: session?.name || "User",
        },
      });

      return createdInvoice;
    });

    revalidatePath("/app/invoices");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/reports/invoices");

    // Emit domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.INVOICE_CREATED,
        entityType: "INVOICE",
        entityId: result.id,
        payload: {
          id: result.id,
          number: result.invoiceNumber,
          customerName: result.customerName,
          customerEmail: result.customerEmail,
          total: Number(result.total),
          status: result.status,
        },
        context: { source: "USER" },
      })
    );

    return {
      success: true,
      data: { id: result.id, invoiceNumber: result.invoiceNumber },
    };
  } catch (err) {
    console.error("createInvoiceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create invoice",
    };
  }
}

/**
 * Updates an invoice with recalculated server-side financial values.
 */
export async function updateInvoiceAction(input: UpdateInvoiceInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("invoices.update");

    const validation = updateInvoiceSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid invoice data",
      };
    }

    const data = validation.data;

    const existing = await prisma.invoice.findFirst({
      where: { id: data.id, workspaceId },
      include: { payments: true },
    });

    if (!existing) {
      return { success: false, error: "Invoice not found" };
    }

    if (existing.status === InvoiceStatus.PAID || existing.status === InvoiceStatus.CANCELLED) {
      return {
        success: false,
        error: `Cannot modify an invoice that is already ${existing.status.toLowerCase()}`,
      };
    }

    const calc = calculateInvoiceTotals(
      data.items,
      data.discount,
      data.discountType,
      data.taxRate,
      data.isGstSplit
    );

    const paidTotal = Number(existing.amountPaid);
    const newBalanceDue = Math.max(0, calc.total - paidTotal);
    const newStatus = deriveInvoiceStatus(calc.total, paidTotal, data.dueDate, existing.status);

    await prisma.$transaction(async (tx) => {
      // 1. Remove existing items
      await tx.invoiceItem.deleteMany({ where: { invoiceId: data.id } });

      // 2. Update invoice header & re-add items
      await tx.invoice.update({
        where: { id: data.id },
        data: {
          customerName: data.customerName.trim(),
          customerCompany: data.customerCompany?.trim() || null,
          customerEmail: data.customerEmail.trim(),
          customerPhone: data.customerPhone?.trim() || null,
          customerAddress: data.customerAddress?.trim() || null,
          customerGst: data.customerGst?.trim() || null,
          placeOfSupply: data.placeOfSupply?.trim() || null,
          contactId: data.contactId || null,
          companyId: data.companyId || null,
          dealId: data.dealId || null,
          ownerId: data.ownerId || existing.ownerId,
          issueDate: new Date(data.issueDate),
          dueDate: new Date(data.dueDate),
          currency: data.currency || "INR",
          subtotal: new Prisma.Decimal(calc.subtotal),
          discount: new Prisma.Decimal(calc.discountAmount),
          discountType: data.discountType,
          tax: new Prisma.Decimal(calc.taxAmount),
          taxRate: new Prisma.Decimal(data.taxRate),
          cgst: new Prisma.Decimal(calc.cgst),
          sgst: new Prisma.Decimal(calc.sgst),
          igst: new Prisma.Decimal(calc.igst),
          total: new Prisma.Decimal(calc.total),
          balanceDue: new Prisma.Decimal(newBalanceDue),
          status: newStatus,
          notes: data.notes?.trim() || null,
          terms: data.terms?.trim() || null,
          items: {
            create: calc.items.map((it) => ({
              description: it.description.trim(),
              quantity: it.quantity,
              unitPrice: new Prisma.Decimal(it.unitPrice),
              taxRate: new Prisma.Decimal(it.taxRate || 0),
              discount: new Prisma.Decimal(it.discount || 0),
              amount: new Prisma.Decimal(it.amount),
            })),
          },
        },
      });

      // Activity
      await tx.activity.create({
        data: {
          workspaceId,
          invoiceId: data.id,
          userId,
          type: "INVOICE_UPDATED",
          title: `Invoice ${existing.invoiceNumber} updated`,
          description: `Updated invoice totals to ₹${calc.total.toLocaleString("en-IN")}`,
          author: session?.name || "User",
        },
      });
    });

    revalidatePath(`/app/invoices/${data.id}`);
    revalidatePath("/app/invoices");

    return { success: true };
  } catch (err) {
    console.error("updateInvoiceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update invoice",
    };
  }
}

/**
 * Deletes an invoice (only permitted for DRAFT status).
 */
export async function deleteInvoiceAction(invoiceId: string) {
  try {
    const { workspaceId, role } = await requirePermission("invoices.delete");

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: { payments: true },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      return {
        success: false,
        error: "Only DRAFT invoices can be deleted. Cancel issued invoices instead.",
      };
    }

    if (invoice.payments.length > 0) {
      return {
        success: false,
        error: "Cannot delete an invoice that has payment records attached.",
      };
    }

    await prisma.invoice.delete({ where: { id: invoiceId } });

    revalidatePath("/app/invoices");
    revalidatePath("/app/dashboard");

    return { success: true };
  } catch (err) {
    console.error("deleteInvoiceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete invoice",
    };
  }
}

/**
 * Marks a DRAFT invoice as SENT and dispatches email notification.
 */
export async function sendInvoiceAction(invoiceId: string) {
  try {
    const { workspaceId, userId, session } = await requirePermission("invoices.send");

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      return { success: false, error: "Invoice has already been sent or finalized." };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.SENT,
          sentAt: new Date(),
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          invoiceId,
          userId,
          type: "INVOICE_SENT",
          title: `Invoice ${invoice.invoiceNumber} sent`,
          description: `Invoice marked as sent to ${invoice.customerEmail}`,
          author: session?.name || "User",
        },
      });

      return inv;
    });

    const emailRes = await InvoiceEmailService.sendInvoiceEmail({
      invoiceNumber: invoice.invoiceNumber,
      customerEmail: invoice.customerEmail,
      customerName: invoice.customerName,
      totalFormatted: `₹${Number(invoice.total).toLocaleString("en-IN")}`,
      dueDateFormatted: invoice.dueDate.toLocaleDateString("en-IN"),
    });

    revalidatePath(`/app/invoices/${invoiceId}`);
    revalidatePath("/app/invoices");

    // Emit domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.INVOICE_SENT,
        entityType: "INVOICE",
        entityId: invoiceId,
        payload: {
          id: invoiceId,
          number: invoice.invoiceNumber,
          customerName: invoice.customerName,
          customerEmail: invoice.customerEmail,
          total: Number(invoice.total),
          status: InvoiceStatus.SENT,
        },
        context: { source: "USER" },
      })
    );

    return {
      success: true,
      message: emailRes.message,
    };
  } catch (err) {
    console.error("sendInvoiceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send invoice",
    };
  }
}

/**
 * Cancels an invoice.
 */
export async function cancelInvoiceAction(invoiceId: string, reason?: string) {
  try {
    const { workspaceId, userId, session } = await requirePermission("invoices.cancel");

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status === InvoiceStatus.PAID) {
      return {
        success: false,
        error: "Cannot cancel a PAID invoice. Please process a refund or credit note first.",
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          invoiceId,
          userId,
          type: "INVOICE_CANCELLED",
          title: `Invoice ${invoice.invoiceNumber} cancelled`,
          description: reason ? `Reason: ${reason}` : "Invoice status set to CANCELLED",
          author: session?.name || "User",
        },
      });
    });

    revalidatePath(`/app/invoices/${invoiceId}`);
    revalidatePath("/app/invoices");

    return { success: true };
  } catch (err) {
    console.error("cancelInvoiceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel invoice",
    };
  }
}

/**
 * Duplicates an invoice as a fresh DRAFT with a new sequential invoice number.
 */
export async function duplicateInvoiceAction(invoiceId: string) {
  try {
    const { workspaceId, userId, session } = await requirePermission("invoices.create");

    const original = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: { items: true },
    });

    if (!original) {
      return { success: false, error: "Original invoice not found" };
    }

    const result = await prisma.$transaction(async (tx) => {
      const newInvoiceNumber = await generateInvoiceNumber(workspaceId, tx);

      const duplicated = await tx.invoice.create({
        data: {
          workspaceId,
          invoiceNumber: newInvoiceNumber,
          customerName: original.customerName,
          customerCompany: original.customerCompany,
          customerEmail: original.customerEmail,
          customerPhone: original.customerPhone,
          customerAddress: original.customerAddress,
          customerGst: original.customerGst,
          placeOfSupply: original.placeOfSupply,
          contactId: original.contactId,
          companyId: original.companyId,
          dealId: original.dealId,
          ownerId: userId,
          ownerName: session?.name || "Alex Chen",
          status: InvoiceStatus.DRAFT,
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // default +14 days
          currency: original.currency,
          subtotal: original.subtotal,
          discount: original.discount,
          discountType: original.discountType,
          tax: original.tax,
          taxRate: original.taxRate,
          cgst: original.cgst,
          sgst: original.sgst,
          igst: original.igst,
          total: original.total,
          amountPaid: new Prisma.Decimal(0),
          balanceDue: original.total,
          notes: original.notes,
          terms: original.terms,
          items: {
            create: original.items.map((it) => ({
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              taxRate: it.taxRate,
              discount: it.discount,
              amount: it.amount,
            })),
          },
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          invoiceId: duplicated.id,
          userId,
          type: "INVOICE_CREATED",
          title: `Invoice ${newInvoiceNumber} duplicated from ${original.invoiceNumber}`,
          description: `Created draft clone of invoice ${original.invoiceNumber}`,
          author: session?.name || "User",
        },
      });

      return duplicated;
    });

    revalidatePath("/app/invoices");

    return {
      success: true,
      data: { id: result.id, invoiceNumber: result.invoiceNumber },
    };
  } catch (err) {
    console.error("duplicateInvoiceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to duplicate invoice",
    };
  }
}

/**
 * Records a payment against an invoice with automatic balance recalculation and status derivation.
 */
export async function recordPaymentAction(input: RecordPaymentInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("payments.create");

    const validation = recordPaymentSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid payment data",
      };
    }

    const { invoiceId, amount, paymentDate, paymentMethod, reference, notes } = validation.data;

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      return { success: false, error: "Cannot record payment on a CANCELLED invoice." };
    }

    const currentTotal = Number(invoice.total);
    const currentPaid = Number(invoice.amountPaid);
    const currentBalance = Number(invoice.balanceDue);

    if (amount > currentBalance + 0.01) {
      return {
        success: false,
        error: `Payment amount (₹${amount.toLocaleString("en-IN")}) exceeds remaining balance of ₹${currentBalance.toLocaleString("en-IN")}`,
      };
    }

    const newAmountPaid = currentPaid + amount;
    const newBalanceDue = Math.max(0, currentTotal - newAmountPaid);
    const isFullyPaid = newAmountPaid >= currentTotal;
    const newStatus = isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    await prisma.$transaction(async (tx) => {
      // 1. Create Payment record
      await tx.payment.create({
        data: {
          workspaceId,
          invoiceId,
          amount: new Prisma.Decimal(amount),
          paymentDate: new Date(paymentDate),
          paymentMethod,
          reference: reference?.trim() || null,
          notes: notes?.trim() || null,
          recordedById: userId,
        },
      });

      // 2. Update Invoice
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          amountPaid: new Prisma.Decimal(newAmountPaid),
          balanceDue: new Prisma.Decimal(newBalanceDue),
          status: newStatus,
          paidAt: isFullyPaid ? new Date() : invoice.paidAt,
          paymentMethod: paymentMethod.toString(),
        },
      });

      // 3. Activity record
      await tx.activity.create({
        data: {
          workspaceId,
          invoiceId,
          dealId: invoice.dealId || null,
          contactId: invoice.contactId || null,
          companyId: invoice.companyId || null,
          userId,
          type: isFullyPaid ? "INVOICE_PAID" : "INVOICE_PAYMENT_RECEIVED",
          title: isFullyPaid
            ? `Invoice ${invoice.invoiceNumber} fully paid`
            : `Payment of ₹${amount.toLocaleString("en-IN")} received on ${invoice.invoiceNumber}`,
          description: `Recorded via ${paymentMethod}${reference ? ` (Ref: ${reference})` : ""}. Remaining balance: ₹${newBalanceDue.toLocaleString("en-IN")}`,
          author: session?.name || "User",
        },
      });

      // 4. In-app notification for owner
      if (invoice.ownerId && invoice.ownerId !== userId) {
        await tx.notification.create({
          data: {
            workspaceId,
            userId: invoice.ownerId,
            title: isFullyPaid ? "Invoice Paid" : "Payment Received",
            description: `Payment of ₹${amount.toLocaleString("en-IN")} recorded for invoice ${invoice.invoiceNumber}`,
            link: `/app/invoices/${invoiceId}`,
            type: "invoice",
          },
        });
      }
    });

    revalidatePath(`/app/invoices/${invoiceId}`);
    revalidatePath("/app/invoices");
    revalidatePath("/app/dashboard");
    revalidatePath("/app/reports/invoices");

    // Emit payment domain event
    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.PAYMENT_RECEIVED,
        entityType: "PAYMENT",
        entityId: invoiceId,
        payload: {
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          amount,
          paymentMethod,
          isFullyPaid,
          balanceDue: newBalanceDue,
        },
        context: { source: "USER" },
      })
    );

    if (isFullyPaid) {
      eventBus.publish(
        eventBus.createEvent({
          workspaceId,
          type: WorkflowTriggerType.INVOICE_PAID,
          entityType: "INVOICE",
          entityId: invoiceId,
          payload: {
            id: invoiceId,
            number: invoice.invoiceNumber,
            customerName: invoice.customerName,
            customerEmail: invoice.customerEmail,
            total: Number(invoice.total),
            status: InvoiceStatus.PAID,
          },
          context: { source: "USER" },
        })
      );
    }

    return {
      success: true,
      data: { isFullyPaid, newBalanceDue },
    };
  } catch (err) {
    console.error("recordPaymentAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to record payment",
    };
  }
}

/**
 * Aggregates comprehensive billing and payment metrics for `/app/reports/invoices`.
 */
export async function getInvoiceReportAction(params: InvoiceFilterParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("invoice_reports.read");

    const where: Prisma.InvoiceWhereInput = { workspaceId };
    if (params.contactId) where.contactId = params.contactId;
    if (params.companyId) where.companyId = params.companyId;
    if (params.ownerId) where.ownerId = params.ownerId;

    const dateBounds = getDateBounds(params.datePreset, params.startDate, params.endDate);
    if (dateBounds) {
      where.issueDate = dateBounds;
    }

    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          contact: { select: { firstName: true, lastName: true } },
          company: { select: { name: true } },
          owner: { select: { name: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.payment.findMany({
        where: { workspaceId },
        orderBy: { paymentDate: "desc" },
      }),
    ]);

    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let totalOverdue = 0;
    let paidInvoicesCount = 0;
    let overdueInvoicesCount = 0;

    const nowTime = Date.now();
    const monthMap = new Map<string, { invoiced: number; paid: number }>();
    const methodMap = new Map<PaymentMethod, number>();

    invoices.forEach((inv) => {
      const tot = Number(inv.total);
      const paid = Number(inv.amountPaid);
      const bal = Number(inv.balanceDue);

      if (inv.status !== InvoiceStatus.CANCELLED && inv.status !== InvoiceStatus.DRAFT) {
        totalInvoiced += tot;
        totalCollected += paid;

        if (inv.status !== InvoiceStatus.PAID) {
          totalOutstanding += bal;
        }

        const isPastDue = new Date(inv.dueDate).getTime() < nowTime;
        if (isPastDue && inv.status !== InvoiceStatus.PAID && bal > 0) {
          totalOverdue += bal;
          overdueInvoicesCount += 1;
        }

        // Monthly bucket
        const monthKey = inv.issueDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, { invoiced: 0, paid: 0 });
        }
        monthMap.get(monthKey)!.invoiced += tot;
        monthMap.get(monthKey)!.paid += paid;
      }

      if (inv.status === InvoiceStatus.PAID) {
        paidInvoicesCount += 1;
      }
    });

    // Payment methods aggregation
    payments.forEach((p) => {
      const m = p.paymentMethod;
      methodMap.set(m, (methodMap.get(m) || 0) + Number(p.amount));
    });

    const totalActiveInvoices = invoices.filter(
      (i) => i.status !== InvoiceStatus.CANCELLED && i.status !== InvoiceStatus.DRAFT
    ).length;

    const collectionRate = totalInvoiced > 0 ? ((totalCollected / totalInvoiced) * 100).toFixed(1) : "0.0";
    const avgInvoiceSize = totalActiveInvoices > 0 ? Math.round(totalInvoiced / totalActiveInvoices) : 0;

    const monthlyBreakdown = Array.from(monthMap.entries()).map(([month, data]) => ({
      month,
      invoiced: data.invoiced,
      invoicedFormatted: `₹${data.invoiced.toLocaleString("en-IN")}`,
      paid: data.paid,
      paidFormatted: `₹${data.paid.toLocaleString("en-IN")}`,
    }));

    const paymentMethods = Array.from(methodMap.entries()).map(([method, amount]) => ({
      method,
      amount,
      amountFormatted: `₹${amount.toLocaleString("en-IN")}`,
      percentage: totalCollected > 0 ? Math.round((amount / totalCollected) * 100) : 0,
    }));

    const overdueInvoices = invoices
      .filter((i) => {
        const isPast = new Date(i.dueDate).getTime() < nowTime;
        return isPast && i.status !== InvoiceStatus.PAID && i.status !== InvoiceStatus.CANCELLED && Number(i.balanceDue) > 0;
      })
      .slice(0, 10)
      .map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        customerName: i.customerName,
        companyName: i.company?.name || null,
        totalFormatted: `₹${Number(i.total).toLocaleString("en-IN")}`,
        balanceDueFormatted: `₹${Number(i.balanceDue).toLocaleString("en-IN")}`,
        dueDate: i.dueDate.toISOString().split("T")[0],
        daysOverdue: Math.floor((nowTime - new Date(i.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      }));

    return {
      success: true,
      data: {
        summary: {
          totalInvoiced,
          totalInvoicedFormatted: `₹${totalInvoiced.toLocaleString("en-IN")}`,
          totalCollected,
          totalCollectedFormatted: `₹${totalCollected.toLocaleString("en-IN")}`,
          totalOutstanding,
          totalOutstandingFormatted: `₹${totalOutstanding.toLocaleString("en-IN")}`,
          totalOverdue,
          totalOverdueFormatted: `₹${totalOverdue.toLocaleString("en-IN")}`,
          collectionRate: `${collectionRate}%`,
          avgInvoiceSize,
          avgInvoiceSizeFormatted: `₹${avgInvoiceSize.toLocaleString("en-IN")}`,
          totalInvoicesCount: invoices.length,
          paidInvoicesCount,
          overdueInvoicesCount,
        },
        monthlyBreakdown,
        paymentMethods,
        overdueInvoices,
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getInvoiceReportAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load invoice report",
      data: null,
    };
  }
}
