import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";
import { verifyHmacSha256 } from "../crypto";

interface HousingLeadRaw {
  inquiry_id?: string;
  lead_id?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  project_title?: string;
  developer_name?: string;
  budget_range?: string;
  city_name?: string;
  platform?: string;
  message?: string;
}

export const housingConnector: LeadConnector = {
  provider: IntegrationProvider.HOUSING,
  name: "Housing.com / Makaan",
  description: "Synchronize high-intent home buyers and investors from Housing.com & Makaan platforms.",
  config: {
    provider: IntegrationProvider.HOUSING,
    name: "Housing.com / Makaan",
    description: "Synchronize high-intent home buyers and investors from Housing.com & Makaan platforms.",
    category: "Real Estate",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "webhookSecret",
        label: "Housing Webhook Secret",
        type: "password",
        placeholder: "hsg_sec_xxxxxxxxxxxxxxxx",
        description: "Shared secret key used to sign Housing / Makaan inbound webhooks.",
        required: true,
      },
      {
        key: "developerId",
        label: "Developer / Partner ID",
        type: "text",
        placeholder: "DEV-820194",
        description: "Registered Developer Account Identifier on Housing.com Developer Portal.",
        required: true,
      },
    ],
    guideSteps: [
      "Navigate to Housing.com / Elara Technologies CRM Bridge settings.",
      "Add NEXORA Webhook endpoint (/api/webhooks/custom/[integrationId]).",
      "Set signature algorithm to HMAC-SHA256 and enter the Webhook Secret.",
      "Save developer ID and activate live leads.",
    ],
  },

  verifyWebhook(
    payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      return { isValid: false, error: "Housing Webhook Secret is required for signature verification" };
    }

    const signature =
      (headers["x-housing-signature"] as string) ||
      (headers["x-signature-sha256"] as string);

    if (!signature) {
      return { isValid: false, error: "Missing Housing signature header" };
    }

    const isValid = verifyHmacSha256(payload, signature, secret);
    if (!isValid) {
      return { isValid: false, error: "Invalid Housing webhook signature" };
    }

    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as Record<string, unknown>;
    const leads: NormalizedLead[] = [];

    const items: HousingLeadRaw[] = Array.isArray(raw)
      ? (raw as HousingLeadRaw[])
      : Array.isArray(raw.data)
      ? (raw.data as HousingLeadRaw[])
      : [raw as HousingLeadRaw];

    for (const item of items) {
      const extId =
        item.inquiry_id ||
        item.lead_id ||
        `hsg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const name = item.user_name || (raw.name as string) || "Housing Buyer";
      const email = item.user_email || (raw.email as string) || "";
      const phone = item.user_phone || (raw.phone as string) || "";
      const project = item.project_title || "Housing Residential Project";
      const platform = item.platform ? `[${item.platform.toUpperCase()}] ` : "[HOUSING] ";
      const city = item.city_name ? `in ${item.city_name}` : "";

      let value = 9500000;
      if (item.budget_range) {
        const num = parseFloat(item.budget_range.replace(/[^0-9.]/g, ""));
        if (!isNaN(num) && num > 0) value = num;
      }

      leads.push({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: `${project} Inbound`,
        source: LeadSource.HOUSING,
        externalId: extId,
        value,
        notes: `${platform}Inquiry for ${project} ${city}.\nBudget Range: ${
          item.budget_range || "Standard"
        }\nMessage: ${item.message || "Buyer requested site visit."}`.trim(),
        tags: ["Housing.com", "Makaan", "Real Estate Inbound"],
        metadata: item as Record<string, unknown>,
      });
    }

    return leads;
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      inquiry_id: `HSG_INQ_${Date.now()}`,
      lead_id: "LID-482019",
      platform: "housing",
      user_name: "Karan Singhania",
      user_email: "karan.singhania@techventure.test",
      user_phone: "+91 98300 77665",
      project_title: "Nexora Grand Residences",
      developer_name: "Nexora Infra Group",
      budget_range: "9500000 - 14000000",
      city_name: "Bengaluru",
      message: "Looking for ready-to-move 3BHK flat near Whitefield tech corridor. Immediate site visit request.",
      created_at: new Date().toISOString(),
    };
  },

  async testConnection(
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!credentials.webhookSecret) {
      return { success: false, message: "Housing Webhook Secret is required." };
    }
    if (!credentials.developerId) {
      return { success: false, message: "Developer ID is required." };
    }
    return {
      success: true,
      message: "Housing.com / Makaan webhook listener ready.",
    };
  },
};
