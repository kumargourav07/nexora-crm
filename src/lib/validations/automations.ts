import { z } from "zod";
import {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowExecutionStatus,
  ConditionOperator,
  ConditionMatchGroup,
} from "@prisma/client";

// Re-export enums
export {
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowExecutionStatus,
  ConditionOperator,
  ConditionMatchGroup,
};

export const ActionFailurePolicy = {
  STOP_WORKFLOW: "STOP_WORKFLOW",
  CONTINUE: "CONTINUE",
} as const;

export type ActionFailurePolicyType =
  (typeof ActionFailurePolicy)[keyof typeof ActionFailurePolicy];

// Available trigger descriptors for UI grouping and labels
export interface TriggerDescriptor {
  type: WorkflowTriggerType;
  label: string;
  category: "LEADS" | "CONTACTS" | "DEALS" | "INVOICES" | "TASKS";
  description: string;
  availableFields: Array<{
    field: string;
    label: string;
    type: "string" | "number" | "enum" | "boolean";
    options?: string[];
  }>;
}

export const WORKFLOW_TRIGGERS: TriggerDescriptor[] = [
  // Leads
  {
    type: WorkflowTriggerType.LEAD_CREATED,
    label: "Lead Created",
    category: "LEADS",
    description: "Fires when a new inbound lead is created or ingested",
    availableFields: [
      {
        field: "lead.source",
        label: "Lead Source",
        type: "enum",
        options: [
          "FACEBOOK",
          "INDIAMART",
          "NINETY_NINE_ACRES",
          "HOUSING",
          "GOOGLE_ADS",
          "WEBSITE",
          "WHATSAPP",
          "OTHER",
        ],
      },
      {
        field: "lead.status",
        label: "Lead Status",
        type: "enum",
        options: [
          "NEW",
          "CONTACTED",
          "QUALIFIED",
          "PROPOSAL",
          "NEGOTIATION",
          "WON",
          "LOST",
        ],
      },
      { field: "lead.value", label: "Lead Value (₹)", type: "number" },
      { field: "lead.name", label: "Lead Name", type: "string" },
      { field: "lead.company", label: "Lead Company", type: "string" },
      { field: "lead.email", label: "Lead Email", type: "string" },
      { field: "lead.phone", label: "Lead Phone", type: "string" },
      { field: "lead.ownerName", label: "Owner Name", type: "string" },
    ],
  },
  {
    type: WorkflowTriggerType.LEAD_UPDATED,
    label: "Lead Updated",
    category: "LEADS",
    description: "Fires when lead details are modified",
    availableFields: [
      {
        field: "lead.status",
        label: "Lead Status",
        type: "enum",
        options: [
          "NEW",
          "CONTACTED",
          "QUALIFIED",
          "PROPOSAL",
          "NEGOTIATION",
          "WON",
          "LOST",
        ],
      },
      { field: "lead.value", label: "Lead Value (₹)", type: "number" },
      { field: "lead.source", label: "Lead Source", type: "string" },
    ],
  },
  {
    type: WorkflowTriggerType.LEAD_STATUS_CHANGED,
    label: "Lead Status Changed",
    category: "LEADS",
    description: "Fires when a lead transitions to a new status stage",
    availableFields: [
      {
        field: "lead.status",
        label: "New Status",
        type: "enum",
        options: [
          "NEW",
          "CONTACTED",
          "QUALIFIED",
          "PROPOSAL",
          "NEGOTIATION",
          "WON",
          "LOST",
        ],
      },
      { field: "lead.value", label: "Lead Value (₹)", type: "number" },
      { field: "lead.source", label: "Lead Source", type: "string" },
    ],
  },
  {
    type: WorkflowTriggerType.LEAD_SOURCE_RECEIVED,
    label: "Lead Ingested from Connector",
    category: "LEADS",
    description: "Fires when a lead webhook is successfully ingested from an external connector",
    availableFields: [
      { field: "lead.source", label: "Integration Source", type: "string" },
      { field: "lead.name", label: "Lead Name", type: "string" },
      { field: "lead.value", label: "Lead Value", type: "number" },
    ],
  },

  // Deals
  {
    type: WorkflowTriggerType.DEAL_CREATED,
    label: "Deal Created",
    category: "DEALS",
    description: "Fires when a new opportunity or deal is opened",
    availableFields: [
      { field: "deal.name", label: "Deal Name", type: "string" },
      { field: "deal.value", label: "Deal Value (₹)", type: "number" },
      { field: "deal.stageName", label: "Stage Name", type: "string" },
      { field: "deal.probability", label: "Win Probability (%)", type: "number" },
      { field: "deal.status", label: "Deal Status", type: "enum", options: ["OPEN", "WON", "LOST"] },
    ],
  },
  {
    type: WorkflowTriggerType.DEAL_STAGE_CHANGED,
    label: "Deal Stage Changed",
    category: "DEALS",
    description: "Fires when a deal is moved to a different pipeline stage",
    availableFields: [
      { field: "deal.stageName", label: "New Stage Name", type: "string" },
      { field: "deal.value", label: "Deal Value (₹)", type: "number" },
      { field: "deal.probability", label: "Probability (%)", type: "number" },
    ],
  },
  {
    type: WorkflowTriggerType.DEAL_WON,
    label: "Deal Won",
    category: "DEALS",
    description: "Fires when a deal is successfully closed/won",
    availableFields: [
      { field: "deal.name", label: "Deal Name", type: "string" },
      { field: "deal.value", label: "Deal Value (₹)", type: "number" },
      { field: "deal.ownerName", label: "Deal Owner", type: "string" },
    ],
  },
  {
    type: WorkflowTriggerType.DEAL_LOST,
    label: "Deal Lost",
    category: "DEALS",
    description: "Fires when a deal is closed/lost",
    availableFields: [
      { field: "deal.name", label: "Deal Name", type: "string" },
      { field: "deal.value", label: "Deal Value (₹)", type: "number" },
      { field: "deal.lostReason", label: "Lost Reason", type: "string" },
    ],
  },

  // Invoices
  {
    type: WorkflowTriggerType.INVOICE_CREATED,
    label: "Invoice Created",
    category: "INVOICES",
    description: "Fires when a new invoice draft or bill is created",
    availableFields: [
      { field: "invoice.number", label: "Invoice Number", type: "string" },
      { field: "invoice.total", label: "Invoice Amount (₹)", type: "number" },
      { field: "invoice.status", label: "Invoice Status", type: "enum", options: ["DRAFT", "SENT", "PAID", "OVERDUE"] },
      { field: "invoice.clientName", label: "Client Name", type: "string" },
    ],
  },
  {
    type: WorkflowTriggerType.INVOICE_SENT,
    label: "Invoice Sent",
    category: "INVOICES",
    description: "Fires when an invoice is sent to client",
    availableFields: [
      { field: "invoice.number", label: "Invoice Number", type: "string" },
      { field: "invoice.total", label: "Invoice Amount (₹)", type: "number" },
    ],
  },
  {
    type: WorkflowTriggerType.INVOICE_PAID,
    label: "Invoice Paid",
    category: "INVOICES",
    description: "Fires when an invoice is marked fully paid",
    availableFields: [
      { field: "invoice.number", label: "Invoice Number", type: "string" },
      { field: "invoice.total", label: "Total Amount (₹)", type: "number" },
    ],
  },
  {
    type: WorkflowTriggerType.INVOICE_OVERDUE,
    label: "Invoice Overdue",
    category: "INVOICES",
    description: "Fires when invoice due date expires without payment",
    availableFields: [
      { field: "invoice.number", label: "Invoice Number", type: "string" },
      { field: "invoice.total", label: "Invoice Amount (₹)", type: "number" },
      { field: "invoice.dueDaysOverdue", label: "Days Overdue", type: "number" },
    ],
  },
  {
    type: WorkflowTriggerType.PAYMENT_RECEIVED,
    label: "Payment Received",
    category: "INVOICES",
    description: "Fires when a payment is logged against an invoice",
    availableFields: [
      { field: "payment.amount", label: "Payment Amount (₹)", type: "number" },
      { field: "payment.method", label: "Payment Method", type: "string" },
      { field: "invoice.number", label: "Invoice Number", type: "string" },
    ],
  },

  // Tasks
  {
    type: WorkflowTriggerType.TASK_CREATED,
    label: "Task Created",
    category: "TASKS",
    description: "Fires when a new task is created",
    availableFields: [
      { field: "task.title", label: "Task Title", type: "string" },
      { field: "task.priority", label: "Priority", type: "enum", options: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
    ],
  },
  {
    type: WorkflowTriggerType.TASK_COMPLETED,
    label: "Task Completed",
    category: "TASKS",
    description: "Fires when a task status changes to COMPLETED",
    availableFields: [
      { field: "task.title", label: "Task Title", type: "string" },
    ],
  },
];

// Available action descriptors
export interface ActionDescriptor {
  type: WorkflowActionType;
  label: string;
  category: "LEADS" | "TASKS" | "NOTIFICATIONS" | "DEALS" | "INVOICES" | "GENERAL";
  description: string;
  requiresConfig: boolean;
}

export const WORKFLOW_ACTIONS: ActionDescriptor[] = [
  {
    type: WorkflowActionType.ASSIGN_LEAD,
    label: "Assign Lead",
    category: "LEADS",
    description: "Assigns the lead to a specific workspace user or default owner",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.UPDATE_LEAD_STATUS,
    label: "Update Lead Status",
    category: "LEADS",
    description: "Changes the lead status (e.g. New, Contacted, Qualified, Lost)",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.UPDATE_LEAD_SOURCE,
    label: "Update Lead Source",
    category: "LEADS",
    description: "Updates the origin source tag of the lead",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.ADD_TAG,
    label: "Add Tag",
    category: "LEADS",
    description: "Appends a label/tag to the entity (e.g., 'High Intent', 'Facebook Lead')",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.REMOVE_TAG,
    label: "Remove Tag",
    category: "LEADS",
    description: "Removes an existing label/tag from the entity",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.CREATE_TASK,
    label: "Create Follow-up Task",
    category: "TASKS",
    description: "Schedules a task for the lead owner or assigned team member",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.SEND_NOTIFICATION,
    label: "Send In-App Notification",
    category: "NOTIFICATIONS",
    description: "Dispatches an alert banner/bell notification to designated members",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.CREATE_ACTIVITY,
    label: "Log Activity Entry",
    category: "GENERAL",
    description: "Logs an automated entry into the lead/deal activity audit trail",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.UPDATE_DEAL_STAGE,
    label: "Update Deal Stage",
    category: "DEALS",
    description: "Advances or updates the pipeline stage of the deal",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.ASSIGN_DEAL,
    label: "Assign Deal Owner",
    category: "DEALS",
    description: "Reassigns the opportunity owner",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.CREATE_INVOICE,
    label: "Create Draft Invoice",
    category: "INVOICES",
    description: "Creates an invoice draft from deal / lead details",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.SEND_INVOICE,
    label: "Send Invoice Email",
    category: "INVOICES",
    description: "Sends invoice to client (requires verified email connector)",
    requiresConfig: true,
  },
  {
    type: WorkflowActionType.DELAY,
    label: "Wait / Delay Action",
    category: "GENERAL",
    description: "Delays subsequent workflow steps (abstracted for scheduler execution)",
    requiresConfig: true,
  },
];

// Zod Schemas
export const workflowConditionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  field: z.string().min(1, "Field is required"),
  operator: z.nativeEnum(ConditionOperator),
  value: z.string().optional().default(""),
});

