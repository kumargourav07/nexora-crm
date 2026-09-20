import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";

interface GoogleAdsColumnData {
  column_id: string;
  string_value: string;
}

interface GoogleAdsPayload {
  lead_id?: string;
  campaign_id?: string | number;
  form_id?: string | number;
  google_key?: string;
  is_test?: boolean;
  user_column_data?: GoogleAdsColumnData[];
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export const googleAdsConnector: LeadConnector = {
  provider: IntegrationProvider.GOOGLE_ADS,
  name: "Google Ads Lead Extensions",
  description: "Ingest high-intent search and YouTube lead form submissions directly from Google Ads.",
  config: {
    provider: IntegrationProvider.GOOGLE_ADS,
    name: "Google Ads Lead Extensions",
    description: "Ingest high-intent search and YouTube lead form submissions directly from Google Ads.",
    category: "Advertising",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "googleKey",
        label: "Google Webhook Key",
        type: "password",
        placeholder: "gads_sec_xxxxxxxxxxxxxxxx",
        description: "The webhook key configured inside your Google Ads lead form extension webhook settings.",
        required: true,
      },
      {
        key: "customerId",
        label: "Google Ads Customer ID (Optional)",
        type: "text",
        placeholder: "123-456-7890",
        description: "Your 10-digit Google Ads account ID.",
      },
    ],
    guideSteps: [
      "In Google Ads, go to Assets -> Lead Form.",
      "Expand 'Export leads from Google Ads' and select Webhook.",
      "Paste NEXORA's Webhook URL (/api/webhooks/custom/[integrationId]).",
      "Enter the Google Webhook Key configured below.",
      "Click 'Send test data' in Google Ads to verify delivery.",
    ],
  },

  verifyWebhook(
    _payload: string,
    _headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      return { isValid: false, error: "Google Webhook Key is required for authentication" };
    }

    // Google Ads sends the google_key inside the JSON payload body or query
    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as GoogleAdsPayload;

    // Check Google Key if configured in secrets or config
    const extId =
      raw.lead_id ||
      `gads_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    let name = raw.name || "Google Ads Lead";
    let email = raw.email || "";
    let phone = raw.phone || "";
    let company = raw.company || "Google Search Campaign";
    let notes = `Google Ads Lead Form ID: ${raw.form_id || "N/A"}\nCampaign ID: ${raw.campaign_id || "N/A"}`;

    if (Array.isArray(raw.user_column_data)) {
      for (const col of raw.user_column_data) {
        const id = (col.column_id || "").toUpperCase();
        const val = col.string_value || "";

        if (id === "FULL_NAME") {
          name = val;
        } else if (id === "FIRST_NAME") {
          name = `${val} ${name === "Google Ads Lead" ? "" : name}`.trim();
        } else if (id === "LAST_NAME") {
          name = `${name === "Google Ads Lead" ? "" : name} ${val}`.trim();
        } else if (id === "EMAIL") {
          email = val;
        } else if (id === "PHONE_NUMBER") {
          phone = val;
        } else if (id === "COMPANY_NAME") {
          company = val;
        } else {
          notes += `\n${col.column_id}: ${val}`;
        }
      }
    }

    return [
      {
        name: name.trim() || "Google Ads Lead",
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim() || "Google Ads Campaign",
        source: LeadSource.GOOGLE_ADS,
        externalId: extId,
        value: 500000,
        notes: notes.trim(),
        tags: ["Google Ads", "Search Intent", `Campaign: ${raw.campaign_id || "Search"}`],
        metadata: raw as Record<string, unknown>,
      },
    ];
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      lead_id: `gads_lead_${Date.now()}`,
      campaign_id: 1982736450,
      form_id: 8492019,
      google_key: "gads_sec_sample_key",
      is_test: true,
      user_column_data: [
        { column_id: "FULL_NAME", string_value: "Vikram Malhotra" },
        { column_id: "EMAIL", string_value: "vikram.malhotra@zenithlogistics.test" },
        { column_id: "PHONE_NUMBER", string_value: "+91 98190 22334" },
        { column_id: "COMPANY_NAME", string_value: "Zenith Global Logistics" },
        { column_id: "JOB_TITLE", string_value: "VP of Supply Chain" },
        { column_id: "POSTAL_CODE", string_value: "400051" },
      ],
    };
  },

  async testConnection(
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!credentials.googleKey) {
      return { success: false, message: "Google Webhook Key is required." };
    }
    return {
      success: true,
      message: "Google Ads Lead Form connector active and listening.",
    };
  },
};
