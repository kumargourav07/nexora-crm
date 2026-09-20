import { z } from "zod";
import {
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  CallOutcome,
  MeetingStatus,
  FollowUpStatus,
  FollowUpType,
  EmailDeliveryStatus,
} from "@prisma/client";

// Re-export prisma enums for easy consumption
export {
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  CallOutcome,
  MeetingStatus,
  FollowUpStatus,
  FollowUpType,
  EmailDeliveryStatus,
};

// ===========================================================================
// CALL LOGGING / SCHEDULING SCHEMAS
// ===========================================================================

export const logCallSchema = z.object({
  direction: z.nativeEnum(CommunicationDirection).default(CommunicationDirection.OUTBOUND),
  callOutcome: z.nativeEnum(CallOutcome).default(CallOutcome.CONNECTED),
  durationSeconds: z.number().int().min(0).max(86400).optional().default(0),
  subject: z.string().optional(),
  content: z.string().min(1, "Call notes or summary are required"),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
  recipientPhone: z.string().optional().nullable(),
  scheduledAt: z.string().or(z.date()).optional().nullable(),
  // Optional follow-up trigger
  createFollowUp: z.boolean().optional().default(false),
  followUpDueAt: z.string().or(z.date()).optional().nullable(),
  followUpTitle: z.string().optional().nullable(),
});

export type LogCallInput = z.infer<typeof logCallSchema>;

// ===========================================================================
// MEETING SCHEDULING & STATUS SCHEMAS
// ===========================================================================

