"use server";

import prisma from "@/lib/prisma";
import { getSession, createSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createAuditLog } from "@/lib/services/audit-service";
import {
  profileSettingsSchema,
  securityPasswordSchema,
  notificationPreferenceSchema,
  ProfileSettingsInput,
  SecurityPasswordInput,
  NotificationPreferenceInput,
} from "@/lib/validations/settings";
import { revalidatePath } from "next/cache";

/**
 * Retrieves the current user's profile and workspace details.
 */
export async function getProfileAction() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return {
      success: true,
      data: {
        ...user,
        role: session.role,
        workspaceName: session.workspaceName,
        workspaceSlug: session.workspaceSlug,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (err) {
    console.error("getProfileAction error:", err);
    return { success: false, error: "Unable to load profile" };
  }
}

/**
 * Updates profile details (Name & Avatar). Email is strictly read-only.
 */
export async function updateProfileAction(input: ProfileSettingsInput) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    const validation = profileSettingsSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid profile data",
      };
    }

    const data = validation.data;

    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: data.name,
        avatarUrl: data.avatarUrl || null,
      },
    });

    // Update active session cookie with new name/avatar
    await createSession({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatarUrl: updatedUser.avatarUrl,
      workspaceId: session.workspaceId,
      workspaceName: session.workspaceName,
      workspaceSlug: session.workspaceSlug,
      role: session.role,
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: {
        name: updatedUser.name,
        avatarUrl: updatedUser.avatarUrl,
      },
    };
  } catch (err) {
    console.error("updateProfileAction error:", err);
    return { success: false, error: "Failed to update profile" };
  }
}

/**
 * Securely updates account password with current password verification and bcrypt hashing.
 */
export async function updatePasswordAction(input: SecurityPasswordInput) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    const validation = securityPasswordSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid password data",
      };
    }

    const { currentPassword, newPassword } = validation.data;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return { success: false, error: "User account not found" };
    }

    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { success: false, error: "Current password is incorrect" };
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    // Create audit log entry without ANY passwords or hashes
    await createAuditLog({
      workspaceId: session.workspaceId,
      userId: user.id,
      action: "PASSWORD_CHANGED",
      entityType: "USER_SECURITY",
      entityId: user.id,
      metadata: {
        event: "Password updated successfully by user",
      },
    });

    return { success: true };
  } catch (err) {
    console.error("updatePasswordAction error:", err);
    return { success: false, error: "Failed to update password" };
  }
}

/**
 * Retrieves user notification preferences with default fallback.
 */
export async function getNotificationPreferencesAction() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    let pref = await prisma.notificationPreference.findUnique({
      where: { userId: session.userId },
    });

    if (!pref) {
      pref = await prisma.notificationPreference.create({
        data: {
          userId: session.userId,
        },
      });
    }

    return {
      success: true,
      data: {
        taskNotifications: pref.taskNotifications,
        leadNotifications: pref.leadNotifications,
        invoiceNotifications: pref.invoiceNotifications,
        integrationNotifications: pref.integrationNotifications,
        statusNotifications: pref.statusNotifications,
        emailDigest: pref.emailDigest,
      },
    };
  } catch (err) {
    console.error("getNotificationPreferencesAction error:", err);
    return { success: false, error: "Unable to load preferences" };
  }
}

/**
 * Updates user notification preferences.
 */
export async function updateNotificationPreferencesAction(input: NotificationPreferenceInput) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    const validation = notificationPreferenceSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, error: "Invalid preference data" };
    }

    const data = validation.data;

    const pref = await prisma.notificationPreference.upsert({
      where: { userId: session.userId },
      create: {
        userId: session.userId,
        ...data,
      },
      update: data,
    });

    return { success: true, data: pref };
  } catch (err) {
    console.error("updateNotificationPreferencesAction error:", err);
    return { success: false, error: "Failed to update notification settings" };
  }
}

/**
 * Returns active session metadata for the security dashboard.
 */
export async function getSessionSecurityInfoAction() {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return { success: false, error: "Not authenticated" };
    }

    const expiresDate = new Date(session.expiresAt * 1000);

    return {
      success: true,
      data: {
        currentSession: {
          ipAddress: "127.0.0.1 (Local Environment)",
          device: "Current Browser (Active Session)",
          role: session.role,
          workspace: session.workspaceName,
          expiresAt: expiresDate.toISOString(),
          isCurrent: true,
        },
      },
    };
  } catch (err) {
    console.error("getSessionSecurityInfoAction error:", err);
    return { success: false, error: "Unable to load session info" };
  }
}
