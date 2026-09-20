import { z } from "zod";
import { LeadSource, DealStatus, TaskPriority } from "@prisma/client";

export const LOST_REASONS = [
  "PRICE",
  "COMPETITOR",
  "NO_BUDGET",
  "NOT_INTERESTED",
  "TIMING",
  "NO_RESPONSE",
  "FEATURE_GAP",
  "OTHER",
] as const;

export const LOST_REASON_LABELS: Record<string, string> = {
  PRICE: "Price / Too Expensive",
  COMPETITOR: "Went with Competitor",
  NO_BUDGET: "No Budget / Financing Issue",
  NOT_INTERESTED: "Not Interested / No Need",
  TIMING: "Bad Timing / Postponed",
  NO_RESPONSE: "No Response / Ghosted",
  FEATURE_GAP: "Missing Required Features",
  OTHER: "Other Reason",
};

export type LostReasonType = (typeof LOST_REASONS)[number];

export const DEFAULT_PIPELINE_STAGES = [
  { name: "New", order: 0, probability: 10, color: "#3B82F6", isWon: false, isLost: false },
  { name: "Qualified", order: 1, probability: 25, color: "#6366F1", isWon: false, isLost: false },
  { name: "Proposal", order: 2, probability: 50, color: "#8B5CF6", isWon: false, isLost: false },
  { name: "Negotiation", order: 3, probability: 75, color: "#F59E0B", isWon: false, isLost: false },
  { name: "Won", order: 4, probability: 100, color: "#10B981", isWon: true, isLost: false },
  { name: "Lost", order: 5, probability: 0, color: "#EF4444", isWon: false, isLost: true },
];

// ==========================================
// CONTACT VALIDATIONS
// ==========================================

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(60),
  lastName: z.string().trim().max(60).optional().nullable(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .nullable()
    .or(z.literal("")),
  jobTitle: z.string().trim().max(100).optional().nullable(),
  companyId: z.string().cuid().optional().nullable().or(z.literal("")),
  ownerId: z.string().cuid().optional().nullable().or(z.literal("")),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

// ==========================================
// COMPANY VALIDATIONS
// ==========================================

export const createCompanySchema = z.object({
  name: z.string().trim().min(1, "Company name is required").max(100),
  website: z.string().trim().max(200).optional().nullable().or(z.literal("")),
  industry: z.string().trim().max(100).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(30).optional().nullable().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().trim().max(255).optional().nullable().or(z.literal("")),
  ownerId: z.string().cuid().optional().nullable().or(z.literal("")),
});

export const updateCompanySchema = createCompanySchema.partial();

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;

// ==========================================
// PIPELINE & STAGE VALIDATIONS
// ==========================================

export const createPipelineSchema = z.object({
  name: z.string().trim().min(1, "Pipeline name is required").max(100),
  isDefault: z.boolean().default(false),
});

export const updatePipelineSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1, "Pipeline name is required").max(100),
  isDefault: z.boolean().optional(),
});

