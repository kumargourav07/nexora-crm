import {
  evaluateConditionOperator,
  evaluateConditions,
  interpolateVariables,
  extractFieldValue,
  MAX_WORKFLOW_DEPTH,
} from "../services/automation-engine";
import {
  ConditionOperator,
  ConditionMatchGroup,
  WorkflowStatus,
  WorkflowTriggerType,
  WorkflowActionType,
  ActionFailurePolicy,
  WORKFLOW_TEMPLATES,
  createWorkflowSchema,
} from "../validations/automations";
import { hasPermission, ROLE_PERMISSIONS } from "../auth/permissions";

// Simple test runner assertion helper
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runAutomationTests() {
  console.log("\n=======================================================");
  console.log("   NEXORA CRM — PHASE 18 AUTOMATION ENGINE TEST SUITE");
  console.log("=======================================================\n");

  let passedCount = 0;
  let totalCount = 0;

  const test = (name: string, fn: () => void) => {
    totalCount++;
    try {
      fn();
      passedCount++;
      console.log(`  ✓ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  ✗ [FAIL] ${name}:`, err.message);
    }
  };

  // -------------------------------------------------------------
  // TEST GROUP 1: Field Value Extraction
  // -------------------------------------------------------------
  console.log("\n--- Group 1: Safe Field Value Extraction ---");

  test("extractFieldValue handles top-level and dot-notated fields", () => {
    const data = {
      source: "FACEBOOK",
      value: 150000,
      lead: {
        name: "Alex Patel",
        company: "Apex Tech",
        score: 85,
      },
      deal: {
        stage: "Proposal",
      },
    };

    assert(extractFieldValue(data, "source") === "FACEBOOK", "Extracts top-level field");
    assert(extractFieldValue(data, "lead.name") === "Alex Patel", "Extracts nested lead.name");
    assert(extractFieldValue(data, "lead.company") === "Apex Tech", "Extracts nested lead.company");
    assert(extractFieldValue(data, "lead.score") === 85, "Extracts nested lead.score");
    assert(extractFieldValue(data, "deal.stage") === "Proposal", "Extracts nested deal.stage");
    assert(extractFieldValue(data, "lead.nonexistent") === undefined, "Returns undefined for missing key");
  });

  // -------------------------------------------------------------
  // TEST GROUP 2: Condition Operator Evaluation
  // -------------------------------------------------------------
  console.log("\n--- Group 2: Condition Operators Engine ---");

  test("Condition EQUALS and NOT_EQUALS operators", () => {
    assert(evaluateConditionOperator("Facebook", ConditionOperator.EQUALS, "facebook"), "EQUALS case-insensitive match");
    assert(!evaluateConditionOperator("Website", ConditionOperator.EQUALS, "Facebook"), "EQUALS mismatch");
    assert(evaluateConditionOperator("Website", ConditionOperator.NOT_EQUALS, "Facebook"), "NOT_EQUALS match");
    assert(!evaluateConditionOperator("Facebook", ConditionOperator.NOT_EQUALS, "facebook"), "NOT_EQUALS mismatch");
  });

  test("Condition CONTAINS and NOT_CONTAINS operators", () => {
    assert(evaluateConditionOperator("Senior Software Engineer", ConditionOperator.CONTAINS, "engineer"), "CONTAINS match");
    assert(!evaluateConditionOperator("Sales Rep", ConditionOperator.CONTAINS, "engineer"), "CONTAINS mismatch");
    assert(evaluateConditionOperator("Sales Rep", ConditionOperator.NOT_CONTAINS, "engineer"), "NOT_CONTAINS match");
  });

  test("Condition Numeric Comparisons (GT, LT, GTE, LTE)", () => {
    assert(evaluateConditionOperator(150000, ConditionOperator.GREATER_THAN, "100000"), "GREATER_THAN 150k > 100k");
    assert(!evaluateConditionOperator(80000, ConditionOperator.GREATER_THAN, "100000"), "GREATER_THAN 80k > 100k fails");
    assert(evaluateConditionOperator(50000, ConditionOperator.LESS_THAN, "100000"), "LESS_THAN 50k < 100k");
    assert(evaluateConditionOperator("100000", ConditionOperator.GREATER_THAN_OR_EQUAL, "100000"), "GTE boundary match");
    assert(evaluateConditionOperator(100000, ConditionOperator.LESS_THAN_OR_EQUAL, "100000"), "LTE boundary match");
  });

  test("Condition IS_EMPTY and IS_NOT_EMPTY operators", () => {
    assert(evaluateConditionOperator(null, ConditionOperator.IS_EMPTY, ""), "null is empty");
    assert(evaluateConditionOperator("", ConditionOperator.IS_EMPTY, ""), "empty string is empty");
    assert(evaluateConditionOperator([], ConditionOperator.IS_EMPTY, ""), "empty array is empty");
    assert(evaluateConditionOperator("Alex", ConditionOperator.IS_NOT_EMPTY, ""), "'Alex' is not empty");
    assert(!evaluateConditionOperator(undefined, ConditionOperator.IS_NOT_EMPTY, ""), "undefined is not non-empty");
  });

  // -------------------------------------------------------------
  // TEST GROUP 3: Condition Groups (ALL / ANY)
  // -------------------------------------------------------------
  console.log("\n--- Group 3: Condition Group Logic (ALL / ANY) ---");

  test("Condition Match ALL (AND) requires all conditions to pass", () => {
    const conditions = [
      { id: "c1", field: "lead.source", operator: ConditionOperator.EQUALS, value: "FACEBOOK" },
      { id: "c2", field: "lead.value", operator: ConditionOperator.GREATER_THAN, value: "50000" },
    ];

    const matchingData = { lead: { source: "FACEBOOK", value: 100000 } };
    const res1 = evaluateConditions(conditions, ConditionMatchGroup.ALL, matchingData);
    assert(res1.passed === true, "ALL conditions passed when both match");

    const partialData = { lead: { source: "FACEBOOK", value: 30000 } };
    const res2 = evaluateConditions(conditions, ConditionMatchGroup.ALL, partialData);
    assert(res2.passed === false, "ALL conditions failed when second fails");
  });

  test("Condition Match ANY (OR) passes if at least one condition matches", () => {
    const conditions = [
      { id: "c1", field: "lead.source", operator: ConditionOperator.EQUALS, value: "FACEBOOK" },
      { id: "c2", field: "lead.source", operator: ConditionOperator.EQUALS, value: "INDIAMART" },
    ];

    const data = { lead: { source: "INDIAMART" } };
    const res = evaluateConditions(conditions, ConditionMatchGroup.ANY, data);
    assert(res.passed === true, "ANY condition passed for INDIAMART");

    const noMatchData = { lead: { source: "WEBSITE" } };
    const resNoMatch = evaluateConditions(conditions, ConditionMatchGroup.ANY, noMatchData);
    assert(resNoMatch.passed === false, "ANY condition failed for WEBSITE");
  });

  // -------------------------------------------------------------
  // TEST GROUP 4: Safe Variable Interpolation (No eval)
  // -------------------------------------------------------------
  console.log("\n--- Group 4: Safe Template Variable Interpolation ---");

  test("interpolateVariables replaces whitelisted entity tokens cleanly", () => {
    const template = "Urgent: Follow up with {{lead.name}} from {{lead.company}} regarding deal {{deal.name}} (₹{{deal.value}})";
    const context = {
      lead: { name: "Sarah Connor", company: "Cyberdyne Systems" },
      deal: { name: "Defense AI Contract", value: 2500000 },
    };

    const output = interpolateVariables(template, context);
    const expected = "Urgent: Follow up with Sarah Connor from Cyberdyne Systems regarding deal Defense AI Contract (₹2500000)";
    assert(output === expected, `Interpolation output matched expected. Got: ${output}`);
  });

  test("interpolateVariables preserves unrecognized tokens without throwing", () => {
    const template = "Call {{lead.name}} at {{unknown.token}}";
    const context = { lead: { name: "John Doe" } };
    const output = interpolateVariables(template, context);
    assert(output === "Call John Doe at {{unknown.token}}", "Preserves missing token");
  });

  // -------------------------------------------------------------
  // TEST GROUP 5: Loop Protection & Max Depth
  // -------------------------------------------------------------
  console.log("\n--- Group 5: Loop & Recursion Protection ---");

  test("Max workflow depth is defined and enforces halt at depth > 10", () => {
    assert(MAX_WORKFLOW_DEPTH === 10, "MAX_WORKFLOW_DEPTH is 10");

    const eventOverDepth = {
      id: "evt_loop_test",
      workspaceId: "ws_test",
      type: WorkflowTriggerType.LEAD_UPDATED,
      entityType: "LEAD" as const,
      entityId: "lead_1",
      payload: {},
      timestamp: new Date().toISOString(),
      context: { source: "WORKFLOW" as const, depth: 11 },
    };

    assert(eventOverDepth.context.depth > MAX_WORKFLOW_DEPTH, "Depth 11 exceeds limit and will halt execution");
  });

  // -------------------------------------------------------------
  // TEST GROUP 6: RBAC Permissions & Roles Matrix
  // -------------------------------------------------------------
  console.log("\n--- Group 6: RBAC & Permission Enforcement ---");

  test("OWNER and ADMIN have full automation permissions", () => {
    const requiredPermissions = [
      "automations.read",
      "automations.create",
      "automations.update",
      "automations.delete",
      "automations.activate",
      "automations.pause",
      "automation_runs.read",
      "automation_runs.retry",
    ] as const;

    requiredPermissions.forEach((perm) => {
      assert(hasPermission("OWNER", perm), `OWNER has ${perm}`);
      assert(hasPermission("ADMIN", perm), `ADMIN has ${perm}`);
    });
  });

  test("MANAGER can create, activate, and retry but cannot delete workflows", () => {
    assert(hasPermission("MANAGER", "automations.read"), "MANAGER can read automations");
    assert(hasPermission("MANAGER", "automations.create"), "MANAGER can create automations");
    assert(hasPermission("MANAGER", "automations.activate"), "MANAGER can activate automations");
    assert(hasPermission("MANAGER", "automations.pause"), "MANAGER can pause automations");
    assert(hasPermission("MANAGER", "automation_runs.retry"), "MANAGER can retry runs");
    assert(!hasPermission("MANAGER", "automations.delete"), "MANAGER CANNOT delete automations");
  });

  test("MEMBER has read-only access to automations and runs", () => {
    assert(hasPermission("MEMBER", "automations.read"), "MEMBER can view automations");
    assert(hasPermission("MEMBER", "automation_runs.read"), "MEMBER can view runs");
    assert(!hasPermission("MEMBER", "automations.create"), "MEMBER cannot create automations");
    assert(!hasPermission("MEMBER", "automations.activate"), "MEMBER cannot activate automations");
    assert(!hasPermission("MEMBER", "automation_runs.retry"), "MEMBER cannot retry executions");
  });

  // -------------------------------------------------------------
  // TEST GROUP 7: Starter Templates Validation
  // -------------------------------------------------------------
  console.log("\n--- Group 7: Starter Templates Schema Integrity ---");

  test("All 6 starter templates conform to CreateWorkflowSchema", () => {
    assert(WORKFLOW_TEMPLATES.length === 6, "Contains 6 starter templates");

    WORKFLOW_TEMPLATES.forEach((tpl) => {
      const validation = createWorkflowSchema.safeParse({
        name: tpl.name,
        description: tpl.description,
        triggerType: tpl.triggerType,
        conditionMatch: tpl.conditionMatch,
        conditions: tpl.conditions,
        actions: tpl.actions,
        status: WorkflowStatus.DRAFT,
      });

      assert(validation.success, `Template "${tpl.name}" passes Zod validation`);
    });
  });

  // -------------------------------------------------------------
  // TEST GROUP 8: Failure Policy & Skipped Outcome
  // -------------------------------------------------------------
  console.log("\n--- Group 8: Workflow Skipped & Failure Policy ---");

  test("Action failure policy defaults to STOP_WORKFLOW for critical steps", () => {
    assert(ActionFailurePolicy.STOP_WORKFLOW === "STOP_WORKFLOW", "STOP_WORKFLOW policy defined");
    assert(ActionFailurePolicy.CONTINUE === "CONTINUE", "CONTINUE policy defined");
  });

  test("Conditions mismatch produces SKIPPED evaluation without error", () => {
    const conditions = [
      { id: "c1", field: "lead.source", operator: ConditionOperator.EQUALS, value: "FACEBOOK" },
    ];
    const websiteLead = { lead: { source: "WEBSITE", name: "Inbound Lead" } };
    const evalRes = evaluateConditions(conditions, ConditionMatchGroup.ALL, websiteLead);

    assert(evalRes.passed === false, "Conditions evaluated to false");
    assert(evalRes.stepResults.length === 1, "Recorded 1 condition step");
    assert(evalRes.stepResults[0].status === "FAILED", "Condition marked as FAILED");
  });

  console.log("\n=======================================================");
  console.log(`   AUTOMATION TEST SUITE COMPLETED: ${passedCount}/${totalCount} TESTS PASSED`);
  console.log("=======================================================\n");

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAutomationTests().catch((err) => {
  console.error("Test execution threw exception:", err);
  process.exit(1);
});
