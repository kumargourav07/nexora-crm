"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import {
  createCompanySchema,
  updateCompanySchema,
  CreateCompanyInput,
  UpdateCompanyInput,
} from "@/lib/validations/sales";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export interface GetCompaniesParams {
  search?: string;
  industry?: string;
  ownerId?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "name";
  sortOrder?: "asc" | "desc";
}

/**
 * Searches / lists companies scoped to current workspace with aggregated metrics.
 */
export async function getCompaniesAction(params: GetCompaniesParams = {}) {
  try {
    const { workspaceId, role } = await requirePermission("companies.read");

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.CompanyWhereInput = {
      workspaceId,
    };

    if (params.industry) {
      where.industry = { equals: params.industry, mode: "insensitive" };
    }

    if (params.ownerId) {
      where.ownerId = params.ownerId;
    }

    if (params.search && params.search.trim() !== "") {
      const search = params.search.trim();
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { industry: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { website: { contains: search, mode: "insensitive" } },
      ];
    }

    const orderBy: Prisma.CompanyOrderByWithRelationInput = {
      [params.sortBy || "createdAt"]: params.sortOrder || "desc",
    };

    const [companies, totalCount] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          contacts: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          deals: {
            select: { id: true, value: true, status: true },
          },
        },
      }),
      prisma.company.count({ where }),
    ]);

    const formatted = companies.map((comp) => {
      const contactsCount = comp.contacts.length;
      const openDeals = comp.deals.filter((d) => d.status === "OPEN");
      const openDealsCount = openDeals.length;
      const wonDeals = comp.deals.filter((d) => d.status === "WON");
      const wonRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

      return {
        id: comp.id,
        name: comp.name,
        website: comp.website,
        industry: comp.industry,
        phone: comp.phone,
        email: comp.email,
        address: comp.address,
        ownerId: comp.ownerId,
        ownerName: comp.owner?.name || null,
        contactsCount,
        openDealsCount,
        wonRevenue,
        wonRevenueFormatted: `₹${wonRevenue.toLocaleString("en-IN")}`,
        createdAt: comp.createdAt.toISOString(),
        updatedAt: comp.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      data: {
        companies: formatted,
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
    console.error("getCompaniesAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load companies",
      data: { companies: [], pagination: { page: 1, limit: 20, totalCount: 0, totalPages: 0 } },
    };
  }
}

/**
 * Checks for existing company by normalized name within workspace.
 */
export async function checkDuplicateCompanyAction(name: string) {
  try {
    const { workspaceId } = await requirePermission("companies.read");
    if (!name || name.trim() === "") return { success: true, match: null };

    const searchName = name.trim().toLowerCase();
    const existing = await prisma.company.findFirst({
      where: {
        workspaceId,
        name: { equals: searchName, mode: "insensitive" },
      },
    });

    if (!existing) {
      return { success: true, match: null };
    }

    return {
      success: true,
      match: {
        id: existing.id,
        name: existing.name,
        industry: existing.industry,
        website: existing.website,
      },
    };
  } catch {
    return { success: true, match: null };
  }
}

/**
 * Gets a company with full details (contacts, deals, activities, tasks, notes).
 */
export async function getCompanyByIdAction(id: string) {
  try {
    const { workspaceId, role } = await requirePermission("companies.read");

    const company = await prisma.company.findFirst({
      where: { id, workspaceId },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contacts: {
          orderBy: { createdAt: "desc" },
        },
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

    if (!company) {
      return { success: false, error: "Company not found" };
    }

    const wonRevenue = company.deals
      .filter((d) => d.status === "WON")
      .reduce((sum, d) => sum + Number(d.value), 0);

    const openPipeline = company.deals
      .filter((d) => d.status === "OPEN")
      .reduce((sum, d) => sum + Number(d.value), 0);

    return {
      success: true,
      data: {
        ...company,
        wonRevenue,
        wonRevenueFormatted: `₹${wonRevenue.toLocaleString("en-IN")}`,
        openPipeline,
        openPipelineFormatted: `₹${openPipeline.toLocaleString("en-IN")}`,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
        contacts: company.contacts.map((c) => ({
          ...c,
          fullName: [c.firstName, c.lastName].filter(Boolean).join(" "),
          createdAt: c.createdAt.toISOString(),
        })),
        deals: company.deals.map((d) => ({
          ...d,
          valueNumeric: Number(d.value),
          valueFormatted: `₹${Number(d.value).toLocaleString("en-IN")}`,
          expectedCloseDate: d.expectedCloseDate ? d.expectedCloseDate.toISOString() : null,
          createdAt: d.createdAt.toISOString(),
        })),
        activities: company.activities.map((a) => ({
          ...a,
          createdAt: a.createdAt.toISOString(),
        })),
        tasks: company.tasks.map((t) => ({
          ...t,
          dueDate: t.dueDate.toISOString(),
          createdAt: t.createdAt.toISOString(),
        })),
        notes: company.notes.map((n) => ({
          ...n,
          createdAt: n.createdAt.toISOString(),
        })),
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getCompanyByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load company" };
  }
}

/**
 * Creates a new company.
 */
export async function createCompanyAction(input: CreateCompanyInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("companies.create");

    const validation = createCompanySchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid company data",
      };
    }

    const data = validation.data;

    // Validate ownerId if supplied
    if (data.ownerId) {
      const member = await prisma.membership.findFirst({
        where: { userId: data.ownerId, workspaceId },
      });
      if (!member) {
        return { success: false, error: "Assigned owner is not a member of this workspace" };
      }
    }

    const newCompany = await prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: {
          workspaceId,
          name: data.name,
          website: data.website || null,
          industry: data.industry || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          ownerId: data.ownerId || userId,
        },
      });

      await tx.activity.create({
        data: {
          workspaceId,
          companyId: created.id,
          userId,
          type: "company_created",
          title: "Company created",
          description: `Created account for ${created.name}`,
          author: session.name,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "COMPANY_CREATED",
          entityType: "COMPANY",
          entityId: created.id,
          metadata: JSON.stringify({
            name: created.name,
            industry: created.industry,
          }),
        },
      });

      return created;
    });

    revalidatePath("/app/companies");
    return {
      success: true,
      data: {
        id: newCompany.id,
        name: newCompany.name,
      },
    };
  } catch (err) {
    console.error("createCompanyAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to create company" };
  }
}

