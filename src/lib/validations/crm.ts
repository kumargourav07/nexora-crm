import { z } from "zod";
import {
  LeadStatus,
  LeadSource,
  Department,
  EmployeeStatus,
  AttendanceStatus,
  InvoiceStatus,
  IntegrationProvider,
  IntegrationStatus,
} from "@prisma/client";

// ==========================================
// 1. LEAD VALIDATIONS
// ==========================================

export const leadStatusEnum = z.nativeEnum(LeadStatus);
export const leadSourceEnum = z.nativeEnum(LeadSource);

export const createLeadSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  company: z.string().min(2, "Company name must be at least 2 characters").max(120),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number is required"),
  source: leadSourceEnum.default(LeadSource.WEBSITE),
  status: leadStatusEnum.default(LeadStatus.NEW),
  ownerName: z.string().optional(),
  value: z.number().nonnegative("Value cannot be negative").default(0),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const updateLeadStatusSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  status: leadStatusEnum,
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

// ==========================================
// 2. EMPLOYEE VALIDATIONS
// ==========================================

export const departmentEnum = z.nativeEnum(Department);
export const employeeStatusEnum = z.nativeEnum(EmployeeStatus);
export const attendanceStatusEnum = z.nativeEnum(AttendanceStatus);

export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number is required"),
  department: departmentEnum.default(Department.SALES),
  role: z.string().min(2, "Job role is required"),
  status: employeeStatusEnum.default(EmployeeStatus.ACTIVE),
  attendance: attendanceStatusEnum.default(AttendanceStatus.PRESENT),
  location: z.string().min(2, "Location is required"),
  leaveBalance: z.number().int().nonnegative().default(18),
  dealsClosed: z.number().int().nonnegative().default(0),
  revenueGenerated: z.number().nonnegative().default(0),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const updateAttendanceSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  attendance: attendanceStatusEnum,
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

// ==========================================
// 3. INVOICE VALIDATIONS
// ==========================================

export const invoiceStatusEnum = z.nativeEnum(InvoiceStatus);

export const invoiceItemSchema = z.object({
  description: z.string().min(2, "Description is required"),
  quantity: z.number().int().positive("Quantity must be at least 1"),
  unitPrice: z.number().nonnegative("Unit price cannot be negative"),
});

export const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(3, "Invoice number is required"),
  customerName: z.string().min(2, "Customer name is required"),
  customerCompany: z.string().optional(),
  customerEmail: z.string().email("Invalid customer email"),
  customerGst: z.string().optional(),
  status: invoiceStatusEnum.default(InvoiceStatus.DRAFT),
  dueDate: z.string().or(z.date()),
  paymentMethod: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export const updateInvoiceStatusSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  status: invoiceStatusEnum,
  paymentMethod: z.string().optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

// ==========================================
// 4. INTEGRATION VALIDATIONS
// ==========================================

export const integrationProviderEnum = z.nativeEnum(IntegrationProvider);
export const integrationStatusEnum = z.nativeEnum(IntegrationStatus);

export const toggleIntegrationSchema = z.object({
  provider: integrationProviderEnum,
  status: integrationStatusEnum,
});

export type ToggleIntegrationInput = z.infer<typeof toggleIntegrationSchema>;
