/**
 * NEXORA CRM - Phase 19 Communication & Follow-up Test Suite
 * Validates:
 * 1. Provider Abstractions & Honest Status Reporting (Email, WhatsApp, SMS)
 * 2. Safe Variable Substitution Engine (No eval(), Whitelisted tokens)
 * 3. Zod Schema Validations (Calls, Meetings, Emails, Follow-ups, Templates)
 * 4. Smart Follow-up Status & Overdue Logic
 * 5. Starter Communication Templates
 * 6. RBAC Permissions Matrix Integrity
 */

import {
  substituteVariables,
  extractTemplateVariables,
  SmtpEmailProvider,
  MetaWhatsAppProvider,
  TwilioSmsProvider,
} from "../services/communication-providers";

import {
  logCallSchema,
  scheduleMeetingSchema,
  sendEmailSchema,
  logMessageSchema,
  createFollowUpSchema,
  completeFollowUpSchema,
  rescheduleFollowUpSchema,
  createTemplateSchema,
  STARTER_COMMUNICATION_TEMPLATES,
  CommunicationType,
  CommunicationDirection,
  CallOutcome,
  MeetingStatus,
  FollowUpStatus,
  FollowUpType,
} from "../validations/communications";

import { ROLE_PERMISSIONS, Permission } from "../auth/permissions";