export type WorkflowConditionInput = z.infer<typeof workflowConditionSchema>;

export const workflowActionSchema = z.object({
  id: z.string().default(() => Math.random().toString(36).substring(2, 9)),
  type: z.nativeEnum(WorkflowActionType),
  config: z.record(z.string(), z.any()).default({}),
  failurePolicy: z
    .enum([ActionFailurePolicy.STOP_WORKFLOW, ActionFailurePolicy.CONTINUE])
    .default(ActionFailurePolicy.STOP_WORKFLOW),
});

export type WorkflowActionInput = z.infer<typeof workflowActionSchema>;

export const createWorkflowSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "Workflow name must be at least 3 characters")
    .max(120, "Workflow name cannot exceed 120 characters"),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").optional().default(""),
  triggerType: z.nativeEnum(WorkflowTriggerType),
  triggerConfig: z.record(z.string(), z.any()).optional().default({}),
  conditionMatch: z.nativeEnum(ConditionMatchGroup).default(ConditionMatchGroup.ALL),
  conditions: z.array(workflowConditionSchema).default([]),
  actions: z
    .array(workflowActionSchema)
    .min(1, "At least one action is required to activate a workflow"),
  status: z.nativeEnum(WorkflowStatus).default(WorkflowStatus.DRAFT),
});

