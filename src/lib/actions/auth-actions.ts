"use server";

import prisma from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { createAuditLog } from "@/lib/services/audit-service";
import { loginSchema, signupSchema } from "@/lib/validations/auth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Handles secure user authentication and creates an HTTP-only session cookie.
 */
export async function loginAction(
  formData: FormData | { email: string; password: string }
): Promise<ActionResult<{ redirectUrl: string }>> {
  try {
    const rawData =
      formData instanceof FormData
        ? {
            email: formData.get("email") as string,
            password: formData.get("password") as string,
          }
        : formData;

    const validation = loginSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return {
        success: false,
        error: "Invalid email or password",
      };
    }

    // Determine primary workspace membership
    const primaryMembership = user.memberships[0];
    if (!primaryMembership) {
      return {
        success: false,
        error: "No active workspace membership found for this account",
      };
    }

    await createSession({
      userId: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      workspaceId: primaryMembership.workspaceId,
      workspaceName: primaryMembership.workspace.name,
      workspaceSlug: primaryMembership.workspace.slug,
      role: primaryMembership.role,
    });

    // Log audit login event
    await createAuditLog({
      workspaceId: primaryMembership.workspaceId,
      userId: user.id,
      action: "LOGIN",
      entityType: "AUTH_SESSION",
      entityId: user.id,
      metadata: {
        email: user.email,
        workspaceSlug: primaryMembership.workspace.slug,
      },
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: { redirectUrl: "/app/dashboard" },
    };
  } catch (err) {
    console.error("Login error:", err);
    return {
      success: false,
      error: "An unexpected error occurred during sign in. Please try again.",
    };
  }
}

/**
 * Handles new organization registration with Prisma Transaction.
 * Creates User + Workspace + Membership(OWNER) atomically.
 */
export async function signupAction(
  formData: FormData | { name: string; email: string; password: string; workspaceName: string }
): Promise<ActionResult<{ redirectUrl: string }>> {
  try {
    const rawData =
      formData instanceof FormData
        ? {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            password: formData.get("password") as string,
            workspaceName: formData.get("workspaceName") as string,
          }
        : formData;

    const validation = signupSchema.safeParse(rawData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }

    const { name, email, password, workspaceName } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // Check if email already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return {
        success: false,
        error: "An account with this email address already exists.",
      };
    }

    const passwordHash = await hashPassword(password);
    const baseSlug = workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "workspace";
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

    // Atomic transaction creating User + Workspace + Membership (OWNER)
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          passwordHash,
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug,
        },
      });

      const membership = await tx.membership.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: Role.OWNER,
        },
      });

      // Default notification preferences
      await tx.notificationPreference.create({
        data: {
          userId: user.id,
        },
      });

      // Initial welcome notification
      await tx.notification.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          title: "Welcome to NEXORA CRM",
          description: `Your workspace "${workspaceName}" is ready. Start by adding your first lead!`,
          type: "system",
        },
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          action: "WORKSPACE_CREATED",
          entityType: "WORKSPACE",
          entityId: workspace.id,
          metadata: JSON.stringify({
            workspaceName,
            slug,
            ownerEmail: user.email,
          }),
        },
      });

      return { user, workspace, membership };
    });

    await createSession({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      avatarUrl: result.user.avatarUrl,
      workspaceId: result.workspace.id,
      workspaceName: result.workspace.name,
      workspaceSlug: result.workspace.slug,
      role: result.membership.role,
    });

    revalidatePath("/", "layout");

    return {
      success: true,
      data: { redirectUrl: "/app/dashboard" },
    };
  } catch (err) {
    console.error("Signup error:", err);
    return {
      success: false,
      error: "Unable to create account at this time. Please try again.",
    };
  }
}

/**
 * Destroys session and redirects to login page.
 */
export async function logoutAction(): Promise<void> {
  const session = await getSession();
  if (session) {
    await createAuditLog({
      workspaceId: session.workspaceId,
      userId: session.userId,
      action: "LOGOUT",
      entityType: "AUTH_SESSION",
      entityId: session.userId,
      metadata: {
        email: session.email,
      },
    });
  }
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Returns current authenticated user and workspace profile.
 */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return session;
}