export const scheduleMeetingSchema = z.object({
  title: z.string().min(2, "Meeting title must be at least 2 characters"),
  meetingStart: z.string().or(z.date()),
  meetingEnd: z.string().or(z.date()).optional().nullable(),
  meetingLocation: z.string().optional().nullable(),
  meetingLink: z.string().url("Invalid meeting URL format").or(z.literal("")).optional().nullable(),
  content: z.string().optional().default(""),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export type ScheduleMeetingInput = z.infer<typeof scheduleMeetingSchema>;

export const updateMeetingStatusSchema = z.object({
  id: z.string().min(1, "Meeting ID is required"),
  meetingStatus: z.nativeEnum(MeetingStatus),
  notes: z.string().optional().nullable(),
});

export type UpdateMeetingStatusInput = z.infer<typeof updateMeetingStatusSchema>;

// ===========================================================================
// EMAIL SCHEMAS
// ===========================================================================

export const sendEmailSchema = z.object({
  recipientEmail: z.string().email("Valid recipient email is required"),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Email body is required"),
  templateId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
});

export type SendEmailInput = z.infer<typeof sendEmailSchema>;

// ===========================================================================
// GENERAL MESSAGE / NOTE SCHEMAS (WhatsApp, SMS, Internal Note)
// ===========================================================================

export const logMessageSchema = z.object({
  type: z.nativeEnum(CommunicationType),
  direction: z.nativeEnum(CommunicationDirection).default(CommunicationDirection.OUTBOUND),
  content: z.string().min(1, "Message content or note is required"),
  subject: z.string().optional().nullable(),
  recipientPhone: z.string().optional().nullable(),
  recipientEmail: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  invoiceId: z.string().optional().nullable(),
});

export type LogMessageInput = z.infer<typeof logMessageSchema>;

// ===========================================================================
// FOLLOW-UP SCHEMAS
// ===========================================================================

export const createFollowUpSchema = z.object({
  title: z.string().min(2, "Follow-up title must be at least 2 characters"),
  type: z.nativeEnum(FollowUpType).default(FollowUpType.CALL),
  dueAt: z.string().or(z.date()),
  notes: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  communicationId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
});

export type CreateFollowUpInput = z.infer<typeof createFollowUpSchema>;

export const completeFollowUpSchema = z.object({
  id: z.string().min(1, "Follow-up ID is required"),
  outcome: z.string().min(1, "Follow-up outcome is required (e.g. Completed, Left Message, Rescheduled)"),
  completionNotes: z.string().optional().nullable(),
  createNextFollowUp: z.boolean().optional().default(false),
  nextFollowUpTitle: z.string().optional().nullable(),
  nextFollowUpType: z.nativeEnum(FollowUpType).optional().default(FollowUpType.CALL),
  nextFollowUpDueAt: z.string().or(z.date()).optional().nullable(),
});

export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;

export const rescheduleFollowUpSchema = z.object({
  id: z.string().min(1, "Follow-up ID is required"),
  dueAt: z.string().or(z.date()),
  notes: z.string().optional().nullable(),
});

export type RescheduleFollowUpInput = z.infer<typeof rescheduleFollowUpSchema>;

// ===========================================================================
// TEMPLATE SCHEMAS
// ===========================================================================

export const createTemplateSchema = z.object({
  name: z.string().min(2, "Template name must be at least 2 characters"),
  type: z.nativeEnum(CommunicationType).default(CommunicationType.EMAIL),
  subject: z.string().optional().nullable(),
  body: z.string().min(1, "Template content is required"),
  isActive: z.boolean().optional().default(true),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

export const updateTemplateSchema = createTemplateSchema.extend({
  id: z.string().min(1, "Template ID is required"),
});

export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;

// ===========================================================================
// QUERY FILTERS & METRIC SCHEMAS
// ===========================================================================

export const communicationFilterSchema = z.object({
  type: z.nativeEnum(CommunicationType).optional(),
  direction: z.nativeEnum(CommunicationDirection).optional(),
  status: z.nativeEnum(CommunicationStatus).optional(),
  leadId: z.string().optional(),
  contactId: z.string().optional(),
  dealId: z.string().optional(),
  companyId: z.string().optional(),
  invoiceId: z.string().optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export type CommunicationFilterInput = z.infer<typeof communicationFilterSchema>;

export const followUpFilterSchema = z.object({
  tab: z.enum(["ALL", "TODAY", "TOMORROW", "THIS_WEEK", "OVERDUE", "COMPLETED", "UPCOMING"]).default("TODAY"),
  type: z.nativeEnum(FollowUpType).optional(),
  ownerId: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(50),
});

export type FollowUpFilterInput = z.infer<typeof followUpFilterSchema>;

// ===========================================================================
// STARTER TEMPLATES
// ===========================================================================

export interface StarterTemplate {
  name: string;
  type: CommunicationType;
  subject?: string;
  body: string;
  variables: string[];
}

export const STARTER_COMMUNICATION_TEMPLATES: StarterTemplate[] = [
  {
    name: "New Inbound Lead Outreach",
    type: CommunicationType.EMAIL,
    subject: "Thank you for reaching out to {{workspace.name}}, {{lead.name}}!",
    body: `Hi {{lead.name}},

Thank you for your interest in {{workspace.name}}. We received your inquiry regarding our solutions and would love to learn more about your goals at {{lead.company}}.

Could you let us know what time works best for a brief 10-minute discovery call this week?

Best regards,
{{sender.name}}
{{workspace.name}}`,
    variables: ["lead.name", "workspace.name", "lead.company", "sender.name"],
  },
  {
    name: "Deal Proposal & Follow-up",
    type: CommunicationType.EMAIL,
    subject: "Follow-up: Proposal for {{deal.title}}",
    body: `Hi {{contact.name}},

I wanted to follow up regarding the proposal we shared for {{deal.title}} (Deal Value: ₹{{deal.value}}).

Please let me know if you have any questions or if you'd like to schedule a quick walkthrough with our technical team.

Looking forward to hearing your thoughts!

Warm regards,
{{sender.name}}
{{workspace.name}}`,
    variables: ["contact.name", "deal.title", "deal.value", "sender.name", "workspace.name"],
  },
  {
    name: "Meeting Confirmation & Agenda",
    type: CommunicationType.EMAIL,
    subject: "Confirmed: {{meeting.title}} with {{workspace.name}}",
    body: `Hi {{lead.name}},

This is a confirmation for our upcoming session:
• Meeting: {{meeting.title}}
• Scheduled Time: {{meeting.start}}
• Meeting Link: {{meeting.link}}

If you need to reschedule or invite additional team members, please feel free to reply directly to this email.

Best,
{{sender.name}}`,
    variables: ["lead.name", "meeting.title", "meeting.start", "meeting.link", "sender.name", "workspace.name"],
  },
  {
    name: "Invoice Payment Reminder",
    type: CommunicationType.EMAIL,
    subject: "Payment Reminder: Invoice {{invoice.invoiceNumber}} - ₹{{invoice.balanceAmount}} Due",
    body: `Dear {{contact.name}},

This is a friendly reminder that Invoice {{invoice.invoiceNumber}} with an outstanding balance of ₹{{invoice.balanceAmount}} is due on {{invoice.dueDate}}.

Please review the attached invoice details or contact our billing desk if you need payment assistance.

Thank you for your business!

Sincerely,
Accounts Team
{{workspace.name}}`,
    variables: ["contact.name", "invoice.invoiceNumber", "invoice.balanceAmount", "invoice.dueDate", "workspace.name"],
  },
  {
    name: "WhatsApp Quick Lead Touchpoint",
    type: CommunicationType.WHATSAPP,
    body: `Hi {{lead.name}}, this is {{sender.name}} from {{workspace.name}}. We noticed your interest in our products. Would you be open for a quick chat today? Let us know what time suits you best!`,
    variables: ["lead.name", "sender.name", "workspace.name"],
  },
];