export type CreateWorkflowInput = z.input<typeof createWorkflowSchema>;

export const updateWorkflowSchema = createWorkflowSchema.partial().extend({
  id: z.string().min(1, "Workflow ID is required"),
});

export type UpdateWorkflowInput = z.input<typeof updateWorkflowSchema>;

export const getWorkflowsFilterSchema = z.object({
  status: z.union([z.nativeEnum(WorkflowStatus), z.literal("ALL")]).optional().default("ALL"),
  triggerType: z.union([z.nativeEnum(WorkflowTriggerType), z.literal("ALL")]).optional().default("ALL"),
  search: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(["createdAt", "name", "status"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type GetWorkflowsFilterInput = z.input<typeof getWorkflowsFilterSchema>;

export const getExecutionsFilterSchema = z.object({
  workflowId: z.string().optional(),
  status: z.union([z.nativeEnum(WorkflowExecutionStatus), z.literal("ALL")]).optional().default("ALL"),
  search: z.string().optional(),
  page: z.number().int().min(1).optional().default(1),
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export type GetExecutionsFilterInput = z.input<typeof getExecutionsFilterSchema>;

// Pre-packaged Starter Templates
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  triggerType: WorkflowTriggerType;
  conditionMatch: ConditionMatchGroup;
  conditions: Array<{ field: string; operator: ConditionOperator; value: string }>;
  actions: Array<{
    type: WorkflowActionType;
    config: Record<string, any>;
    failurePolicy?: ActionFailurePolicyType;
  }>;
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "tpl_assign_facebook_leads",
    name: "Assign Facebook Leads",
    description: "Automatically route new Facebook leads to sales team, log activity, and schedule follow-up task.",
    triggerType: WorkflowTriggerType.LEAD_CREATED,
    conditionMatch: ConditionMatchGroup.ALL,
    conditions: [
      {
        field: "lead.source",
        operator: ConditionOperator.EQUALS,
        value: "FACEBOOK",
      },
    ],
    actions: [
      {
        type: WorkflowActionType.UPDATE_LEAD_STATUS,
        config: { status: "NEW" },
        failurePolicy: ActionFailurePolicy.STOP_WORKFLOW,
      },
      {
        type: WorkflowActionType.CREATE_TASK,
        config: {
          taskTitle: "Call Facebook Lead: {{lead.name}}",
          taskDescription: "Inbound Facebook ad lead for {{lead.company}}. Verify requirement and budget.",
          taskPriority: "HIGH",
          dueDaysOffset: 1,
          assignToOwner: true,
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.SEND_NOTIFICATION,
        config: {
          title: "New Facebook Lead",
          message: "Lead {{lead.name}} from {{lead.company}} was received via Facebook Ads.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.ADD_TAG,
        config: { tag: "Facebook Ad" },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
    ],
  },
  {
    id: "tpl_followup_new_leads",
    name: "Follow Up New Inbound Leads",
    description: "Creates an urgent call task and audit entry for any new inbound lead.",
    triggerType: WorkflowTriggerType.LEAD_CREATED,
    conditionMatch: ConditionMatchGroup.ALL,
    conditions: [],
    actions: [
      {
        type: WorkflowActionType.CREATE_TASK,
        config: {
          taskTitle: "Initial Discovery Call: {{lead.name}}",
          taskDescription: "Conduct 15-min discovery call for {{lead.company}} inquiry.",
          taskPriority: "MEDIUM",
          dueDaysOffset: 1,
          assignToOwner: true,
        },
        failurePolicy: ActionFailurePolicy.STOP_WORKFLOW,
      },
      {
        type: WorkflowActionType.CREATE_ACTIVITY,
        config: {
          title: "Automated Follow-up Scheduled",
          description: "Discovery task created automatically by follow-up workflow.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
    ],
  },
  {
    id: "tpl_high_value_lead_alert",
    name: "High Value Lead VIP Alert",
    description: "Flags leads valued at ₹5L or more with VIP tag, urgent priority, and team notifications.",
    triggerType: WorkflowTriggerType.LEAD_CREATED,
    conditionMatch: ConditionMatchGroup.ALL,
    conditions: [
      {
        field: "lead.value",
        operator: ConditionOperator.GREATER_THAN_OR_EQUAL,
        value: "500000",
      },
    ],
    actions: [
      {
        type: WorkflowActionType.ADD_TAG,
        config: { tag: "VIP Enterprise" },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.SEND_NOTIFICATION,
        config: {
          title: "🚨 High Value Lead Alert",
          message: "VIP Opportunity: {{lead.name}} (₹{{lead.value}}) has entered the pipeline.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.CREATE_TASK,
        config: {
          taskTitle: "Executive Outreach: {{lead.name}}",
          taskDescription: "High value lead requires senior sales executive engagement within 2 hours.",
          taskPriority: "URGENT",
          dueDaysOffset: 0,
          assignToOwner: true,
        },
        failurePolicy: ActionFailurePolicy.STOP_WORKFLOW,
      },
    ],
  },
  {
    id: "tpl_deal_won_workflow",
    name: "Deal Won Celebration & Onboarding",
    description: "Notifies team and sets up client onboarding tasks when a deal is marked WON.",
    triggerType: WorkflowTriggerType.DEAL_WON,
    conditionMatch: ConditionMatchGroup.ALL,
    conditions: [],
    actions: [
      {
        type: WorkflowActionType.SEND_NOTIFICATION,
        config: {
          title: "🎉 Deal Won!",
          message: "Deal {{deal.name}} was marked WON with value ₹{{deal.value}}!",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.CREATE_ACTIVITY,
        config: {
          title: "Deal Closed Successfully",
          description: "Automated onboarding pipeline initiated for {{deal.name}}.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.CREATE_TASK,
        config: {
          taskTitle: "Client Onboarding: {{deal.name}}",
          taskDescription: "Prepare kickoff deck and welcome packet for won deal {{deal.name}}.",
          taskPriority: "HIGH",
          dueDaysOffset: 2,
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
    ],
  },
  {
    id: "tpl_invoice_payment_notification",
    name: "Invoice Payment Notification",
    description: "Broadcasts payment confirmation when an invoice status transitions to PAID.",
    triggerType: WorkflowTriggerType.INVOICE_PAID,
    conditionMatch: ConditionMatchGroup.ALL,
    conditions: [],
    actions: [
      {
        type: WorkflowActionType.SEND_NOTIFICATION,
        config: {
          title: "💰 Invoice Paid",
          message: "Invoice {{invoice.number}} (₹{{invoice.total}}) has been paid in full.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.CREATE_ACTIVITY,
        config: {
          title: "Payment Receipt Confirmed",
          description: "Full settlement received for invoice {{invoice.number}}.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
    ],
  },
  {
    id: "tpl_overdue_invoice_alert",
    name: "Overdue Invoice Escalation",
    description: "Creates collection tasks and flags alerts when an invoice becomes overdue.",
    triggerType: WorkflowTriggerType.INVOICE_OVERDUE,
    conditionMatch: ConditionMatchGroup.ALL,
    conditions: [],
    actions: [
      {
        type: WorkflowActionType.SEND_NOTIFICATION,
        config: {
          title: "⚠️ Overdue Invoice Alert",
          message: "Invoice {{invoice.number}} (₹{{invoice.total}}) is past its due date.",
        },
        failurePolicy: ActionFailurePolicy.CONTINUE,
      },
      {
        type: WorkflowActionType.CREATE_TASK,
        config: {
          taskTitle: "Collections Follow-up: {{invoice.number}}",
          taskDescription: "Follow up with client regarding unpaid invoice {{invoice.number}}.",
          taskPriority: "HIGH",
          dueDaysOffset: 1,
        },
        failurePolicy: ActionFailurePolicy.STOP_WORKFLOW,
      },
    ],
  },
];
