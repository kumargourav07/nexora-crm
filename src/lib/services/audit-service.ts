import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface CreateAuditLogParams {
  workspaceId: string;
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface GetAuditLogsParams {
  workspaceId: string;
  search?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

const SENSITIVE_KEYS = new Set([
  "password",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "passwordhash",
  "token",
  "tokenhash",
  "secret",
  "webhooksecret",
  "encryptedsecrets",
  "credentials",
  "apikey",
  "authorization",
  "cardnumber",
  "cvv",
]);

/**
 * Deeply sanitizes metadata to remove sensitive credentials, passwords, or tokens.
 */
export function sanitizeMetadata(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeMetadata(item));
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeMetadata(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Appends an immutable audit log entry.
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    const cleanMetadata = params.metadata
      ? JSON.stringify(sanitizeMetadata(params.metadata))
      : null;

    return await prisma.auditLog.create({
      data: {
        workspaceId: params.workspaceId,
        userId: params.userId || null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId || null,
        metadata: cleanMetadata,
        ipAddress: params.ipAddress || null,
        userAgent: params.userAgent || null,
      },
    });
  } catch (err) {
    // Fail-open for audit logging so mutations don't crash, but log error to console
    console.error("Failed to write audit log:", err);
    return null;
  }
}

/**
 * Reads paginated and filtered audit logs strictly scoped to a workspace.
 */
export async function getWorkspaceAuditLogs(params: GetAuditLogsParams) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {
    workspaceId: params.workspaceId,
  };

  if (params.userId && params.userId !== "ALL") {
    where.userId = params.userId;
  }

  if (params.action && params.action !== "ALL") {
    where.action = params.action;
  }

  if (params.entityType && params.entityType !== "ALL") {
    where.entityType = params.entityType;
  }

  if (params.startDate || params.endDate) {
    where.createdAt = {};
    if (params.startDate) {
      where.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  if (params.search && params.search.trim() !== "") {
    const search = params.search.trim();
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
      { user: { name: { contains: search, mode: "insensitive" } } },
      { user: { email: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  const formattedLogs = logs.map((log) => {
    let parsedMeta: Record<string, unknown> | null = null;
    if (log.metadata) {
      try {
        parsedMeta = JSON.parse(log.metadata);
      } catch {
        parsedMeta = { raw: log.metadata };
      }
    }

    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      metadata: parsedMeta,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            avatarUrl: log.user.avatarUrl,
          }
        : {
            id: "system",
            name: "System / Public",
            email: "system@nexora.local",
            avatarUrl: null,
          },
    };
  });

  return {
    logs: formattedLogs,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}