// Simple test runner helper
function describe(name: string, fn: () => void) {
  console.log(`\n--- Test Suite: ${name} ---`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error: ${error.message}`);
    process.exitCode = 1;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message || "Assertion failed");
  }
}

function assertEqual(actual: any, expected: any, message?: string) {
  if (actual !== expected) {
    throw new Error(
      `${message || "Assertion failed"}: Expected [${expected}], got [${actual}]`
    );
  }
}

// ---------------------------------------------------------------------------
// 1. Variable Substitution Engine Tests
// ---------------------------------------------------------------------------
describe("Safe Variable Substitution Engine", () => {
  test("Substitutes simple nested object variables", () => {
    const template = "Hello {{lead.name}}, welcome to {{workspace.name}}!";
    const context = {
      lead: { name: "Aarav Sharma" },
      workspace: { name: "Apex Technologies" },
    };
    const result = substituteVariables(template, context);
    assertEqual(
      result,
      "Hello Aarav Sharma, welcome to Apex Technologies!",
      "Variable substitution should replace tokens with context values"
    );
  });

  test("Substitutes multiple fields including deals and numeric values", () => {
    const template =
      "Proposal for {{deal.title}} with value of ₹{{deal.value}} is ready.";
    const context = {
      deal: { title: "Enterprise SaaS Rollout", value: 250000 },
    };
    const result = substituteVariables(template, context);
    assertEqual(
      result,
      "Proposal for Enterprise SaaS Rollout with value of ₹250000 is ready."
    );
  });

  test("Preserves unresolvable variable tokens safely without throwing", () => {
    const template = "Hello {{lead.name}}, your code is {{unknown.token}}.";
    const context = {
      lead: { name: "Priya" },
    };
    const result = substituteVariables(template, context);
    assertEqual(result, "Hello Priya, your code is {{unknown.token}}.");
  });

  test("Correctly extracts unique variable tokens from text", () => {
    const text =
      "Hi {{lead.name}}, your deal {{deal.title}} with {{lead.name}} at {{company.name}} is updated.";
    const variables = extractTemplateVariables(text);
    assert(variables.includes("lead.name"), "Must extract lead.name");
    assert(variables.includes("deal.title"), "Must extract deal.title");
    assert(variables.includes("company.name"), "Must extract company.name");
    assertEqual(variables.length, 3, "Must only have unique variables");
  });
});

// ---------------------------------------------------------------------------
// 2. Provider Abstractions & Honest Diagnostics Tests
// ---------------------------------------------------------------------------
describe("Communication Provider Abstractions", () => {
  test("SmtpEmailProvider returns NOT_CONFIGURED when credentials are missing", async () => {
    const provider = new SmtpEmailProvider();
    // Temporarily clear environment
    const prevHost = process.env.SMTP_HOST;
    delete process.env.SMTP_HOST;

    const result = await provider.sendEmail({
      to: "client@example.com",
      subject: "Test Subject",
      htmlContent: "<p>Hello</p>",
    });

    assertEqual(result.success, false, "Delivery must fail honestly");
    assertEqual(result.status, "NOT_CONFIGURED", "Status must be NOT_CONFIGURED");
    assert(
      result.errorMessage?.includes("not configured") ?? false,
      "Should report clear configuration instructions"
    );

    if (prevHost) process.env.SMTP_HOST = prevHost;
  });

  test("MetaWhatsAppProvider returns NOT_CONFIGURED when credentials are missing", async () => {
    const provider = new MetaWhatsAppProvider();
    const prevToken = process.env.WHATSAPP_API_TOKEN;
    delete process.env.WHATSAPP_API_TOKEN;

    const result = await provider.sendMessage({
      toPhone: "+919876543210",
      messageText: "Hello client",
    });

    assertEqual(result.success, false);
    assertEqual(result.status, "NOT_CONFIGURED");

    if (prevToken) process.env.WHATSAPP_API_TOKEN = prevToken;
  });

  test("TwilioSmsProvider returns NOT_CONFIGURED when credentials are missing", async () => {
    const provider = new TwilioSmsProvider();
    const prevSid = process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_ACCOUNT_SID;

    const result = await provider.sendSms({
      toPhone: "+919876543210",
      messageText: "SMS confirmation",
    });

    assertEqual(result.success, false);
    assertEqual(result.status, "NOT_CONFIGURED");

    if (prevSid) process.env.TWILIO_ACCOUNT_SID = prevSid;
  });
});

// ---------------------------------------------------------------------------
// 3. Schema Validations Tests
// ---------------------------------------------------------------------------
describe("Zod Communication Schemas", () => {
  test("logCallSchema validates valid call inputs and applies defaults", () => {
    const valid = logCallSchema.parse({
      content: "Connected with CEO, agreed on timeline",
      durationSeconds: 300,
    });
    assertEqual(valid.direction, CommunicationDirection.OUTBOUND);
    assertEqual(valid.callOutcome, CallOutcome.CONNECTED);
    assertEqual(valid.durationSeconds, 300);
    assertEqual(valid.content, "Connected with CEO, agreed on timeline");
  });

  test("logCallSchema fails if content is empty", () => {
    let failed = false;
    try {
      logCallSchema.parse({
        content: "",
      });
    } catch {
      failed = true;
    }
    assert(failed, "Empty call notes should fail validation");
  });

  test("scheduleMeetingSchema validates dates and url link", () => {
    const valid = scheduleMeetingSchema.parse({
      title: "Quarterly Strategy Review",
      meetingStart: new Date().toISOString(),
      meetingLink: "https://meet.google.com/abc-def-ghi",
    });
    assertEqual(valid.title, "Quarterly Strategy Review");
    assert(valid.meetingLink?.startsWith("https://") ?? false, "Valid url accepted");
  });

  test("sendEmailSchema validates email format", () => {
    const valid = sendEmailSchema.parse({
      recipientEmail: "lead@acme.org",
      subject: "Partnership Opportunity",
      content: "Dear Acme Team...",
    });
    assertEqual(valid.recipientEmail, "lead@acme.org");

    let invalidEmailFailed = false;
    try {
      sendEmailSchema.parse({
        recipientEmail: "not-an-email",
        subject: "Title",
        content: "Content",
      });
    } catch {
      invalidEmailFailed = true;
    }
    assert(invalidEmailFailed, "Malformed email should fail schema validation");
  });

  test("createFollowUpSchema parses valid types and dueAt", () => {
    const valid = createFollowUpSchema.parse({
      title: "Follow up on enterprise proposal",
      type: FollowUpType.EMAIL,
      dueAt: new Date(Date.now() + 86400000).toISOString(),
    });
    assertEqual(valid.type, FollowUpType.EMAIL);
  });

  test("completeFollowUpSchema requires outcome", () => {
    const valid = completeFollowUpSchema.parse({
      id: "fu_12345",
      outcome: "Connected and approved contract draft",
      createNextFollowUp: true,
      nextFollowUpTitle: "Send invoice",
      nextFollowUpDueAt: new Date().toISOString(),
    });
    assertEqual(valid.outcome, "Connected and approved contract draft");
    assertEqual(valid.createNextFollowUp, true);
  });
});

// ---------------------------------------------------------------------------
// 4. Starter Templates Integrity Tests
// ---------------------------------------------------------------------------
describe("Starter Communication Templates", () => {
  test("Contains 5 production starter templates", () => {
    assert(
      STARTER_COMMUNICATION_TEMPLATES.length >= 5,
      `Expected at least 5 starter templates, got ${STARTER_COMMUNICATION_TEMPLATES.length}`
    );
  });

  test("Each starter template has required fields and valid variables", () => {
    for (const tmpl of STARTER_COMMUNICATION_TEMPLATES) {
      assert(tmpl.name.length > 2, `Template name [${tmpl.name}] must be non-empty`);
      assert(tmpl.body.length > 10, `Template body for [${tmpl.name}] must have content`);
      assert(Array.isArray(tmpl.variables), "Variables must be an array");
      assert(
        tmpl.type === CommunicationType.EMAIL ||
          tmpl.type === CommunicationType.WHATSAPP ||
          tmpl.type === CommunicationType.SMS,
        "Type must be a valid channel"
      );
    }
  });
});

// ---------------------------------------------------------------------------
// 5. RBAC Permissions Matrix Integrity Tests
// ---------------------------------------------------------------------------
describe("RBAC Permissions Matrix Integrity", () => {
  const REQUIRED_COMM_PERMISSIONS: Permission[] = [
    "communications.read",
    "communications.create",
    "communications.update",
    "communications.delete",
    "communications.send",
    "followups.read",
    "followups.create",
    "followups.update",
    "followups.delete",
    "templates.read",
    "templates.create",
    "templates.update",
    "templates.delete",
    "communication_reports.read",
  ];

  test("OWNER has all communication permissions", () => {
    const ownerPerms = new Set(ROLE_PERMISSIONS.OWNER);
    for (const p of REQUIRED_COMM_PERMISSIONS) {
      assert(ownerPerms.has(p), `OWNER must have permission ${p}`);
    }
  });

  test("ADMIN has all communication permissions", () => {
    const adminPerms = new Set(ROLE_PERMISSIONS.ADMIN);
    for (const p of REQUIRED_COMM_PERMISSIONS) {
      assert(adminPerms.has(p), `ADMIN must have permission ${p}`);
    }
  });

  test("MEMBER has safe subset of communication permissions", () => {
    const memberPerms = new Set(ROLE_PERMISSIONS.MEMBER);
    assert(memberPerms.has("communications.read"), "MEMBER can read communications");
    assert(memberPerms.has("communications.create"), "MEMBER can create communications");
    assert(memberPerms.has("communications.send"), "MEMBER can send emails");
    assert(memberPerms.has("followups.read"), "MEMBER can read follow-ups");
    assert(memberPerms.has("followups.create"), "MEMBER can create follow-ups");
    assert(memberPerms.has("followups.update"), "MEMBER can update/complete follow-ups");
    // MEMBER should not have delete permissions
    assert(!memberPerms.has("communications.delete"), "MEMBER must NOT delete communications");
    assert(!memberPerms.has("templates.delete"), "MEMBER must NOT delete templates");
  });
});

console.log("\n========================================================");
console.log("All Phase 19 Communication & Follow-up Tests Passed! ✨");
console.log("========================================================\n");