export const createStageSchema = z.object({
  pipelineId: z.string().cuid(),
  name: z.string().trim().min(1, "Stage name is required").max(100),
  order: z.number().int().min(0),
  probability: z.coerce.number().int().min(0).max(100).default(10),
  color: z.string().optional().nullable(),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

export const updateStageSchema = z.object({
  id: z.string().cuid(),
  name: z.string().trim().min(1, "Stage name is required").max(100),
  probability: z.coerce.number().int().min(0).max(100),
  color: z.string().optional().nullable(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

export const reorderStagesSchema = z.object({
  pipelineId: z.string().cuid(),
  stageIds: z.array(z.string().cuid()).min(1),
});

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type CreateStageInput = z.infer<typeof createStageSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type ReorderStagesInput = z.infer<typeof reorderStagesSchema>;

// ==========================================
// DEAL VALIDATIONS
// ==========================================

export const createDealSchema = z.object({
  name: z.string().trim().min(1, "Deal name is required").max(120),
  contactId: z.string().cuid().optional().nullable().or(z.literal("")),
  companyId: z.string().cuid().optional().nullable().or(z.literal("")),
  ownerId: z.string().cuid().optional().nullable().or(z.literal("")),
  ownerName: z.string().trim().max(100).optional(),
  pipelineId: z.string().cuid({ message: "Valid pipeline is required" }),
  stageId: z.string().cuid({ message: "Valid stage is required" }),
  value: z.coerce.number().min(0, "Deal value must be non-negative").default(0),
  currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
  probability: z.coerce.number().int().min(0).max(100).default(10),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  expectedCloseDate: z
    .string()
    .optional()
    .nullable()
    .or(z.literal("")),
  source: z.nativeEnum(LeadSource).default(LeadSource.WEBSITE),
  description: z.string().trim().max(1000).optional().nullable().or(z.literal("")),
});

export const updateDealSchema = createDealSchema.partial().extend({
  id: z.string().cuid().optional(),
});

export const updateDealStageSchema = z.object({
  dealId: z.string().cuid(),
  stageId: z.string().cuid(),
});

export const markDealWonSchema = z.object({
  dealId: z.string().cuid(),
  wonAt: z.string().optional().nullable(),
});

export const markDealLostSchema = z.object({
  dealId: z.string().cuid(),
  lostReason: z.string().trim().min(1, "Lost reason is required"),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const reopenDealSchema = z.object({
  dealId: z.string().cuid(),
  stageId: z.string().cuid().optional(),
});

export const assignDealSchema = z.object({
  dealId: z.string().cuid(),
  ownerId: z.string().cuid(),
});

export const bulkUpdateDealsSchema = z.object({
  dealIds: z.array(z.string().cuid()).min(1, "Select at least one deal"),
  action: z.enum(["MOVE_STAGE", "ASSIGN_OWNER", "UPDATE_PRIORITY", "DELETE"]),
  stageId: z.string().cuid().optional(),
  ownerId: z.string().cuid().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>;
export type MarkDealWonInput = z.infer<typeof markDealWonSchema>;
export type MarkDealLostInput = z.infer<typeof markDealLostSchema>;
export type ReopenDealInput = z.infer<typeof reopenDealSchema>;
export type AssignDealInput = z.infer<typeof assignDealSchema>;
export type BulkUpdateDealsInput = z.infer<typeof bulkUpdateDealsSchema>;

// ==========================================
// LEAD CONVERSION VALIDATIONS
// ==========================================

export const convertLeadSchema = z.object({
  leadId: z.string().cuid(),
  createContact: z.boolean().default(true),
  useExistingContactId: z.string().cuid().optional().nullable(),
  contactData: z
    .object({
      firstName: z.string().trim().min(1, "First name is required").max(60),
      lastName: z.string().trim().max(60).optional().nullable(),
      email: z.string().trim().email().optional().nullable().or(z.literal("")),
      phone: z.string().trim().max(30).optional().nullable().or(z.literal("")),
      jobTitle: z.string().trim().max(100).optional().nullable(),
    })
    .optional(),
  createCompany: z.boolean().default(true),
  useExistingCompanyId: z.string().cuid().optional().nullable(),
  companyData: z
    .object({
      name: z.string().trim().min(1, "Company name is required").max(100),
      website: z.string().trim().max(200).optional().nullable().or(z.literal("")),
      industry: z.string().trim().max(100).optional().nullable().or(z.literal("")),
      phone: z.string().trim().max(30).optional().nullable().or(z.literal("")),
      email: z.string().trim().email().optional().nullable().or(z.literal("")),
      address: z.string().trim().max(255).optional().nullable().or(z.literal("")),
    })
    .optional(),
  createDeal: z.boolean().default(true),
  dealData: z
    .object({
      name: z.string().trim().min(1, "Deal name is required").max(120),
      pipelineId: z.string().cuid(),
      stageId: z.string().cuid(),
      value: z.coerce.number().min(0).default(0),
      currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
      probability: z.coerce.number().int().min(0).max(100).optional(),
      priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
      expectedCloseDate: z.string().optional().nullable(),
      description: z.string().trim().max(1000).optional().nullable(),
    })
    .optional(),
});

export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
