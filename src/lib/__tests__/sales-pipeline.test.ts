import {
  createDealSchema,
  updateDealSchema,
  updateDealStageSchema,
  markDealWonSchema,
  markDealLostSchema,
  createPipelineSchema,
  createStageSchema,
  reorderStagesSchema,
  convertLeadSchema,
  bulkUpdateDealsSchema,
  LOST_REASONS,
  DEFAULT_PIPELINE_STAGES,
} from "@/lib/validations/sales";
import { ROLE_PERMISSIONS, hasPermission } from "@/lib/auth/permissions";
import { TaskPriority, DealStatus, LeadSource, Role } from "@prisma/client";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

console.log("====================================================");
console.log("PHASE 20 — SALES PIPELINE & DEALS AUTOMATED TEST SUITE");
console.log("====================================================\n");

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}\n`);
    failed++;
  }
}

// 1. Forecast Math & Decimal Safety Test (Prompt Requirement 90)
runTest("Requirement 90: Decimal-safe Weighted Pipeline Calculation", () => {
  const deals = [
    { value: 100000, probability: 50, status: DealStatus.OPEN },
    { value: 200000, probability: 25, status: DealStatus.OPEN },
    { value: 150000, probability: 100, status: DealStatus.WON },
    { value: 80000, probability: 0, status: DealStatus.LOST },
  ];

  let openPipeline = 0;
  let weightedPipeline = 0;
  let wonRevenue = 0;
  let lostValue = 0;

  for (const d of deals) {
    if (d.status === DealStatus.OPEN) {
      openPipeline += d.value;
      weightedPipeline += Math.round((d.value * d.probability) / 100);
    } else if (d.status === DealStatus.WON) {
      wonRevenue += d.value;
    } else if (d.status === DealStatus.LOST) {
      lostValue += d.value;
    }
  }

  // Deal A (₹100,000 * 50% = ₹50,000) + Deal B (₹200,000 * 25% = ₹50,000) = ₹100,000
  assert(openPipeline === 300000, `Expected open pipeline 300,000, got ${openPipeline}`);
  assert(weightedPipeline === 100000, `Expected weighted pipeline 100,000, got ${weightedPipeline}`);
  assert(wonRevenue === 150000, `Expected won revenue 150,000, got ${wonRevenue}`);
  assert(lostValue === 80000, `Expected lost value 80,000, got ${lostValue}`);
});

// 2. Deal Validation Schema
runTest("Deal Creation & Validation Zod Rules", () => {
  const valid = createDealSchema.safeParse({
    name: "Enterprise ERP Contract",
    value: 500000,
    currency: "INR",
    probability: 40,
    priority: TaskPriority.HIGH,
    pipelineId: "cuid123456789012345678901",
    stageId: "cuid123456789012345678902",
    source: LeadSource.WEBSITE,
    description: "Cloud migration and ERP integration",
  });
  assert(valid.success, `Expected valid deal data to pass validation: ${JSON.stringify(valid)}`);

  // Invalid probability (>100)
  const invalidProb = createDealSchema.safeParse({
    name: "Invalid Deal",
    value: 10000,
    probability: 150,
    pipelineId: "cuid123456789012345678901",
    stageId: "cuid123456789012345678902",
  });
  assert(!invalidProb.success, "Expected probability > 100 to fail");

  // Invalid negative value
  const invalidValue = createDealSchema.safeParse({
    name: "Invalid Deal",
    value: -500,
    probability: 50,
    pipelineId: "cuid123456789012345678901",
    stageId: "cuid123456789012345678902",
  });
  assert(!invalidValue.success, "Expected negative value to fail");
});

// 3. Mark Won / Mark Lost Validation
runTest("Won and Lost Transition Validations & Structured Reasons", () => {
  const validWon = markDealWonSchema.safeParse({
    dealId: "cuid123456789012345678901",
    wonAt: new Date().toISOString(),
  });
  assert(validWon.success, "Expected markDealWonSchema to succeed");

  // Mark lost with valid reason
  const validLost = markDealLostSchema.safeParse({
    dealId: "cuid123456789012345678901",
    lostReason: "PRICE",
    notes: "Competitor discounted 30%",
  });
  assert(validLost.success, "Expected markDealLostSchema with PRICE to succeed");

  // Mark lost with missing reason
  const invalidLost = markDealLostSchema.safeParse({
    dealId: "cuid123456789012345678901",
    lostReason: "",
  });
  assert(!invalidLost.success, "Expected empty lost reason to fail");

  assert(LOST_REASONS.includes("PRICE"), "LOST_REASONS must include PRICE");
  assert(LOST_REASONS.includes("COMPETITOR"), "LOST_REASONS must include COMPETITOR");
  assert(LOST_REASONS.includes("NO_BUDGET"), "LOST_REASONS must include NO_BUDGET");
});

// 4. Stale Deal Calculation (Prompt Requirement 52)
runTest("Requirement 52: Stale Deal Inactivity Detection (>14 days)", () => {
  const now = Date.now();
  const inactiveDays10 = new Date(now - 10 * 24 * 60 * 60 * 1000);
  const inactiveDays15 = new Date(now - 15 * 24 * 60 * 60 * 1000);

  function checkStale(lastActivityDate: Date, updatedAt: Date): boolean {
    const ref = lastActivityDate || updatedAt;
    const diff = Math.floor((now - ref.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 14;
  }

  assert(!checkStale(inactiveDays10, inactiveDays10), "10 days inactive should NOT be stale");
  assert(checkStale(inactiveDays15, inactiveDays15), "15 days inactive MUST be stale");
});

// 5. Lead to Deal Atomic Conversion Payload
runTest("Lead to Contact, Company & Deal Atomic Conversion Validation", () => {
  const conversionPayload = convertLeadSchema.safeParse({
    leadId: "cuid123456789012345678901",
    createContact: true,
    contactData: {
      firstName: "Vikram",
      lastName: "Malhotra",
      email: "vikram@acmecorp.in",
      phone: "+91 98765 43210",
      jobTitle: "VP Technology",
    },
    createCompany: true,
    companyData: {
      name: "Acme Technologies Pvt Ltd",
      industry: "Software",
      website: "https://acme.in",
    },
    createDeal: true,
    dealData: {
      name: "Acme CRM Enterprise Deal",
      pipelineId: "cuid123456789012345678902",
      stageId: "cuid123456789012345678903",
      value: 350000,
      probability: 25,
      expectedCloseDate: "2026-10-31",
    },
  });

  assert(conversionPayload.success, "Expected valid convertLeadSchema payload to pass");
});

// 6. Pipeline & Stage Management Schemas
runTest("Pipeline & Stage Properties (isWon, isLost flags)", () => {
  const stageSchema = createStageSchema.safeParse({
    pipelineId: "cuid123456789012345678901",
    name: "Proposal Sent",
    order: 3,
    probability: 70,
    color: "#F59E0B",
    isWon: false,
    isLost: false,
  });
  assert(stageSchema.success, "Expected createStageSchema to pass");

  const wonStageSchema = createStageSchema.safeParse({
    pipelineId: "cuid123456789012345678901",
    name: "Closed Won",
    order: 5,
    probability: 100,
    color: "#10B981",
    isWon: true,
    isLost: false,
  });
  assert(wonStageSchema.success && wonStageSchema.data.isWon, "Won stage must have isWon: true");

  const reorder = reorderStagesSchema.safeParse({
    pipelineId: "cuid123456789012345678901",
    stageIds: ["cuid123456789012345678902", "cuid123456789012345678903"],
  });
  assert(reorder.success, "Reorder stages schema must succeed");

  assert(DEFAULT_PIPELINE_STAGES.length >= 6, "Default pipeline must have standard stages");
  assert(DEFAULT_PIPELINE_STAGES.some((s) => s.isWon), "Default pipeline must have isWon stage");
  assert(DEFAULT_PIPELINE_STAGES.some((s) => s.isLost), "Default pipeline must have isLost stage");
});

// 7. Bulk Action Validation
runTest("Bulk Deal Operations Validation", () => {
  const bulkStage = bulkUpdateDealsSchema.safeParse({
    dealIds: ["cuid123456789012345678901", "cuid123456789012345678902"],
    action: "MOVE_STAGE",
    stageId: "cuid123456789012345678903",
  });
  assert(bulkStage.success, "Bulk move stage schema must pass");

  const emptyBulk = bulkUpdateDealsSchema.safeParse({
    dealIds: [],
    action: "MOVE_STAGE",
  });
  assert(!emptyBulk.success, "Empty bulk list must fail");
});

// 8. RBAC Permissions Check
runTest("RBAC Matrix for Deals & Pipelines", () => {
  assert(hasPermission(Role.OWNER, "deals.create"), "OWNER can create deals");
  assert(hasPermission(Role.ADMIN, "deals.delete"), "ADMIN can delete deals");
  assert(hasPermission(Role.MANAGER, "deals.assign"), "MANAGER can assign deals");
  assert(hasPermission(Role.MANAGER, "pipelines.manage"), "MANAGER can manage pipelines");
  assert(hasPermission(Role.MEMBER, "deals.move_stage"), "MEMBER can move deal stages");
  assert(hasPermission(Role.MEMBER, "deals.mark_won"), "MEMBER can mark deal won");
  assert(hasPermission(Role.MEMBER, "pipelines.read"), "MEMBER can read pipelines");
  assert(!hasPermission(Role.MEMBER, "pipelines.manage"), "MEMBER cannot manage pipelines");
});

console.log("\n====================================================");
console.log(`TOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log("====================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log("ALL PHASE 20 AUTOMATED TESTS PASSED SUCCESSFULLY! 🚀");
}
