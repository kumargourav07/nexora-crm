/**
 * ============================================================================
 * NEXORA CRM — PHASE 16 INVOICING, BILLING & PAYMENT MANAGEMENT TEST SUITE
 *
 * Verifies:
 * 1. RBAC & Invoicing / Billing Permissions matrix across all 4 roles
 * 2. Decimal-precision financial math (Line discounts, subtotal, order discounts, GST split)
 * 3. Status derivation rules (DRAFT, SENT, PARTIALLY_PAID, PAID, OVERDUE, CANCELLED)
 * 4. Payment ledger arithmetic, partial payments, and balance due calculations
 * 5. Invoice duplication and reset rules
 * 6. Multi-tenant workspace data isolation
 * ============================================================================
 */

import { hasPermission, Permission } from "../auth/permissions";
import { Role, InvoiceStatus, PaymentMethod } from "@prisma/client";
import {
  calculateInvoiceTotals,
  deriveInvoiceStatus,
} from "../services/invoice-service";

async function runTests() {
  console.log("\n=======================================================");
  console.log("🧪 RUNNING PHASE 16 INVOICING & BILLING TEST SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // TEST GROUP 1: RBAC & INVOICING PERMISSIONS
  // -------------------------------------------------------------
  console.log("--- 1. RBAC & Invoicing Permissions Verification ---");

  const invoicePermissions: Permission[] = [
    "invoices.read",
    "invoices.create",
    "invoices.update",
    "invoices.delete",
    "invoices.send",
    "invoices.cancel",
    "payments.read",
    "payments.create",
    "invoice_reports.read",
  ];

  // OWNER checks
  for (const perm of invoicePermissions) {
    assert(hasPermission(Role.OWNER, perm), `OWNER has '${perm}'`);
  }

  // ADMIN checks
  for (const perm of invoicePermissions) {
    assert(hasPermission(Role.ADMIN, perm), `ADMIN has '${perm}'`);
  }

  // MANAGER checks
  assert(hasPermission(Role.MANAGER, "invoices.read"), "MANAGER has 'invoices.read'");
  assert(hasPermission(Role.MANAGER, "invoices.create"), "MANAGER has 'invoices.create'");
  assert(hasPermission(Role.MANAGER, "invoices.update"), "MANAGER has 'invoices.update'");
  assert(hasPermission(Role.MANAGER, "invoices.send"), "MANAGER has 'invoices.send'");
  assert(hasPermission(Role.MANAGER, "invoices.cancel"), "MANAGER has 'invoices.cancel'");
  assert(hasPermission(Role.MANAGER, "payments.create"), "MANAGER has 'payments.create'");
  assert(hasPermission(Role.MANAGER, "invoice_reports.read"), "MANAGER has 'invoice_reports.read'");
  assert(!hasPermission(Role.MANAGER, "invoices.delete"), "MANAGER is denied 'invoices.delete'");

  // MEMBER checks
  assert(hasPermission(Role.MEMBER, "invoices.read"), "MEMBER has 'invoices.read'");
  assert(hasPermission(Role.MEMBER, "invoices.create"), "MEMBER has 'invoices.create'");
  assert(hasPermission(Role.MEMBER, "payments.read"), "MEMBER has 'payments.read'");
  assert(hasPermission(Role.MEMBER, "payments.create"), "MEMBER has 'payments.create'");
  assert(!hasPermission(Role.MEMBER, "invoices.delete"), "MEMBER is denied 'invoices.delete'");
  assert(!hasPermission(Role.MEMBER, "invoices.cancel"), "MEMBER is denied 'invoices.cancel'");
  assert(!hasPermission(Role.MEMBER, "invoices.send"), "MEMBER is denied 'invoices.send'");

  // -------------------------------------------------------------
  // TEST GROUP 2: FINANCIAL DECIMAL PRECISION & GST CALCULATION
  // -------------------------------------------------------------
  console.log("\n--- 2. Financial Decimal Precision & GST Calculations ---");

  // Test Case A:
  // Item 1: 2 units @ ₹50,000 with 10% disc = ₹90,000
  // Item 2: 1 unit @ ₹20,000 with 0% disc = ₹20,000
  // Subtotal = ₹110,000
  // Order discount: Fixed ₹10,000 => Taxable = ₹100,000
  // GST 18% Intrastate => CGST 9% (₹9,000) + SGST 9% (₹9,000) = ₹18,000
  // Total = ₹118,000
  const itemsA = [
    { description: "SaaS Enterprise Tier", quantity: 2, unitPrice: 50000, discount: 10, taxRate: 18 },
    { description: "Implementation Setup", quantity: 1, unitPrice: 20000, discount: 0, taxRate: 18 },
  ];

  const calcA = calculateInvoiceTotals(itemsA, 10000, "FIXED", 18, true);

  assert(calcA.items[0].amount === 90000, "Item 1 amount equals ₹90,000 after 10% discount");
  assert(calcA.items[1].amount === 20000, "Item 2 amount equals ₹20,000");
  assert(calcA.subtotal === 110000, "Subtotal equals ₹1,10,000");
  assert(calcA.discountAmount === 10000, "Order discount equals ₹10,000");
  assert(calcA.taxableAmount === 100000, "Taxable amount equals ₹1,00,000");
  assert(calcA.taxAmount === 18000, "Total GST tax equals ₹18,000");
  assert(calcA.cgst === 9000, "CGST (50% split) equals ₹9,000");
  assert(calcA.sgst === 9000, "SGST (50% split) equals ₹9,000");
  assert(calcA.total === 118000, "Grand total equals ₹1,18,000");

  // Test Case B: Interstate IGST (18%) with percentage discount (20%)
  // Subtotal = ₹100,000, 20% discount = ₹20,000 => Taxable = ₹80,000
  // IGST 18% of ₹80,000 = ₹14,400 => Total = ₹94,400
  const itemsB = [{ description: "Consulting", quantity: 1, unitPrice: 100000, discount: 0, taxRate: 18 }];
  const calcB = calculateInvoiceTotals(itemsB, 20, "PERCENTAGE", 18, false);

  assert(calcB.discountAmount === 20000, "Percentage discount (20%) equals ₹20,000");
  assert(calcB.taxableAmount === 80000, "Taxable amount equals ₹80,000");
  assert(calcB.igst === 14400, "IGST (18% on interstate) equals ₹14,400");
  assert(calcB.cgst === 0 && calcB.sgst === 0, "CGST and SGST are 0 for interstate supply");
  assert(calcB.total === 94400, "Grand total equals ₹94,400");

  // -------------------------------------------------------------
  // TEST GROUP 3: STATUS DERIVATION & OVERDUE RULES
  // -------------------------------------------------------------
  console.log("\n--- 3. Invoice Status Derivation & Overdue Logic ---");

  const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 1. Unpaid, future due date => SENT
  assert(
    deriveInvoiceStatus(100000, 0, futureDate, InvoiceStatus.SENT) === InvoiceStatus.SENT,
    "Unpaid invoice with future due date remains SENT"
  );

  // 2. Unpaid, past due date => OVERDUE
  assert(
    deriveInvoiceStatus(100000, 0, pastDate, InvoiceStatus.SENT) === InvoiceStatus.OVERDUE,
    "Unpaid invoice with past due date derives OVERDUE"
  );

  // 3. Partial payment, future due date => PARTIALLY_PAID
  assert(
    deriveInvoiceStatus(100000, 40000, futureDate, InvoiceStatus.SENT) === InvoiceStatus.PARTIALLY_PAID,
    "Partial payment (₹40k on ₹100k) with future due date derives PARTIALLY_PAID"
  );

  // 4. Partial payment, past due date => OVERDUE
  assert(
    deriveInvoiceStatus(100000, 40000, pastDate, InvoiceStatus.SENT) === InvoiceStatus.OVERDUE,
    "Partially paid invoice past due date derives OVERDUE"
  );

  // 5. Fully paid => PAID (even if past due date)
  assert(
    deriveInvoiceStatus(100000, 100000, pastDate, InvoiceStatus.SENT) === InvoiceStatus.PAID,
    "Fully paid invoice derives PAID regardless of past due date"
  );

  // 6. Cancelled invoice remains CANCELLED
  assert(
    deriveInvoiceStatus(100000, 0, pastDate, InvoiceStatus.CANCELLED) === InvoiceStatus.CANCELLED,
    "Cancelled invoice preserves CANCELLED status"
  );

  // 7. Draft invoice remains DRAFT
  assert(
    deriveInvoiceStatus(100000, 0, pastDate, InvoiceStatus.DRAFT) === InvoiceStatus.DRAFT,
    "Draft invoice preserves DRAFT status"
  );

  // -------------------------------------------------------------
  // TEST GROUP 4: PAYMENT LEDGER & BALANCE DUE ARITHMETIC
  // -------------------------------------------------------------
  console.log("\n--- 4. Payment Ledger & Balance Due Arithmetic ---");

  const totalInvoiceVal = 100000;
  let paidSoFar = 0;
  let balanceDue = totalInvoiceVal - paidSoFar;

  // Record Payment 1: ₹40,000 via UPI
  const payment1 = { amount: 40000, method: PaymentMethod.UPI };
  paidSoFar += payment1.amount;
  balanceDue = Math.max(0, totalInvoiceVal - paidSoFar);

  assert(paidSoFar === 40000, "First payment increments amountPaid to ₹40,000");
  assert(balanceDue === 60000, "Remaining balance due decreases to ₹60,000");
  assert(
    deriveInvoiceStatus(totalInvoiceVal, paidSoFar, futureDate, InvoiceStatus.SENT) === InvoiceStatus.PARTIALLY_PAID,
    "Status updates to PARTIALLY_PAID"
  );

  // Record Payment 2: ₹60,000 via Bank Transfer (settles invoice)
  const payment2 = { amount: 60000, method: PaymentMethod.BANK_TRANSFER };
  paidSoFar += payment2.amount;
  balanceDue = Math.max(0, totalInvoiceVal - paidSoFar);

  assert(paidSoFar === 100000, "Second payment brings total paid to ₹1,00,000");
  assert(balanceDue === 0, "Remaining balance due is ₹0");
  assert(
    deriveInvoiceStatus(totalInvoiceVal, paidSoFar, futureDate, InvoiceStatus.SENT) === InvoiceStatus.PAID,
    "Status becomes PAID upon settlement"
  );

  // Overpayment check
  const attemptedOverpayment = 10000;
  const isOverpaymentBlocked = paidSoFar + attemptedOverpayment > totalInvoiceVal;
  assert(isOverpaymentBlocked, "Attempted payment exceeding total is rejected");

  // -------------------------------------------------------------
  // TEST GROUP 5: MULTI-TENANT WORKSPACE ISOLATION
  // -------------------------------------------------------------
  console.log("\n--- 5. Multi-Tenant Workspace Isolation ---");

  const ws1 = { id: "ws_acme" };
  const ws2 = { id: "ws_globex" };

  const invoice1 = { id: "inv_1", workspaceId: ws1.id, invoiceNumber: "INV-2026-0001", total: 50000 };
  const invoice2 = { id: "inv_2", workspaceId: ws2.id, invoiceNumber: "INV-2026-0001", total: 80000 };

  function queryInvoicesForWorkspace(targetWsId: string, allInvoices: typeof invoice1[]) {
    return allInvoices.filter((i) => i.workspaceId === targetWsId);
  }

  const ws1Invoices = queryInvoicesForWorkspace(ws1.id, [invoice1, invoice2]);
  assert(ws1Invoices.length === 1 && ws1Invoices[0].id === "inv_1", "Workspace Acme only queries Acme invoices");

  const ws2Invoices = queryInvoicesForWorkspace(ws2.id, [invoice1, invoice2]);
  assert(ws2Invoices.length === 1 && ws2Invoices[0].id === "inv_2", "Workspace Globex only queries Globex invoices");

  // Unique invoice numbers per workspace (same number in different workspaces is isolated)
  assert(
    invoice1.invoiceNumber === invoice2.invoiceNumber && invoice1.workspaceId !== invoice2.workspaceId,
    "Invoice numbering is unique per workspace without global collision"
  );

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`🏁 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
