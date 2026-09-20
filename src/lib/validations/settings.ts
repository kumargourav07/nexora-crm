import { z } from "zod";
import { Role, LeadStatus } from "@prisma/client";

export const roleEnum = z.nativeEnum(Role);

export const inviteMemberSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  role: roleEnum.default(Role.MEMBER),
  message: z.string().max(300, "Message must be under 300 characters").optional(),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const changeRoleSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  newRole: roleEnum,
});

export type ChangeRoleInput = z.infer<typeof changeRoleSchema>;

export const removeMemberSchema = z.object({
  targetUserId: z.string().min(1, "Target user ID is required"),
  reassignToUserId: z.string().optional(),
});

export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;

export const workspaceSettingsSchema = z.object({
  name: z
    .string()
    .min(2, "Workspace name must be at least 2 characters")
    .max(100, "Workspace name must be under 100 characters"),
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60, "Slug must be under 60 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  timezone: z.string().min(2, "Timezone is required"),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).default("DD/MM/YYYY"),
  defaultLeadStatus: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
});

export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;

export const deleteWorkspaceSchema = z.object({
  confirmationName: z.string().min(1, "Please type the workspace name to confirm deletion"),
});

export type DeleteWorkspaceInput = z.infer<typeof deleteWorkspaceSchema>;

export const profileSettingsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  avatarUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
});

export type ProfileSettingsInput = z.infer<typeof profileSettingsSchema>;

export const securityPasswordSchema = z
  .object({
    currentPassword: z.string().min(6, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Za-z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(8, "Password confirmation is required"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  });

export type SecurityPasswordInput = z.infer<typeof securityPasswordSchema>;

export const notificationPreferenceSchema = z.object({
  taskNotifications: z.boolean().default(true),
  leadNotifications: z.boolean().default(true),
  invoiceNotifications: z.boolean().default(true),
  integrationNotifications: z.boolean().default(true),
  statusNotifications: z.boolean().default(true),
  emailDigest: z.boolean().default(true),
});

export type NotificationPreferenceInput = z.infer<typeof notificationPreferenceSchema>;
