"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { getWorkspaceAuditLogs, GetAuditLogsParams } from "@/lib/services/audit-service";
import prisma from "@/lib/prisma";

export async function getAuditLogsAction(
  params: Omit<GetAuditLogsParams, "workspaceId"> = {}
) {
  try {
    const { workspaceId, role } = await requirePermission("audit.read");

    const result = await getWorkspaceAuditLogs({
      workspaceId,
      ...params,
    });

    // Also get list of team users for filter dropdown
    const teamMembers = await prisma.membership.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return {
      success: true,
      data: {
        logs: result.logs,
        pagination: result.pagination,
        currentUserRole: role,
        users: teamMembers.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
        })),
      },
    };
  } catch (err) {
    console.error("getAuditLogsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load audit logs",
      data: {
        logs: [],
        pagination: { page: 1, limit: 25, totalCount: 0, totalPages: 0 },
        users: [],
      },
    };
  }
}
