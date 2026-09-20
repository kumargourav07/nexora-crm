import { Role } from "@prisma/client";
import { getSession, SessionPayload } from "@/lib/auth/session";
import prisma from "@/lib/prisma";

export type Permission =
  // Workspace Permissions
  | "workspace.read"
  | "workspace.update"
  | "workspace.delete"
  // Team Permissions
  | "team.read"
  | "team.invite"
  | "team.update"
  | "team.remove"
  // Role Permissions
  | "roles.read"
  | "roles.update"
  // Lead Permissions
  | "leads.read"
  | "leads.create"
  | "leads.update"
  | "leads.delete"
  // Deal Permissions
  | "deals.read"
  | "deals.create"
  | "deals.update"
  | "deals.delete"
  | "deals.assign"
  | "deals.move_stage"
  | "deals.mark_won"
  | "deals.mark_lost"
  // Pipeline Permissions
  | "pipelines.read"
  | "pipelines.manage"
  // Contact Permissions
  | "contacts.read"
  | "contacts.create"
  | "contacts.update"
  | "contacts.delete"
  // Company Permissions
  | "companies.read"
  | "companies.create"
  | "companies.update"
  | "companies.delete"
  // Forecast & Reports Permissions
  | "forecast.read"
  | "reports.read"
  // Task Permissions
  | "tasks.read"
  | "tasks.create"
  | "tasks.update"
  | "tasks.delete"
  // Employee Permissions
  | "employees.read"
  | "employees.create"
  | "employees.update"
  | "employees.delete"
  // Invoice Permissions
  | "invoices.read"
  | "invoices.create"
  | "invoices.update"
  | "invoices.delete"
  | "invoices.send"
  | "invoices.cancel"
  // Payment Permissions
  | "payments.read"
  | "payments.create"
  // Billing Reports Permission
  | "invoice_reports.read"
  // Integration Permissions
  | "integrations.read"
  | "integrations.create"
  | "integrations.update"
  | "integrations.delete"
  | "integrations.connect"
  | "integrations.disconnect"
  | "integration_logs.read"
  | "integration_logs.retry"
  // Automation & Workflow Permissions
  | "automations.read"
  | "automations.create"
  | "automations.update"
  | "automations.delete"
  | "automations.activate"
  | "automations.pause"
  | "automation_runs.read"
  | "automation_runs.retry"
  // Communication & Follow-up Permissions
  | "communications.read"
  | "communications.create"
  | "communications.update"
  | "communications.delete"
  | "communications.send"
  | "followups.read"
  | "followups.create"
  | "followups.update"
  | "followups.delete"
  | "templates.read"
  | "templates.create"
  | "templates.update"
  | "templates.delete"
  | "communication_reports.read"
  // Analytics Permissions
  | "analytics.read"
  // Audit Permissions
  | "audit.read";

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  OWNER: [
    "workspace.read",
    "workspace.update",
    "workspace.delete",
    "team.read",
    "team.invite",
    "team.update",
    "team.remove",
    "roles.read",
    "roles.update",
    "leads.read",
    "leads.create",
    "leads.update",
    "leads.delete",
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.delete",
    "deals.assign",
    "deals.move_stage",
    "deals.mark_won",
    "deals.mark_lost",
    "pipelines.read",
    "pipelines.manage",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "contacts.delete",
    "companies.read",
    "companies.create",
    "companies.update",
    "companies.delete",
    "forecast.read",
    "reports.read",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "employees.read",
    "employees.create",
    "employees.update",
    "employees.delete",
    "invoices.read",
    "invoices.create",
    "invoices.update",
    "invoices.delete",
    "invoices.send",
    "invoices.cancel",
    "payments.read",
    "payments.create",
    "invoice_reports.read",
    "integrations.read",
    "integrations.create",
    "integrations.update",
    "integrations.delete",
    "integrations.connect",
    "integrations.disconnect",
    "integration_logs.read",
    "integration_logs.retry",
    "automations.read",
    "automations.create",
    "automations.update",
    "automations.delete",
    "automations.activate",
    "automations.pause",
    "automation_runs.read",
    "automation_runs.retry",
    "communications.read",
    "communications.create",
    "communications.update",
    "communications.delete",
    "communications.send",
    "followups.read",
    "followups.create",
    "followups.update",
    "followups.delete",
    "templates.read",
    "templates.create",
    "templates.update",
    "templates.delete",
    "communication_reports.read",
    "analytics.read",
    "audit.read",
  ],
  ADMIN: [
    "workspace.read",
    "workspace.update",
    "team.read",
    "team.invite",
    "team.update",
    "team.remove",
    "roles.read",
    "roles.update",
    "leads.read",
    "leads.create",
    "leads.update",
    "leads.delete",
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.delete",
    "deals.assign",
    "deals.move_stage",
    "deals.mark_won",
    "deals.mark_lost",
    "pipelines.read",
    "pipelines.manage",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "contacts.delete",
    "companies.read",
    "companies.create",
    "companies.update",
    "companies.delete",
    "forecast.read",
    "reports.read",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "employees.read",
    "employees.create",
    "employees.update",
    "employees.delete",
    "invoices.read",
    "invoices.create",
    "invoices.update",
    "invoices.delete",
    "invoices.send",
    "invoices.cancel",
    "payments.read",
    "payments.create",
    "invoice_reports.read",
    "integrations.read",
    "integrations.create",
    "integrations.update",
    "integrations.delete",
    "integrations.connect",
    "integrations.disconnect",
    "integration_logs.read",
    "integration_logs.retry",
    "automations.read",
    "automations.create",
    "automations.update",
    "automations.delete",
    "automations.activate",
    "automations.pause",
    "automation_runs.read",
    "automation_runs.retry",
    "communications.read",
    "communications.create",
    "communications.update",
    "communications.delete",
    "communications.send",
    "followups.read",
    "followups.create",
    "followups.update",
    "followups.delete",
    "templates.read",
    "templates.create",
    "templates.update",
    "templates.delete",
    "communication_reports.read",
    "analytics.read",
    "audit.read",
  ],
  MANAGER: [
    "workspace.read",
    "team.read",
    "leads.read",
    "leads.create",
    "leads.update",
    "leads.delete",
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.delete",
    "deals.assign",
    "deals.move_stage",
    "deals.mark_won",
    "deals.mark_lost",
    "pipelines.read",
    "pipelines.manage",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "contacts.delete",
    "companies.read",
    "companies.create",
    "companies.update",
    "companies.delete",
    "forecast.read",
    "reports.read",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "tasks.delete",
    "employees.read",
    "employees.create",
    "employees.update",
    "invoices.read",
    "invoices.create",
    "invoices.update",
    "invoices.send",
    "invoices.cancel",
    "payments.read",
    "payments.create",
    "invoice_reports.read",
    "integrations.read",
    "integrations.connect",
    "integrations.disconnect",
    "integration_logs.read",
    "integration_logs.retry",
    "automations.read",
    "automations.create",
    "automations.update",
    "automations.activate",
    "automations.pause",
    "automation_runs.read",
    "automation_runs.retry",
    "communications.read",
    "communications.create",
    "communications.update",
    "communications.send",
    "followups.read",
    "followups.create",
    "followups.update",
    "followups.delete",
    "templates.read",
    "templates.create",
    "templates.update",
    "communication_reports.read",
    "analytics.read",
  ],
  MEMBER: [
    "workspace.read",
    "team.read",
    "leads.read",
    "leads.create",
    "leads.update",
    "deals.read",
    "deals.create",
    "deals.update",
    "deals.move_stage",
    "deals.mark_won",
    "deals.mark_lost",
    "pipelines.read",
    "contacts.read",
    "contacts.create",
    "contacts.update",
    "companies.read",
    "companies.create",
    "companies.update",
    "forecast.read",
    "reports.read",
    "tasks.read",
    "tasks.create",
    "tasks.update",
    "employees.read",
    "invoices.read",
    "invoices.create",
    "payments.read",
    "payments.create",
    "integrations.read",
    "integration_logs.read",
    "automations.read",
    "automation_runs.read",
    "communications.read",
    "communications.create",
    "communications.update",
    "communications.send",
    "followups.read",
    "followups.create",
    "followups.update",
    "templates.read",
  ],
};

