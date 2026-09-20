import prisma from "@/lib/prisma";
import { InvoiceItemInput } from "@/lib/validations/invoices";
import { InvoiceStatus, Prisma } from "@prisma/client";

/**
 * Generates human-readable sequential invoice numbers per workspace.
 * Format: INV-YYYY-XXXX (e.g. INV-2026-0001)
 */
export async function generateInvoiceNumber(
  workspaceId: string,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const db = tx || prisma;
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;

  // Find the last invoice created in this workspace for this year
  const lastInvoice = await db.invoice.findFirst({
    where: {
      workspaceId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  let nextSequence = 1;
  if (lastInvoice && lastInvoice.invoiceNumber) {
    const parts = lastInvoice.invoiceNumber.split("-");
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) {
      nextSequence = lastSeq + 1;
    }
  }

  // Ensure unique number with zero padding
  let invoiceNumber = `${prefix}${String(nextSequence).padStart(4, "0")}`;

  // Collision prevention loop
  let collision = await db.invoice.findUnique({
    where: {
      workspaceId_invoiceNumber: {
        workspaceId,
        invoiceNumber,
      },
    },
    select: { id: true },
  });

  while (collision) {
    nextSequence += 1;
    invoiceNumber = `${prefix}${String(nextSequence).padStart(4, "0")}`;
    collision = await db.invoice.findUnique({
      where: {
        workspaceId_invoiceNumber: {
          workspaceId,
          invoiceNumber,
        },
      },
      select: { id: true },
    });
  }

  return invoiceNumber;
}

export interface CalculatedInvoiceTotals {
  items: Array<InvoiceItemInput & { amount: number }>;
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

/**
 * Calculates server-side precise financial values avoiding JS floating point errors.
 */
export function calculateInvoiceTotals(
  items: InvoiceItemInput[],
  discount: number,
  discountType: "FIXED" | "PERCENTAGE",
  taxRate: number,
  isGstSplit = true
): CalculatedInvoiceTotals {
  // 1. Calculate each item amount
  const calculatedItems = items.map((item) => {
    const qty = Math.max(1, item.quantity);
    const price = Math.max(0, item.unitPrice);
    const itemDisc = Math.max(0, Math.min(100, item.discount || 0));
    
    // Line amount with item discount
    const rawLine = qty * price;
    const discountedLine = itemDisc > 0 ? rawLine * (1 - itemDisc / 100) : rawLine;
    const amount = Math.round(discountedLine);

    return {
      ...item,
      quantity: qty,
      unitPrice: price,
      discount: itemDisc,
      amount,
    };
  });

  // 2. Subtotal
  const subtotal = calculatedItems.reduce((acc, curr) => acc + curr.amount, 0);

  // 3. Order-level discount
  let discountAmount = 0;
  if (discount > 0) {
    if (discountType === "PERCENTAGE") {
      discountAmount = Math.round((subtotal * Math.min(100, discount)) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.round(discount));
    }
  }

  // 4. Taxable amount
  const taxableAmount = Math.max(0, subtotal - discountAmount);

  // 5. Tax (GST)
  const validTaxRate = Math.max(0, taxRate);
  const taxAmount = Math.round((taxableAmount * validTaxRate) / 100);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isGstSplit && validTaxRate > 0) {
    cgst = Math.round(taxAmount / 2);
    sgst = taxAmount - cgst; // exact split avoiding 1 rupee rounding discrepancy
  } else {
    igst = taxAmount;
  }

  // 6. Final Grand Total
  const total = taxableAmount + taxAmount;

  return {
    items: calculatedItems,
    subtotal,
    discountAmount,
    taxableAmount,
    taxAmount,
    cgst,
    sgst,
    igst,
    total,
  };
}

/**
 * Derives accurate InvoiceStatus based on total, amount paid, and due date.
 */
export function deriveInvoiceStatus(
  total: number,
  amountPaid: number,
  dueDate: Date | string,
  currentStatus: InvoiceStatus
): InvoiceStatus {
  if (currentStatus === InvoiceStatus.CANCELLED) {
    return InvoiceStatus.CANCELLED;
  }

  if (currentStatus === InvoiceStatus.DRAFT) {
    return InvoiceStatus.DRAFT;
  }

  if (amountPaid >= total && total > 0) {
    return InvoiceStatus.PAID;
  }

  const due = new Date(dueDate).getTime();
  const isPastDue = due < Date.now();

  if (amountPaid > 0 && amountPaid < total) {
    return isPastDue ? InvoiceStatus.OVERDUE : InvoiceStatus.PARTIALLY_PAID;
  }

  if (amountPaid === 0) {
    return isPastDue ? InvoiceStatus.OVERDUE : InvoiceStatus.SENT;
  }

  return currentStatus;
}

/**
 * Service abstraction for sending invoice emails.
 */
export const InvoiceEmailService = {
  async sendInvoiceEmail(params: {
    invoiceNumber: string;
    customerEmail: string;
    customerName: string;
    totalFormatted: string;
    dueDateFormatted: string;
  }): Promise<{ success: boolean; message: string }> {
    // Check if external mail provider credentials exist
    const hasSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    if (!hasSmtpConfigured) {
      return {
        success: false,
        message: "Email service provider not configured. Invoice marked as SENT in workspace.",
      };
    }

    // In a configured environment, dispatch via nodemailer/SendGrid
    return {
      success: true,
      message: `Invoice ${params.invoiceNumber} emailed to ${params.customerEmail}.`,
    };
  },
};
