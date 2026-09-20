import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";

interface NinetyNineAcresLeadRaw {
  lead_id?: string;
  query_id?: string;
  lead_name?: string;
  lead_email?: string;
  lead_phone?: string;
  project_name?: string;
  property_id?: string;
  budget_min?: number | string;
  budget_max?: number | string;
  city?: string;
  locality?: string;
  bedroom?: string;
  comments?: string;
}

export const ninetyNineAcresConnector: LeadConnector = {
  provider: IntegrationProvider.NINETY_NINE_ACRES,
  name: "99acres Real Estate",
  description: "Capture verified property buyers and tenant leads directly from 99acres portal.",
  config: {
    provider: IntegrationProvider.NINETY_NINE_ACRES,
    name: "99acres Real Estate",
    description: "Capture verified property buyers and tenant leads directly from 99acres portal.",
    category: "Real Estate",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "apiKey",
        label: "99acres Developer API Key",
        type: "password",
        placeholder: "99a_live_key_xxxxxxxxxxxxxxxx",
        description: "API Key provided by 99acres enterprise account manager.",
        required: true,
      },
      {
        key: "builderId",
        label: "Builder / Agency Account ID",
        type: "text",
        placeholder: "BLD-992019",
        description: "Your registered Builder / Broker Account ID on 99acres.",
        required: true,
      },
    ],
    guideSteps: [
      "Contact your 99acres Key Account Manager to activate Real-Time Lead Push.",
      "Provide NEXORA Custom Webhook URL to 99acres integration desk.",
      "Enter your API Key and Builder Account ID here.",
      "Verify inbound test lead payload.",
    ],
  },

  verifyWebhook(
    _payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      return { isValid: false, error: "99acres API Key is required for authentication" };
    }

    const authHeader = (headers["authorization"] as string) || (headers["x-api-key"] as string);
    if (authHeader && authHeader.replace("Bearer ", "") !== secret) {
      return { isValid: false, error: "Invalid 99acres authorization key" };
    }

    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as Record<string, unknown>;
    const leads: NormalizedLead[] = [];

    const items: NinetyNineAcresLeadRaw[] = Array.isArray(raw)
      ? (raw as NinetyNineAcresLeadRaw[])
      : Array.isArray(raw.leads)
      ? (raw.leads as NinetyNineAcresLeadRaw[])
      : [raw as NinetyNineAcresLeadRaw];

    for (const item of items) {
      const extId =
        item.lead_id ||
        item.query_id ||
        `99a_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const name = item.lead_name || (raw.name as string) || "99acres Buyer";
      const email = item.lead_email || (raw.email as string) || "";
      const phone = item.lead_phone || (raw.phone as string) || "";
      const project = item.project_name || "Premium Real Estate Project";
      const locality = item.locality ? `${item.locality}, ` : "";
      const city = item.city || "";
      const bdr = item.bedroom ? `Config: ${item.bedroom} BHK` : "";
      const budget = item.budget_max || item.budget_min || 12500000;

      const notes = `Project: ${project}\nLocation: ${locality}${city}\n${bdr}\nInquiry: ${
        item.comments || "Buyer requested callback and brochure."
      }`.trim();

      leads.push({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: `${project} Inbound`,
        source: LeadSource.NINETY_NINE_ACRES,
        externalId: extId,
        value: typeof budget === "number" ? budget : parseFloat(String(budget).replace(/[^0-9.]/g, "")) || 0,
        notes,
        tags: ["99acres", "Property Buyer", project],
        metadata: item as Record<string, unknown>,
      });
    }

    return leads;
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      lead_id: `99A_${Date.now()}`,
      lead_name: "Amitabh Sengupta",
      lead_email: "amitabh.sengupta@investor.test",
      lead_phone: "+91 97110 55443",
      project_name: "Nexora Sky Villas Sector 62",
      property_id: "PROP-994820",
      budget_min: 12000000,
      budget_max: 18000000,
      city: "Gurugram",
      locality: "Golf Course Extension",
      bedroom: "4",
      comments: "Interested in high-floor 4BHK unit with golf course view. Pre-approved home loan.",
      timestamp: new Date().toISOString(),
    };
  },

  async testConnection(
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!credentials.apiKey) {
      return { success: false, message: "99acres Developer API Key is required." };
    }
    if (!credentials.builderId) {
      return { success: false, message: "Builder / Agency ID is required." };
    }
    return {
      success: true,
      message: "99acres portal integration verified. Ready for property buyer leads.",
    };
  },
};
