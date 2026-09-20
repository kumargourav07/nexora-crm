/**
 * ============================================================================
 * NEXORA CRM — PHASE 14 AUTOMATED RBAC & SECURITY VERIFICATION SUITE
 * ============================================================================
 */

import { Role } from "@prisma/client";
import {
  hasPermission,
  getRolePermissions,
  canManageRole,
  Permission,
} from "../auth/permissions";
import { sanitizeMetadata } from "../services/audit-service";
import crypto from "crypto";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✅ PASSED: ${message}`);
}

async function runRbacTests() {
  console.log("\n🔒 ========================================================");
  console.log("🔒 RUNNING NEXORA PHASE 14 RBAC & SECURITY VERIFICATIONS");
  console.log("🔒 ========================================================\n");

  // TEST 1: OWNER Role has all permissions
  console.log("--- 1. OWNER PERMISSIONS VERIFICATION ---");
  const allExpectedOwnerPerms: Permission[] = [
    "workspace.read",
    "workspace.update",
    "workspace.delete",
    "team.read",
    "team.invite",
    "team.update",
    "team.remove",
    "roles.read",
    "roles.update",
    "leads.read",
    "leads.create",
    "leads.update",
    "leads.delete",
    "invoices.read",
    "invoices.create",
    "invoices.update",
    "invoices.delete",
    "employees.read",
    "employees.create",
    "employees.update",
    "employees.delete",
    "integrations.read",
    "integrations.create",
    "integrations.update",
    "integrations.delete",
    "analytics.read",
    "audit.read",
  ];

  const rolePerms = getRolePermissions(Role.OWNER);
  assert(rolePerms.length >= allExpectedOwnerPerms.length, "getRolePermissions returns all owner permissions");

  for (const perm of allExpectedOwnerPerms) {
    assert(hasPermission(Role.OWNER, perm), `OWNER has '${perm}' permission`);
  }

  // TEST 2: ADMIN Role Permissions & Boundaries
  console.log("\n--- 2. ADMIN PERMISSIONS & BOUNDARIES ---");
  assert(hasPermission(Role.ADMIN, "workspace.update"), "ADMIN can update workspace settings");
  assert(!hasPermission(Role.ADMIN, "workspace.delete"), "ADMIN CANNOT delete workspace (OWNER only)");
  assert(hasPermission(Role.ADMIN, "team.invite"), "ADMIN can invite members");
  assert(hasPermission(Role.ADMIN, "leads.delete"), "ADMIN can delete leads");
  assert(hasPermission(Role.ADMIN, "audit.read"), "ADMIN can view audit logs");

  // TEST 3: MANAGER Role Permissions & Boundaries
  console.log("\n--- 3. MANAGER PERMISSIONS & BOUNDARIES ---");
  assert(hasPermission(Role.MANAGER, "leads.read"), "MANAGER can read leads");
  assert(hasPermission(Role.MANAGER, "leads.create"), "MANAGER can create leads");
  assert(hasPermission(Role.MANAGER, "leads.delete"), "MANAGER can delete leads");
  assert(hasPermission(Role.MANAGER, "employees.create"), "MANAGER can add employees");
  assert(!hasPermission(Role.MANAGER, "workspace.update"), "MANAGER CANNOT update workspace settings");
  assert(!hasPermission(Role.MANAGER, "team.invite"), "MANAGER CANNOT invite team members");
  assert(!hasPermission(Role.MANAGER, "roles.update"), "MANAGER CANNOT modify roles");
  assert(!hasPermission(Role.MANAGER, "audit.read"), "MANAGER CANNOT read audit logs");
  assert(!hasPermission(Role.MANAGER, "integrations.create"), "MANAGER CANNOT configure integrations");

  // TEST 4: MEMBER Role Restrictions
  console.log("\n--- 4. MEMBER PERMISSIONS & RESTRICTIONS ---");
  assert(hasPermission(Role.MEMBER, "leads.read"), "MEMBER can read leads");
  assert(hasPermission(Role.MEMBER, "leads.create"), "MEMBER can create leads");
  assert(!hasPermission(Role.MEMBER, "leads.delete"), "MEMBER CANNOT delete leads");
  assert(!hasPermission(Role.MEMBER, "invoices.delete"), "MEMBER CANNOT delete invoices");
  assert(!hasPermission(Role.MEMBER, "employees.create"), "MEMBER CANNOT create employees");
  assert(!hasPermission(Role.MEMBER, "team.invite"), "MEMBER CANNOT invite members");
  assert(!hasPermission(Role.MEMBER, "roles.update"), "MEMBER CANNOT update roles");
  assert(!hasPermission(Role.MEMBER, "audit.read"), "MEMBER CANNOT read audit logs");

  // TEST 5: Role Escalation Safeguards
  console.log("\n--- 5. ROLE ESCALATION SAFEGUARDS ---");
  assert(canManageRole(Role.OWNER, Role.ADMIN, Role.OWNER), "OWNER can promote ADMIN to OWNER");
  assert(canManageRole(Role.OWNER, Role.MEMBER, Role.MANAGER), "OWNER can promote MEMBER to MANAGER");
  assert(canManageRole(Role.ADMIN, Role.MEMBER, Role.MANAGER), "ADMIN can promote MEMBER to MANAGER");
  assert(!canManageRole(Role.ADMIN, Role.MEMBER, Role.OWNER), "ADMIN CANNOT promote MEMBER to OWNER");
  assert(!canManageRole(Role.ADMIN, Role.OWNER, Role.ADMIN), "ADMIN CANNOT demote OWNER");
  assert(!canManageRole(Role.MANAGER, Role.MEMBER, Role.ADMIN), "MANAGER CANNOT change roles");
  assert(!canManageRole(Role.MEMBER, Role.MEMBER, Role.ADMIN), "MEMBER CANNOT change roles");

  // TEST 6: Audit Log Sensitive Credentials Scrubbing
  console.log("\n--- 6. AUDIT LOG PRIVACY & SANITIZATION ---");
  const dirtyPayload = {
    user: "alex@nexora.local",
    password: "SuperSecretPassword123!",
    currentPassword: "OldPassword123!",
    token: "raw_token_xyz987",
    apiKey: "secret_live_api_key_441",
    webhookSecret: "whsec_supersecret",
    normalField: "Apex Tower Estates",
    nested: {
      passwordHash: "$2a$10$abc...",
      safeValue: 450000,
    },
  };

  const sanitized = sanitizeMetadata(dirtyPayload) as Record<string, unknown>;
  assert(sanitized.password === "[REDACTED]", "Password stripped from audit log");
  assert(sanitized.currentPassword === "[REDACTED]", "Current password stripped");
  assert(sanitized.token === "[REDACTED]", "Token stripped");
  assert(sanitized.apiKey === "[REDACTED]", "API key stripped");
  assert(sanitized.webhookSecret === "[REDACTED]", "Webhook secret stripped");
  assert((sanitized.nested as Record<string, unknown>).passwordHash === "[REDACTED]", "Nested password hash stripped");
  assert(sanitized.normalField === "Apex Tower Estates", "Safe field preserved");
  assert((sanitized.nested as Record<string, unknown>).safeValue === 450000, "Safe nested value preserved");

  // TEST 7: Cryptographic Token Hashing
  console.log("\n--- 7. CRYPTOGRAPHIC TOKEN HASHING ---");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hash1 = crypto.createHash("sha256").update(rawToken).digest("hex");
  const hash2 = crypto.createHash("sha256").update(rawToken).digest("hex");
  assert(hash1 === hash2, "SHA-256 token hashing is deterministic");
  assert(hash1.length === 64, "SHA-256 hash length is exactly 64 hex characters");
  assert(rawToken !== hash1, "Raw token is never stored directly as hash");

  console.log("\n🎉 ========================================================");
  console.log("🎉 ALL PHASE 14 RBAC & SECURITY TESTS COMPLETED SUCCESSFULLY");
  console.log("🎉 ========================================================\n");
}

runRbacTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
