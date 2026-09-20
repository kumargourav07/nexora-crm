"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createContactSchema,
  updateContactSchema,
  CreateContactInput,
  UpdateContactInput,
} from "@/lib/validations/sales";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface GetContactsParams {
  search?: string;
  companyId?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "firstName" | "lastName";
  sortOrder?: "asc" | "desc";
}

/**
 * Searches / lists contacts scoped to current workspace.
 */
export async function getContactsAction(params: GetContactsParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("contacts.read");

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.ContactWhereInput = {
      workspaceId,
    };

    if (params.companyId) {
      where.companyId = params.companyId;
    }

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }

    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
        { company: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const orderBy: Prisma.ContactOrderByWithRelationInput = {
      [params.sortBy || "createdAt"]: params.sortOrder || "desc",
    };

    const [contacts, totalCount] = await Promise.all([
      prisma.contact.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          company: {
            select: { id: true, name: true },
          },
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { deals: true, activities: true, tasks: true },
          },
        },
      }),
      prisma.contact.count({ where }),
    ]);

    const formatted = contacts.map((c) => ({
      id: c.id,
      firstName: c.firstName,
      lastName: c.lastName,
      fullName: [c.firstName, c.lastName].filter(Boolean).join(" "),
      email: c.email,
      phone: c.phone,
      jobTitle: c.jobTitle,
      companyId: c.companyId,
      companyName: c.company?.name || null,
      ownerId: c.ownerId,
      ownerName: c.owner?.name || null,
      dealCount: c._count.deals,
      activityCount: c._count.activities,
      taskCount: c._count.tasks,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return {
      success: true,
      data: {
        contacts: formatted,
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
    console.error("getContactsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load contacts",
      data: { contacts: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } },
    };
  }
}

/**
 * Checks for existing contact in workspace by email or phone.
 */
export async function checkDuplicateContactAction(params: {
  email?: string | null;
  phone?: string | null;
}) {
  try {
    const { workspaceId } = await requirePermission("contacts.read");

    const conditions: Prisma.ContactWhereInput[] = [];
    if (params.email && params.email.trim() !== "") {
      conditions.push({ email: { equals: params.email.trim(), mode: "insensitive" } });
    }
    if (params.phone && params.phone.trim() !== "") {
      conditions.push({ phone: { equals: params.phone.trim() } });
    }

    if (conditions.length === 0) {
      return { success: true, match: null };
    }

    const existing = await prisma.contact.findFirst({
      where: {
        workspaceId,
        OR: conditions,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return { success: true, match: null };
    }

    return {
      success: true,
      match: {
        id: existing.id,
        fullName: [existing.firstName, existing.lastName].filter(Boolean).join(" "),
        email: existing.email,
        phone: existing.phone,
        companyName: existing.company?.name || null,
      },
    };
  } catch {
    return { success: true, match: null };
  }
}

/**
 * Gets a contact with full details (deals, tasks, activities, notes).
 */
export async function getContactByIdAction(id: string) {
  try {
    const { workspaceId, role } = await requirePermission("contacts.read");

    const contact = await prisma.contact.findFirst({
      where: { id, workspaceId },
      include: {
        company: true,
        owner: { select: { id: true, name: true, email: true } },
        deals: {
          orderBy: { createdAt: "desc" },
          include: {
            stage: { select: { id: true, name: true, color: true } },
            pipeline: { select: { id: true, name: true } },
          },
        },
        activities: {
          orderBy: { createdAt: "desc" },
          take: 30,
        },
        tasks: {
          orderBy: { dueDate: "asc" },
        },
        notes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!contact) {
      return { success: false, error: "Contact not found" };
    }

    return {
      success: true,
      data: {
        ...contact,
        fullName: [contact.firstName, contact.lastName].filter(Boolean).join(" "),
        createdAt: contact.createdAt.toISOString(),
        updatedAt: contact.updatedAt.toISOString(),
        deals: contact.deals.map((d) => ({
          ...d,
          valueNumeric: Number(d.value),
          valueFormatted: `₹${Number(d.value).toLocaleString("en-IN")}`,
          expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.toISOString() : null,
          createdAt: d.createdAt.toISOString(),
        })),
        activities: contact.activities.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
        tasks: contact.tasks.map((t) => ({
          ...t,
          dueDate: t.dueDate.toISOString(),
          createdAt: t.createdAt.toISOString(),
        })),
        notes: contact.notes.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getContactByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load contact" };
  }
}

/**
 * Creates a new contact.
 */
export async function createContactAction(input: CreateContactInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("contacts.create");

    const validation = createContactSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid contact data",
      };
    }

    const data = validation.data;

    // Validate companyId if supplied
    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, workspaceId },
      });
      if (!company) {
        return { success: false, error: "Referenced company not found in workspace" };
      }
    }

    // Validate ownerId if supplied
    if (data.ownerId) {
      const member = await prisma.membership.findFirst({
        where: { userId: data.ownerId, workspaceId },
      });
      if (!member) {
        return { success: false, error: "Assigned owner is not a member of this workspace" };
      }
    }

    const newContact = await prisma.$transaction(async (tx) => {
      const created = await tx.contact.create({
        data: {
          workspaceId,
          firstName: data.firstName,
          lastName: data.lastName || null,
          email: data.email || null,
          phone: data.phone || null,
          jobTitle: data.jobTitle || null,
          companyId: data.companyId || null,
          ownerId: data.ownerId || userId,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          contactId: created.id,
          userId,
          type: "contact_created",
          title: "Contact created",
          description: `Created contact ${[created.firstName, created.lastName].filter(Boolean).join(" ")}`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "CONTACT_CREATED",
          entityType: "CONTACT",
          entityId: created.id,
          metadata: JSON.stringify({
            name: `${created.firstName} ${created.lastName || ""}`.trim(),
            email: created.email,
          }),
        },
      });

      return created;
    });

    revalidatePath("/app/contacts");
    return {
      success: true,
      data: {
        id: newContact.id,
        fullName: [newContact.firstName, newContact.lastName].filter(Boolean).join(" "),
      },
    };
  } catch (err) {
    console.error("createContactAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create contact" };
  }
}

/**
 * Updates a contact.
 */
export async function updateContactAction(id: string, input: UpdateContactInput) {
  try {
    const { workspaceId, userId } = await requirePermission("contacts.update");

    const validation = updateContactSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid contact data",
      };
    }

    const data = validation.data;

    const existing = await prisma.contact.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Contact not found in workspace" };
    }

    if (data.companyId) {
      const company = await prisma.company.findFirst({
        where: { id: data.companyId, workspaceId },
      });
      if (!company) {
        return { success: false, error: "Referenced company not found in workspace" };
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.contact.update({
        where: { id },
        data: {
          firstName: data.firstName !== undefined ? data.firstName : undefined,
          lastName: data.lastName !== undefined ? data.lastName : undefined,
          email: data.email !== undefined ? data.email : undefined,
          phone: data.phone !== undefined ? data.phone : undefined,
          jobTitle: data.jobTitle !== undefined ? data.jobTitle : undefined,
          companyId: data.companyId !== undefined ? data.companyId : undefined,
          ownerId: data.ownerId !== undefined ? data.ownerId : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "CONTACT_UPDATED",
          entityType: "CONTACT",
          entityId: id,
          metadata: JSON.stringify({ changes: data }),
        },
      });

      return res;
    });

    revalidatePath("/app/contacts");
    revalidatePath(`/app/contacts/${id}`);
    return { success: true, data: { id: updated.id } };
  } catch (err) {
    console.error("updateContactAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update contact" };
  }
}

/**
 * Deletes a contact.
 */
export async function deleteContactAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("contacts.delete");

    const existing = await prisma.contact.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Contact not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.contact.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "CONTACT_DELETED",
          entityType: "CONTACT",
          entityId: id,
          metadata: JSON.stringify({
            name: `${existing.firstName} ${existing.lastName || ""}`.trim(),
          }),
        },
      });
    });

    revalidatePath("/app/contacts");
    return { success: true };
  } catch (err) {
    console.error("deleteContactAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete contact" };
  }
}
