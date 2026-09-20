import { z } from "zod";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

export const GST_TAX_RATES = [0, 5, 12, 18, 28] as const;

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().trim().min(1, "Description is required").max(500),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  taxRate: z.number().min(0).max(100).default(0),
  discount: z.number().min(0).default(0),
});

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>;

export const createInvoiceSchema = z
  .object({
    customerName: z.string().trim().min(1, "Customer name is required").max(255),
    customerCompany: z.string().trim().max(255).optional().nullable(),
    customerEmail: z.string().trim().email("Invalid customer email address"),
    customerPhone: z.string().trim().max(50).optional().nullable(),
    customerAddress: z.string().trim().max(1000).optional().nullable(),
    customerGst: z.string().trim().max(50).optional().nullable(),
    placeOfSupply: z.string().trim().max(100).optional().nullable(),
    contactId: z.string().optional().nullable(),
    companyId: z.string().optional().nullable(),
    dealId: z.string().optional().nullable(),
    ownerId: z.string().optional().nullable(),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    currency: z.string().default("INR"),
    discount: z.number().min(0, "Discount cannot be negative").default(0),
    discountType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    taxRate: z.number().min(0).max(100).default(18),
    isGstSplit: z.boolean().default(true),
    notes: z.string().max(2000).optional().nullable(),
    terms: z.string().max(2000).optional().nullable(),
    status: z.nativeEnum(InvoiceStatus).default(InvoiceStatus.DRAFT),
    items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
  })
  .refine(
    (data) => {
      const issue = new Date(data.issueDate);
      const due = new Date(data.dueDate);
      return due.getTime() >= issue.getTime();
    },
    {
      message: "Due date cannot be before issue date",
      path: ["dueDate"],
    }
  );

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceSchema = z
  .object({
    id: z.string().min(1, "Invoice ID is required"),
    customerName: z.string().trim().min(1, "Customer name is required").max(255),
    customerCompany: z.string().trim().max(255).optional().nullable(),
    customerEmail: z.string().trim().email("Invalid customer email address"),
    customerPhone: z.string().trim().max(50).optional().nullable(),
    customerAddress: z.string().trim().max(1000).optional().nullable(),
    customerGst: z.string().trim().max(50).optional().nullable(),
    placeOfSupply: z.string().trim().max(100).optional().nullable(),
    contactId: z.string().optional().nullable(),
    companyId: z.string().optional().nullable(),
    dealId: z.string().optional().nullable(),
    ownerId: z.string().optional().nullable(),
    issueDate: z.string().min(1, "Issue date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    currency: z.string().default("INR"),
    discount: z.number().min(0, "Discount cannot be negative").default(0),
    discountType: z.enum(["FIXED", "PERCENTAGE"]).default("FIXED"),
    taxRate: z.number().min(0).max(100).default(18),
    isGstSplit: z.boolean().default(true),
    notes: z.string().max(2000).optional().nullable(),
    terms: z.string().max(2000).optional().nullable(),
    items: z.array(invoiceItemSchema).min(1, "At least one line item is required"),
  })
  .refine(
    (data) => {
      const issue = new Date(data.issueDate);
      const due = new Date(data.dueDate);
      return due.getTime() >= issue.getTime();
    },
    {
      message: "Due date cannot be before issue date",
      path: ["dueDate"],
    }
  );

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;

export const recordPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.string().min(1, "Payment date is required"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.BANK_TRANSFER),
  reference: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const invoiceFilterSchema = z.object({
  search: z.string().optional(),
  status: z.union([z.nativeEnum(InvoiceStatus), z.literal("ALL")]).optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  ownerId: z.string().optional(),
  datePreset: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  sortBy: z.enum(["createdAt", "dueDate", "issueDate", "total", "invoiceNumber"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

export type InvoiceFilterParams = z.input<typeof invoiceFilterSchema>;
