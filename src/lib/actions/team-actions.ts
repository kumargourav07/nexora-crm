"use server";

import crypto from "crypto";
import prisma from "@/lib/prisma";
import { requirePermission, canManageRole } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/services/audit-service";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, getSession } from "@/lib/auth/session";
import {
  inviteMemberSchema,
  changeRoleSchema,
  removeMemberSchema,
  acceptInvitationSchema,
  InviteMemberInput,
  ChangeRoleInput,
  RemoveMemberInput,
  AcceptInvitationInput,
} from "@/lib/validations/settings";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

const INVITATION_EXPIRY_DAYS = 7;

/**
 * Generates a cryptographically secure token and its SHA-256 hash.
 */
function generateInvitationToken(): { rawToken: string; tokenHash: string } {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  return { rawToken, tokenHash };
}

/**
 * Computes SHA-256 hash for raw token.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export interface GetTeamMembersParams {
  search?: string;
  role?: Role | "PENDING" | "ALL";
}

/**
 * Fetches all team members and pending invitations for the current workspace.
 */
export async function getTeamMembersAction(params: GetTeamMembersParams = {}) {
  try {
    const { workspaceId, role: currentRole, userId: currentUserId } = await requirePermission("team.read");

    const search = params.search?.trim().toLowerCase();

    // 1. Fetch active memberships
    const memberships = await prisma.membership.findMany({
      where: {
        workspaceId,
        ...(params.role && params.role !== "ALL" && params.role !== "PENDING"
          ? { role: params.role as Role }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Fetch pending invitations
    const invitations = await prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        acceptedAt: null,
      },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter by search in memory / combined
    let activeMembers = memberships.map((m) => {
      const names = m.user.name.trim().split(/\s+/);
      const initials =
        names.length > 1
          ? `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase()
          : m.user.name.slice(0, 2).toUpperCase();

      return {
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        avatarUrl: m.user.avatarUrl,
        initials,
        status: "ACTIVE" as const,
        joinedAt: m.createdAt.toISOString(),
        isCurrentUser: m.user.id === currentUserId,
      };
    });

    if (search) {
      activeMembers = activeMembers.filter(
        (m) =>
          m.name.toLowerCase().includes(search) ||
          m.email.toLowerCase().includes(search)
      );
    }

    let pendingInvites = invitations.map((inv) => {
      const isExpired = new Date() > inv.expiresAt;
      return {
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: (isExpired ? "EXPIRED" : "PENDING") as "PENDING" | "EXPIRED",
        invitedBy: inv.invitedBy.name,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      };
    });

    if (search) {
      pendingInvites = pendingInvites.filter((inv) =>
        inv.email.toLowerCase().includes(search)
      );
    }

    // Role-specific filtering for PENDING
    if (params.role === "PENDING") {
      activeMembers = [];
    } else if (params.role && params.role !== "ALL") {
      pendingInvites = pendingInvites.filter((inv) => inv.role === params.role);
    }

    // Calculate owner counts for UI safeguards
    const totalOwners = memberships.filter((m) => m.role === Role.OWNER).length;

    return {
      success: true,
      data: {
        members: activeMembers,
        invitations: pendingInvites,
        totalOwners,
        currentUserRole: currentRole,
        currentUserId,
      },
    };
  } catch (err) {
    console.error("getTeamMembersAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load team members",
      data: {
        members: [],
        invitations: [],
        totalOwners: 0,
        currentUserRole: Role.MEMBER,
        currentUserId: "",
      },
    };
  }
}

/**
 * Invites a new team member via cryptographically secure token.
 */
export async function inviteMemberAction(input: InviteMemberInput) {
  try {
    const { workspaceId, userId: actorUserId, role: actorRole, session } =
      await requirePermission("team.invite");

    const validation = inviteMemberSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid invitation data",
      };
    }

    const { email, role, message } = validation.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Prevent role escalation: Admin cannot invite an OWNER
    if (role === Role.OWNER && actorRole !== Role.OWNER) {
      return {
        success: false,
        error: "Only workspace Owners can invite new Owners.",
      };
    }

    // Check if user is already an active member of this workspace
    const existingMembership = await prisma.membership.findFirst({
      where: {
        workspaceId,
        user: { email: normalizedEmail },
      },
    });

    if (existingMembership) {
      return {
        success: false,
        error: "This user is already an active member of this workspace.",
      };
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        email: normalizedEmail,
        acceptedAt: null,
      },
    });

    if (existingInvitation && existingInvitation.expiresAt > new Date()) {
      return {
        success: false,
        error: "A pending invitation has already been sent to this email address.",
      };
    }

    // Clean up expired existing invitation if any
    if (existingInvitation) {
      await prisma.workspaceInvitation.delete({
        where: { id: existingInvitation.id },
      });
    }

    const { rawToken, tokenHash } = generateInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        email: normalizedEmail,
        role,
        tokenHash,
        expiresAt,
        invitedById: actorUserId,
      },
    });

    // Audit log
    await createAuditLog({
      workspaceId,
      userId: actorUserId,
      action: "USER_INVITED",
      entityType: "INVITATION",
      entityId: invitation.id,
      metadata: {
        invitedEmail: normalizedEmail,
        assignedRole: role,
        hasMessage: !!message,
        invitedBy: session.name,
      },
    });

    revalidatePath("/app/settings/team");
    revalidatePath("/app/settings/audit-log");

    return {
      success: true,
      data: {
        invitationId: invitation.id,
        email: normalizedEmail,
        role,
        inviteUrl: `/invite/${rawToken}`,
        expiresAt: expiresAt.toISOString(),
        emailDeliveryNote:
          "Email delivery not configured (Development mode). Share the invitation link directly with the user.",
      },
    };
  } catch (err) {
    console.error("inviteMemberAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to generate invitation",
    };
  }
}

/**
 * Resends / refreshes a pending invitation with a new expiration date and token.
 */
export async function resendInvitationAction(invitationId: string) {
  try {
    const { workspaceId, userId: actorUserId, role: actorRole } =
      await requirePermission("team.invite");

    const existing = await prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId, acceptedAt: null },
    });

    if (!existing) {
      return { success: false, error: "Pending invitation not found" };
    }

    if (existing.role === Role.OWNER && actorRole !== Role.OWNER) {
      return {
        success: false,
        error: "Only workspace Owners can manage Owner invitations.",
      };
    }

    const { rawToken, tokenHash } = generateInvitationToken();
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await prisma.workspaceInvitation.update({
      where: { id: invitationId },
      data: {
        tokenHash,
        expiresAt,
        createdAt: new Date(), // reset timestamp
      },
    });

    await createAuditLog({
      workspaceId,
      userId: actorUserId,
      action: "INVITATION_RESENT",
      entityType: "INVITATION",
      entityId: invitationId,
      metadata: {
        email: existing.email,
        role: existing.role,
      },
    });

    revalidatePath("/app/settings/team");

    return {
      success: true,
      data: {
        inviteUrl: `/invite/${rawToken}`,
        email: existing.email,
        expiresAt: expiresAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("resendInvitationAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to resend invitation",
    };
  }
}

/**
 * Cancels / revokes a pending workspace invitation.
 */
export async function cancelInvitationAction(invitationId: string) {
  try {
    const { workspaceId, userId: actorUserId, role: actorRole } =
      await requirePermission("team.invite");

    const existing = await prisma.workspaceInvitation.findFirst({
      where: { id: invitationId, workspaceId },
    });

    if (!existing) {
      return { success: false, error: "Invitation not found" };
    }

    if (existing.role === Role.OWNER && actorRole !== Role.OWNER) {
      return {
        success: false,
        error: "Only workspace Owners can cancel Owner invitations.",
      };
    }

    await prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    await createAuditLog({
      workspaceId,
      userId: actorUserId,
      action: "INVITATION_CANCELLED",
      entityType: "INVITATION",
      entityId: invitationId,
      metadata: {
        cancelledEmail: existing.email,
      },
    });

    revalidatePath("/app/settings/team");
    revalidatePath("/app/settings/audit-log");

    return { success: true };
  } catch (err) {
    console.error("cancelInvitationAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to cancel invitation",
    };
  }
}

/**
 * Modifies an existing member's workspace role with strict escalation and owner protection.
 */
export async function changeRoleAction(input: ChangeRoleInput) {
  try {
    const { workspaceId, userId: actorUserId, role: actorRole } =
      await requirePermission("roles.update");

    const validation = changeRoleSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid role change input",
      };
    }

    const { targetUserId, newRole } = validation.data;

    // Fetch target membership
    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!targetMembership) {
      return { success: false, error: "Target team member not found in this workspace" };
    }

    // Role escalation validation
    if (!canManageRole(actorRole, targetMembership.role, newRole)) {
      return {
        success: false,
        error: "You do not have sufficient permissions to grant or modify this role.",
      };
    }

    // Last Owner Protection: If target is currently OWNER and changing to non-OWNER
    if (targetMembership.role === Role.OWNER && newRole !== Role.OWNER) {
      const totalOwners = await prisma.membership.count({
        where: { workspaceId, role: Role.OWNER },
      });

      if (totalOwners <= 1) {
        return {
          success: false,
          error: "You cannot demote the last workspace Owner. Assign another Owner first.",
        };
      }
    }

    // Update role
    const updated = await prisma.membership.update({
      where: { id: targetMembership.id },
      data: { role: newRole },
    });

    // Audit log
    await createAuditLog({
      workspaceId,
      userId: actorUserId,
      action: "ROLE_CHANGED",
      entityType: "TEAM_MEMBER",
      entityId: targetUserId,
      metadata: {
        targetName: targetMembership.user.name,
        targetEmail: targetMembership.user.email,
        oldRole: targetMembership.role,
        newRole,
      },
    });

    revalidatePath("/app/settings/team");
    revalidatePath("/app/settings/audit-log");

    return {
      success: true,
      data: { userId: targetUserId, newRole: updated.role },
    };
  } catch (err) {
    console.error("changeRoleAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update role",
    };
  }
}

/**
 * Removes a member from the workspace, safely handling assigned resources and preserving history.
 */
export async function removeMemberAction(input: RemoveMemberInput) {
  try {
    const { workspaceId, userId: actorUserId, role: actorRole } =
      await requirePermission("team.remove");

    const validation = removeMemberSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid member removal input",
      };
    }

    const { targetUserId, reassignToUserId } = validation.data;

    // Prevent removing self via team remove
    if (targetUserId === actorUserId) {
      return {
        success: false,
        error: "You cannot remove yourself from the workspace here. Use workspace leave or transfer ownership.",
      };
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_workspaceId: {
          userId: targetUserId,
          workspaceId,
        },
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!targetMembership) {
      return { success: false, error: "Member not found in this workspace" };
    }

    // Only OWNER can remove another OWNER
    if (targetMembership.role === Role.OWNER && actorRole !== Role.OWNER) {
      return {
        success: false,
        error: "Only a workspace Owner can remove another Owner.",
      };
    }

    // Last Owner Protection
    if (targetMembership.role === Role.OWNER) {
      const totalOwners = await prisma.membership.count({
        where: { workspaceId, role: Role.OWNER },
      });

      if (totalOwners <= 1) {
        return {
          success: false,
          error: "You cannot remove the last workspace Owner.",
        };
      }
    }

    // Handle Resource Reassignments atomically
    await prisma.$transaction(async (tx) => {
      if (reassignToUserId) {
        // Verify reassignee is in the workspace
        const reassignee = await tx.membership.findUnique({
          where: {
            userId_workspaceId: {
              userId: reassignToUserId,
              workspaceId,
            },
          },
          include: { user: { select: { name: true } } },
        });

        if (reassignee) {
          // Reassign leads
          await tx.lead.updateMany({
            where: { workspaceId, ownerId: targetUserId },
            data: {
              ownerId: reassignToUserId,
              ownerName: reassignee.user.name,
            },
          });

          // Reassign tasks
          await tx.task.updateMany({
            where: { workspaceId, assignedToId: targetUserId },
            data: {
              assignedToId: reassignToUserId,
              assignedToName: reassignee.user.name,
            },
          });
        }
      } else {
        // Safe unassignment without deleting records
        await tx.lead.updateMany({
          where: { workspaceId, ownerId: targetUserId },
          data: { ownerId: null },
        });

        await tx.task.updateMany({
          where: { workspaceId, assignedToId: targetUserId },
          data: { assignedToId: null, assignedToName: "Unassigned" },
        });
      }

      // Delete the workspace membership record (User account remains preserved globally)
      await tx.membership.delete({
        where: { id: targetMembership.id },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          workspaceId,
          userId: actorUserId,
          action: "USER_REMOVED",
          entityType: "TEAM_MEMBER",
          entityId: targetUserId,
          metadata: JSON.stringify({
            removedMemberName: targetMembership.user.name,
            removedMemberEmail: targetMembership.user.email,
            previousRole: targetMembership.role,
            reassignedToUserId: reassignToUserId || "UNASSIGNED",
          }),
        },
      });
    });

    revalidatePath("/app/settings/team");
    revalidatePath("/app/settings/audit-log");
    revalidatePath("/app/leads");
    revalidatePath("/app/tasks");

    return { success: true };
  } catch (err) {
    console.error("removeMemberAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to remove member",
    };
  }
}

/**
 * Public lookup of an invitation by raw token string.
 */
export async function validateInvitationTokenAction(rawToken: string) {
  try {
    if (!rawToken || rawToken.trim() === "") {
      return { success: false, error: "Invalid invitation token" };
    }

    const tokenHash = hashToken(rawToken.trim());

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation not found or invalid" };
    }

    if (invitation.acceptedAt) {
      return {
        success: false,
        error: "This invitation has already been accepted and cannot be reused.",
      };
    }

    if (new Date() > invitation.expiresAt) {
      return {
        success: false,
        error: "This invitation has expired. Please request a new invitation from your workspace admin.",
      };
    }

    // Check if email already belongs to an existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, name: true, email: true },
    });

    return {
      success: true,
      data: {
        email: invitation.email,
        role: invitation.role,
        workspaceName: invitation.workspace.name,
        workspaceSlug: invitation.workspace.slug,
        invitedByName: invitation.invitedBy.name,
        isExistingUser: !!existingUser,
        existingUserName: existingUser?.name || null,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("validateInvitationTokenAction error:", err);
    return { success: false, error: "Unable to validate invitation" };
  }
}

/**
 * Public action to accept an invitation and join the workspace.
 */
export async function acceptInvitationAction(input: AcceptInvitationInput) {
  try {
    const validation = acceptInvitationSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }

    const { token, name, password } = validation.data;
    const tokenHash = hashToken(token.trim());

    const invitation = await prisma.workspaceInvitation.findUnique({
      where: { tokenHash },
      include: {
        workspace: true,
      },
    });

    if (!invitation) {
      return { success: false, error: "Invitation token not found" };
    }

    if (invitation.acceptedAt) {
      return {
        success: false,
        error: "This invitation has already been accepted and cannot be used again.",
      };
    }

    if (new Date() > invitation.expiresAt) {
      return {
        success: false,
        error: "This invitation has expired. Please request a fresh invitation.",
      };
    }

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (user) {
      // User exists. Check if active session matches or verify password if provided
      const currentSession = await getSession();
      if (!currentSession || currentSession.userId !== user.id) {
        if (!password) {
          return {
            success: false,
            error: "Please enter your password to join this workspace with your existing account.",
            requiresPassword: true,
          };
        }

        const isPasswordValid = await verifyPassword(password, user.passwordHash);
        if (!isPasswordValid) {
          return {
            success: false,
            error: "Incorrect password for this account.",
            requiresPassword: true,
          };
        }
      }
    } else {
      // New user registration
      if (!name || !password) {
        return {
          success: false,
          error: "Full name and password are required to create your account.",
        };
      }

      if (password.length < 8) {
        return {
          success: false,
          error: "Password must be at least 8 characters long.",
        };
      }

      const passwordHash = await hashPassword(password);
      user = await prisma.user.create({
        data: {
          name,
          email: invitation.email.toLowerCase(),
          passwordHash,
        },
      });
    }

    // Atomic membership creation and invitation invalidation
    await prisma.$transaction(async (tx) => {
      // Check if already in workspace
      const existingMembership = await tx.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: invitation.workspaceId,
          },
        },
      });

      if (!existingMembership) {
        await tx.membership.create({
          data: {
            userId: user.id,
            workspaceId: invitation.workspaceId,
            role: invitation.role,
          },
        });
      }

      // Mark invitation as accepted (prevents replay)
      await tx.workspaceInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          action: "USER_JOINED",
          entityType: "TEAM_MEMBER",
          entityId: user.id,
          metadata: JSON.stringify({
            userName: user.name,
            userEmail: user.email,
            assignedRole: invitation.role,
            invitationId: invitation.id,
          }),
        },
      });
    });

    // Create session cookie for newly joined user
    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      workspaceId: invitation.workspace.id,
      workspaceName: invitation.workspace.name,
      workspaceSlug: invitation.workspace.slug,
      role: invitation.role,
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: { redirectUrl: "/app/dashboard" },
    };
  } catch (err) {
    console.error("acceptInvitationAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to accept invitation",
    };
  }
}

export async function getWorkspaceTeamAction(params: GetTeamMembersParams = {}) {
  return getTeamMembersAction(params);
}