/**
 * Checks if a given role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return (permissions as readonly string[]).includes(permission);
}

/**
 * Returns all permissions assigned to a role.
 */
export function getRolePermissions(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Validates whether an actor can modify another user's role.
 * Prevents role escalation:
 * - MEMBER and MANAGER cannot change roles.
 * - ADMIN cannot modify an OWNER and cannot promote someone to OWNER.
 * - OWNER can change any role.
 */
export function canManageRole(
  actorRole: Role,
  targetCurrentRole: Role,
  targetNewRole?: Role
): boolean {
  if (actorRole === Role.OWNER) {
    return true;
  }
  if (actorRole === Role.ADMIN) {
    if (targetCurrentRole === Role.OWNER) return false;
    if (targetNewRole && targetNewRole === Role.OWNER) return false;
    return true;
  }
  return false;
}

/**
 * Helper to enforce server-side authorization in server actions.
 * Extracts session, verifies workspace membership, validates permission.
 * Throws an Error if unauthorized.
 */
export async function requirePermission(permission: Permission): Promise<{
  session: SessionPayload;
  userId: string;
  workspaceId: string;
  role: Role;
}> {
  const session = await getSession();
  if (!session || !session.userId || !session.workspaceId) {
    throw new Error("UNAUTHORIZED: Authentication required");
  }

  // Verify active membership and actual current role in database for security
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId: session.userId,
        workspaceId: session.workspaceId,
      },
    },
  });

  if (!membership) {
    throw new Error("FORBIDDEN: User does not belong to active workspace");
  }

  if (!hasPermission(membership.role, permission)) {
    throw new Error(
      `FORBIDDEN: Insufficient permissions. Role '${membership.role}' lacks '${permission}'`
    );
  }

  return {
    session: {
      ...session,
      role: membership.role,
    },
    userId: session.userId,
    workspaceId: session.workspaceId,
    role: membership.role,
  };
}

/**
 * Validates permission for a specific user and workspace directly against DB.
 */
export async function requireWorkspacePermission({
  userId,
  workspaceId,
  permission,
}: {
  userId: string;
  workspaceId: string;
  permission: Permission;
}): Promise<{
  membership: {
    id: string;
    userId: string;
    workspaceId: string;
    role: Role;
  };
}> {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  if (!membership) {
    throw new Error("FORBIDDEN: User is not a member of the workspace");
  }

  if (!hasPermission(membership.role, permission)) {
    throw new Error(
      `FORBIDDEN: Permission denied for operation '${permission}'`
    );
  }

  return { membership };
}
