import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";
import { verifyHmacSha256 } from "../crypto";

interface CustomWebhookPayload {
  name?: string;
  first_name?: string;
  last_name?: string;
  fullName?: string;
  email?: string;
  work_email?: string;
  phone?: string;
  mobile?: string;
  phone_number?: string;
  company?: string;
  organization?: string;
  company_name?: string;
  value?: number | string;
  amount?: number | string;
  deal_value?: number | string;
  notes?: string;
  message?: string;
  description?: string;
  id?: string;
  lead_id?: string;
  external_id?: string;
  tags?: string[] | string;
  source?: string;
  [key: string]: unknown;
}

export const customWebhookConnector: LeadConnector = {
  provider: IntegrationProvider.CUSTOM_API,
  name: "Custom Webhook / REST API",
  description: "Universal HMAC-secured webhook endpoint for Zapier, Make, n8n, internal microservices, and bespoke CRMs.",
  config: {
    provider: IntegrationProvider.CUSTOM_API,
    name: "Custom Webhook / REST API",
    description: "Universal HMAC-secured webhook endpoint for Zapier, Make, n8n, internal microservices, and bespoke CRMs.",
    category: "Custom",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "secretKey",
        label: "Signing Secret (HMAC SHA-256)",
        type: "password",
        placeholder: "nex_whsec_xxxxxxxxxxxxxxxx",
        description: "Shared secret used to sign the X-Nexora-Signature header.",
        required: true,
      },
      {
        key: "nameField",
        label: "Name Field Key (Optional)",
        type: "text",
        placeholder: "e.g. contact.name or fullName",
        description: "Custom JSON property path for contact name.",
      },
      {
        key: "emailField",
        label: "Email Field Key (Optional)",
        type: "text",
        placeholder: "e.g. contact.email or work_email",
        description: "Custom JSON property path for email.",
      },
      {
        key: "phoneField",
        label: "Phone Field Key (Optional)",
        type: "text",
        placeholder: "e.g. contact.phone or mobile",
        description: "Custom JSON property path for phone number.",
      },
    ],
    guideSteps: [
      "Copy your unique workspace webhook endpoint: /api/webhooks/custom/[integrationId]",
      "Generate a secure HMAC-SHA256 signing secret.",
      "Configure your workflow tool (Zapier / Make / Python / Go) to POST JSON payloads.",
      "Send HMAC-SHA256 hash in header 'X-Nexora-Signature' or Bearer token.",
    ],
  },

  verifyWebhook(
    payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      return { isValid: false, error: "Custom webhook secret is not configured" };
    }

    const signature =
      (headers["x-nexora-signature"] as string) ||
      (headers["x-signature-256"] as string) ||
      (headers["x-signature"] as string);

    const bearer = (headers["authorization"] as string)?.replace("Bearer ", "");

    // Accept either HMAC SHA-256 signature OR Bearer Token matching the secret
    if (signature) {
      const isValid = verifyHmacSha256(payload, signature, secret);
      if (!isValid) {
        return { isValid: false, error: "Invalid HMAC SHA-256 signature" };
      }
      return { isValid: true };
    }

    if (bearer && bearer === secret) {
      return { isValid: true };
    }

    return {
      isValid: false,
      error: "Missing or invalid X-Nexora-Signature or Bearer authentication header",
    };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as CustomWebhookPayload;
    const leads: NormalizedLead[] = [];

    const items: CustomWebhookPayload[] = Array.isArray(raw)
      ? (raw as CustomWebhookPayload[])
      : Array.isArray(raw.data)
      ? (raw.data as CustomWebhookPayload[])
      : Array.isArray(raw.leads)
      ? (raw.leads as CustomWebhookPayload[])
      : [raw];

    for (const item of items) {
      const extId =
        String(item.id || item.lead_id || item.external_id || `cst_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);

      // Name resolution
      let name = item.name || item.fullName || "";
      if (!name && (item.first_name || item.last_name)) {
        name = `${item.first_name || ""} ${item.last_name || ""}`.trim();
      }
      if (!name) name = "Webhook Contact";

      // Email & phone resolution
      const email = item.email || item.work_email || "";
      const phone = item.phone || item.mobile || item.phone_number || "";
      const company = item.company || item.organization || item.company_name || "Custom API Inbound";

      // Value calculation
      let value = 0;
      const rawVal = item.value || item.amount || item.deal_value;
      if (rawVal) {
        const num = typeof rawVal === "number" ? rawVal : parseFloat(String(rawVal).replace(/[^0-9.]/g, ""));
        if (!isNaN(num)) value = num;
      }

      // Notes
      const notes = item.notes || item.message || item.description || "Ingested via NEXORA Custom Webhook API.";

      // Tags
      const tags: string[] = ["Custom API"];
      if (Array.isArray(item.tags)) {
        tags.push(...item.tags.map(String));
      } else if (typeof item.tags === "string") {
        tags.push(...item.tags.split(",").map((t) => t.trim()));
      }

      leads.push({
        name: name.trim(),
        email: String(email).trim(),
        phone: String(phone).trim(),
        company: String(company).trim(),
        source: LeadSource.OTHER,
        externalId: extId,
        value,
        notes: String(notes).trim(),
        tags,
        metadata: item,
      });
    }

    return leads;
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      event: "lead.created",
      external_id: `EXT_APP_${Date.now()}`,
      fullName: "Ananya Deshmukh",
      email: "ananya.deshmukh@synapseai.test",
      phone: "+91 98450 99887",
      company: "Synapse AI Global Solutions",
      deal_value: 680000,
      notes: "Lead captured from Zapier Typeform submission. Looking for 50-seat CRM license.",
      tags: ["Zapier Inbound", "Enterprise Lead", "Q4 Prospect"],
      timestamp: new Date().toISOString(),
    };
  },

  async testConnection(
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!credentials.secretKey) {
      return { success: false, message: "Signing Secret is required." };
    }
    return {
      success: true,
      message: "Custom webhook endpoint configured and secured with HMAC SHA-256.",
    };
  },
};
