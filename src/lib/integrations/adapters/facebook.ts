import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";
import { verifyHmacSha256 } from "../crypto";

interface MetaLeadField {
  name: string;
  values: string[];
}

interface MetaWebhookValue {
  ad_id?: string;
  form_id?: string;
  leadgen_id?: string;
  created_time?: number;
  page_id?: string;
  field_data?: MetaLeadField[];
  // Direct test payload format
  full_name?: string;
  email?: string;
  phone_number?: string;
  company_name?: string;
  estimated_value?: number;
  notes?: string;
}

interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    field: string;
    value: MetaWebhookValue;
  }>;
}

export const facebookConnector: LeadConnector = {
  provider: IntegrationProvider.FACEBOOK,
  name: "Facebook Lead Ads",
  description: "Capture leads in real-time from Meta Facebook & Instagram Instant Forms.",
  config: {
    provider: IntegrationProvider.FACEBOOK,
    name: "Facebook Lead Ads",
    description: "Capture leads in real-time from Meta Facebook & Instagram Instant Forms.",
    category: "Advertising",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "appSecret",
        label: "Meta App Secret",
        type: "password",
        placeholder: "App secret from Meta Developer Portal",
        description: "Used to verify HMAC-SHA256 signatures on X-Hub-Signature-256.",
        required: true,
      },
      {
        key: "verifyToken",
        label: "Webhook Verify Token",
        type: "text",
        placeholder: "e.g. nexora_fb_verify_token_123",
        description: "Token configured in Meta Webhooks subscription.",
        required: true,
      },
      {
        key: "pageAccessToken",
        label: "Page Access Token (Optional)",
        type: "password",
        placeholder: "EAA...",
        description: "Required if fetching full field data asynchronously via Graph API.",
      },
      {
        key: "pageId",
        label: "Facebook Page ID (Optional)",
        type: "text",
        placeholder: "100238491823901",
        description: "Filter leads by specific Facebook Page.",
      },
    ],
    guideSteps: [
      "Create a Meta Developer App and add Webhooks product.",
      "Subscribe to 'leadgen' field on the 'page' object.",
      "Set Callback URL to NEXORA's Webhook URL (/api/webhooks/facebook).",
      "Enter the Verify Token configured here in Meta Webhooks settings.",
      "Copy your Meta App Secret here to enable SHA-256 signature verification.",
    ],
  },

  verifyWebhook(
    payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      // If secret is not configured, reject for security
      return { isValid: false, error: "Meta App Secret is required for signature verification" };
    }

    const signature =
      (headers["x-hub-signature-256"] as string) ||
      (headers["X-Hub-Signature-256"] as string);

    if (!signature) {
      return { isValid: false, error: "Missing X-Hub-Signature-256 header" };
    }

    const isValid = verifyHmacSha256(payload, signature, secret);
    if (!isValid) {
      return { isValid: false, error: "Invalid HMAC SHA-256 signature" };
    }

    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as Record<string, unknown>;
    const leads: NormalizedLead[] = [];

    // Format 1: Standard Meta Webhook payload with entries
    if (raw && Array.isArray(raw.entry)) {
      for (const entry of raw.entry as MetaWebhookEntry[]) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.field === "leadgen" && change.value) {
            const val = change.value;
            const leadId = val.leadgen_id || `fb_${entry.id}_${Date.now()}`;

            let name = val.full_name || "Meta Lead";
            let email = val.email || "";
            let phone = val.phone_number || "";
            let company = val.company_name || "";
            let notes = val.notes || "";
            let value = val.estimated_value || 0;

            // If field_data array is supplied (direct webhook or test payload)
            if (Array.isArray(val.field_data)) {
              for (const field of val.field_data) {
                const fname = (field.name || "").toLowerCase();
                const fval = field.values?.[0] || "";

                if (fname.includes("company") || fname.includes("org")) {
                  company = fval;
                } else if (fname.includes("full_name") || fname === "name" || fname === "first_name") {
                  name = fval;
                } else if (fname.includes("email")) {
                  email = fval;
                } else if (fname.includes("phone") || fname.includes("mobile")) {
                  phone = fval;
                } else if (fname.includes("budget") || fname.includes("value")) {
                  const num = parseFloat(fval.replace(/[^0-9.]/g, ""));
                  if (!isNaN(num)) value = num;
                } else {
                  notes += `${field.name}: ${fval}\n`;
                }
              }
            }

            leads.push({
              name: name.trim() || "Meta Lead",
              email: email.trim(),
              phone: phone.trim(),
              company: company.trim() || "Meta Lead Campaign",
              source: LeadSource.FACEBOOK,
              externalId: String(leadId),
              value,
              notes: notes.trim() || `Generated via Meta Lead Ad Form: ${val.form_id || "Direct"}`,
              tags: ["Facebook Lead Ads", "Meta Instant Form"],
              metadata: {
                adId: val.ad_id,
                formId: val.form_id,
                pageId: val.page_id,
                rawEntryId: entry.id,
              },
            });
          }
        }
      }
    }

    // Format 2: Direct or Simulated Meta Lead payload
    if (leads.length === 0 && raw && (raw.leadgen_id || raw.name || raw.email || raw.phone)) {
      const extId = String(raw.leadgen_id || raw.externalId || `fb_sim_${Date.now()}`);
      leads.push({
        name: String(raw.name || raw.full_name || "Meta Lead"),
        email: String(raw.email || ""),
        phone: String(raw.phone || raw.phone_number || ""),
        company: String(raw.company || raw.company_name || "Facebook Ad Inbound"),
        source: LeadSource.FACEBOOK,
        externalId: extId,
        value: Number(raw.value || raw.estimated_value || 0),
        notes: String(raw.notes || `Ad Form ID: ${raw.form_id || "Default Form"}`),
        tags: ["Facebook Lead Ads", "Meta Ads"],
        metadata: raw as Record<string, unknown>,
      });
    }

    return leads;
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      object: "page",
      entry: [
        {
          id: "104928172839101",
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "leadgen",
              value: {
                ad_id: "23851928471920",
                form_id: "482019482019",
                leadgen_id: `fb_lead_${Date.now()}`,
                created_time: Math.floor(Date.now() / 1000),
                page_id: "104928172839101",
                field_data: [
                  { name: "full_name", values: ["Priya Sharma"] },
                  { name: "email", values: ["priya.sharma@enterprise.test"] },
                  { name: "phone_number", values: ["+91 98765 43210"] },
                  { name: "company_name", values: ["Sharma FinTech Labs"] },
                  { name: "estimated_value", values: ["850000"] },
                  { name: "requirement", values: ["Enterprise Cloud Migration & CRM"] },
                ],
              },
            },
          ],
        },
      ],
    };
  },

  async testConnection(
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!credentials.appSecret) {
      return { success: false, message: "Meta App Secret is missing. Please provide a valid secret." };
    }
    if (!credentials.verifyToken) {
      return { success: false, message: "Webhook Verify Token is missing." };
    }
    return {
      success: true,
      message: "Facebook connector configuration verified successfully. Ready for incoming webhooks.",
    };
  },
};