/**
 * Updates a company.
 */
export async function updateCompanyAction(id: string, input: UpdateCompanyInput) {
  try {
    const { workspaceId, userId } = await requirePermission("companies.update");

    const validation = updateCompanySchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid company data",
      };
    }

    const data = validation.data;

    const existing = await prisma.company.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Company not found in workspace" };
    }

    const updated = await prisma.$transaction(async (tx) => {
      const res = await tx.company.update({
        where: { id },
        data: {
          name: data.name !== undefined ? data.name : undefined,
          website: data.website !== undefined ? data.website : undefined,
          industry: data.industry !== undefined ? data.industry : undefined,
          phone: data.phone !== undefined ? data.phone : undefined,
          email: data.email !== undefined ? data.email : undefined,
          address: data.address !== undefined ? data.address : undefined,
          ownerId: data.ownerId !== undefined ? data.ownerId : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "COMPANY_UPDATED",
          entityType: "COMPANY",
          entityId: id,
          metadata: JSON.stringify({ changes: data }),
        },
      });

      return res;
    });

    revalidatePath("/app/companies");
    revalidatePath(`/app/companies/${id}`);
    return { success: true, data: { id: updated.id } };
  } catch (err) {
    console.error("updateCompanyAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to update company" };
  }
}

/**
 * Deletes a company.
 */
export async function deleteCompanyAction(id: string) {
  try {
    const { workspaceId, userId } = await requirePermission("companies.delete");

    const existing = await prisma.company.findFirst({
      where: { id, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Company not found" };
    }

    await prisma.$transaction(async (tx) => {
      await tx.company.delete({ where: { id } });

      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "COMPANY_DELETED",
          entityType: "COMPANY",
          entityId: id,
          metadata: JSON.stringify({ name: existing.name }),
        },
      });
    });

    revalidatePath("/app/companies");
    return { success: true };
  } catch (err) {
    console.error("deleteCompanyAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to delete company" };
  }
}
