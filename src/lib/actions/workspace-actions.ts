"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/services/audit-service";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import {
  workspaceSettingsSchema,
  deleteWorkspaceSchema,
  WorkspaceSettingsInput,
  DeleteWorkspaceInput,
} from "@/lib/validations/settings";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Fetches workspace configuration and metadata.
 */
export async function getWorkspaceSettingsAction() {
  try {
    const { workspaceId, role } = await requirePermission("workspace.read");

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        _count: {
          select: {
            memberships: true,
            leads: true,
            invoices: true,
            employees: true,
          },
        },
      },
    });

    if (!workspace) {
      return { success: false, error: "Workspace not found" };
    }

    return {
      success: true,
      data: {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        timezone: workspace.timezone,
        currency: workspace.currency,
        dateFormat: workspace.dateFormat,
        defaultLeadStatus: workspace.defaultLeadStatus,
        createdAt: workspace.createdAt.toISOString(),
        currentUserRole: role,
        stats: {
          totalMembers: workspace._count.memberships,
          totalLeads: workspace._count.leads,
          totalInvoices: workspace._count.invoices,
          totalEmployees: workspace._count.employees,
        },
      },
    };
  } catch (err) {
    console.error("getWorkspaceSettingsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load workspace settings",
    };
  }
}

/**
 * Updates workspace configuration with audit logging.
 */
export async function updateWorkspaceSettingsAction(input: WorkspaceSettingsInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("workspace.update");

    const validation = workspaceSettingsSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid workspace configuration",
      };
    }

    const data = validation.data;

    // Check slug uniqueness if changed
    const existing = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Workspace not found" };
    }

    if (data.slug !== existing.slug) {
      const slugConflict = await prisma.workspace.findUnique({
        where: { slug: data.slug },
      });

      if (slugConflict && slugConflict.id !== workspaceId) {
        return {
          success: false,
          error: "This workspace URL slug is already taken. Please choose another.",
        };
      }
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: data.name,
        slug: data.slug,
        timezone: data.timezone,
        currency: data.currency,
        dateFormat: data.dateFormat,
        defaultLeadStatus: data.defaultLeadStatus,
      },
    });

    // Update active session with fresh workspace name & slug
    await createSession({
      userId: session.userId,
      email: session.email,
      name: session.name,
      avatarUrl: session.avatarUrl,
      workspaceId: updatedWorkspace.id,
      workspaceName: updatedWorkspace.name,
      workspaceSlug: updatedWorkspace.slug,
      role: session.role,
    });

    // Audit Log
    await createAuditLog({
      workspaceId,
      userId,
      action: "WORKSPACE_UPDATED",
      entityType: "WORKSPACE",
      entityId: workspaceId,
      metadata: {
        previousName: existing.name,
        newName: updatedWorkspace.name,
        previousSlug: existing.slug,
        newSlug: updatedWorkspace.slug,
        timezone: updatedWorkspace.timezone,
        currency: updatedWorkspace.currency,
      },
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: {
        name: updatedWorkspace.name,
        slug: updatedWorkspace.slug,
      },
    };
  } catch (err) {
    console.error("updateWorkspaceSettingsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update workspace settings",
    };
  }
}

/**
 * Returns all workspaces the authenticated user belongs to.
 */
export async function getUserWorkspacesAction() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated", data: [] };
    }

    const memberships = await prisma.membership.findMany({
      where: { userId: session.userId },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      isCurrent: m.workspace.id === session.workspaceId,
    }));

    return { success: true, data: workspaces };
  } catch (err) {
    console.error("getUserWorkspacesAction error:", err);
    return { success: false, error: "Unable to load workspaces", data: [] };
  }
}

/**
 * Switches the active tenant workspace for the authenticated session.
 */
export async function switchWorkspaceAction(targetWorkspaceId: string) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    // Verify membership server-side
    const membership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.userId,
          workspaceId: targetWorkspaceId,
        },
      },
      include: {
        workspace: true,
        user: true,
      },
    });

    if (!membership) {
      return {
        success: false,
        error: "You are not a member of the target workspace.",
      };
    }

    await createSession({
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      avatarUrl: membership.user.avatarUrl,
      workspaceId: membership.workspace.id,
      workspaceName: membership.workspace.name,
      workspaceSlug: membership.workspace.slug,
      role: membership.role,
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: {
        workspaceName: membership.workspace.name,
        role: membership.role,
        redirectUrl: "/app/dashboard",
      },
    };
  } catch (err) {
    console.error("switchWorkspaceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to switch workspace",
    };
  }
}

/**
 * Permanently deletes workspace (Owner only).
 */
export async function deleteWorkspaceAction(input: DeleteWorkspaceInput) {
  try {
    const { workspaceId, role } = await requirePermission("workspace.delete");

    if (role !== Role.OWNER) {
      return { success: false, error: "Only the workspace Owner can delete this workspace." };
    }

    const validation = deleteWorkspaceSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid confirmation",
      };
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        memberships: true,
      },
    });

    if (!workspace) {
      return { success: false, error: "Workspace not found" };
    }

    if (input.confirmationName !== workspace.name) {
      return {
        success: false,
        error: "Confirmation name does not match the workspace name.",
      };
    }

    const session = await getSession();
    const otherMemberships = session?.userId
      ? await prisma.membership.findMany({
          where: {
            userId: session.userId,
            workspaceId: { not: workspaceId },
          },
          include: { workspace: true, user: true },
        })
      : [];

    // Delete workspace (Prisma schema cascades all related records)
    await prisma.workspace.delete({
      where: { id: workspaceId },
    });

    if (otherMemberships.length > 0 && session) {
      const nextWs = otherMemberships[0];
      await createSession({
        userId: nextWs.user.id,
        email: nextWs.user.email,
        name: nextWs.user.name,
        avatarUrl: nextWs.user.avatarUrl,
        workspaceId: nextWs.workspace.id,
        workspaceName: nextWs.workspace.name,
        workspaceSlug: nextWs.workspace.slug,
        role: nextWs.role,
      });
      revalidatePath("/", "layout");
      return { success: true, data: { redirectUrl: "/app/dashboard" } };
    } else {
      await destroySession();
      revalidatePath("/", "layout");
      return { success: true, data: { redirectUrl: "/signup" } };
    }
  } catch (err) {
    console.error("deleteWorkspaceAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete workspace",
    };
  }
}
