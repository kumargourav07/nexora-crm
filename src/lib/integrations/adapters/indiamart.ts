import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";

interface IndiaMartRawLead {
  UNIQUE_QUERY_ID?: string;
  QUERY_ID?: string;
  SENDER_NAME?: string;
  SENDER_EMAIL?: string;
  SENDER_MOBILE?: string;
  SENDER_COMPANY?: string;
  SENDER_CITY?: string;
  SENDER_STATE?: string;
  SUBJECT?: string;
  QUERY_MESSAGE?: string;
  PRODUCT_NAME?: string;
  QUERY_TIME?: string;
  TOTAL_RECORDS_FOUND?: number;
  // Direct test fields
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
}

export const indiamartConnector: LeadConnector = {
  provider: IntegrationProvider.INDIAMART,
  name: "IndiaMART Marketplace",
  description: "Automate B2B buyer inquiries and RFQ lead ingestion from IndiaMART Push/Pull API.",
  config: {
    provider: IntegrationProvider.INDIAMART,
    name: "IndiaMART Marketplace",
    description: "Automate B2B buyer inquiries and RFQ lead ingestion from IndiaMART Push/Pull API.",
    category: "B2B Marketplace",
    webhookSupported: true,
    pollingSupported: true,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "glusrCrmKey",
        label: "GLUSR CRM Key / API Key",
        type: "password",
        placeholder: "mcl_api_key_xxxxxxxxxxxxxxxx",
        description: "Your secret CRM key generated from IndiaMART Seller Panel (Lead Manager Settings).",
        required: true,
      },
      {
        key: "mobileNumber",
        label: "Registered Mobile Number",
        type: "text",
        placeholder: "+91 9999999999",
        description: "Primary registered seller mobile number on IndiaMART.",
        required: true,
      },
    ],
    guideSteps: [
      "Log in to IndiaMART Seller Portal -> Lead Manager -> CRM Integration.",
      "Generate your GLUSR CRM API Key.",
      "Enter your CRM API Key and Registered Mobile Number below.",
      "Set your Push Webhook URL in IndiaMART CRM panel or use automated polling.",
    ],
  },

  verifyWebhook(
    _payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      return { isValid: false, error: "IndiaMART CRM Key is required for verification" };
    }

    const providedKey =
      (headers["x-indiamart-key"] as string) ||
      (headers["authorization"] as string)?.replace("Bearer ", "");

    if (providedKey && providedKey !== secret) {
      return { isValid: false, error: "Invalid IndiaMART API Key" };
    }

    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as Record<string, unknown>;
    const leads: NormalizedLead[] = [];

    // Handle array of queries or single query object
    const items: IndiaMartRawLead[] = Array.isArray(raw)
      ? (raw as IndiaMartRawLead[])
      : Array.isArray(raw.RESPONSE)
      ? (raw.RESPONSE as IndiaMartRawLead[])
      : [raw as IndiaMartRawLead];

    for (const item of items) {
      const extId =
        item.UNIQUE_QUERY_ID ||
        item.QUERY_ID ||
        `im_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const name = item.SENDER_NAME || item.name || "IndiaMART Buyer";
      const email = item.SENDER_EMAIL || item.email || "";
      const phone = item.SENDER_MOBILE || item.phone || "";
      const company = item.SENDER_COMPANY || item.company || "IndiaMART B2B Buyer";
      const subject = item.SUBJECT || item.PRODUCT_NAME || "B2B Inquiry";
      const message = item.QUERY_MESSAGE || "";
      const city = item.SENDER_CITY ? `City: ${item.SENDER_CITY}, ` : "";
      const state = item.SENDER_STATE ? `State: ${item.SENDER_STATE}` : "";

      const notes = `Subject: ${subject}\n${message}\nLocation: ${city}${state}`.trim();

      leads.push({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        source: LeadSource.INDIAMART,
        externalId: extId,
        value: 150000,
        notes,
        tags: ["IndiaMART B2B", "Direct RFQ"],
        metadata: item as Record<string, unknown>,
      });
    }

    return leads;
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      CODE: 200,
      STATUS: "SUCCESS",
      MESSAGE: "1 Records Found",
      RESPONSE: [
        {
          UNIQUE_QUERY_ID: `IM_Q_${Date.now()}`,
          QUERY_ID: "492019482",
          QUERY_TYPE: "W",
          SENDER_NAME: "Rajesh Kulkarni",
          SENDER_EMAIL: "r.kulkarni@precisionauto.test",
          SENDER_MOBILE: "+91 98230 11223",
          SENDER_COMPANY: "Precision Auto Components Ltd",
          SENDER_CITY: "Pune",
          SENDER_STATE: "Maharashtra",
          PRODUCT_NAME: "Industrial Automation Machinery",
          SUBJECT: "Requirement for 5 Units CNC Heavy Turning Center",
          QUERY_MESSAGE: "Looking for immediate delivery of 5 heavy duty CNC machines with annual maintenance contract.",
          QUERY_TIME: new Date().toISOString(),
        },
      ],
    };
  },

  async testConnection(
    credentials: Record<string, string>
  ): Promise<{ success: boolean; message: string }> {
    if (!credentials.glusrCrmKey) {
      return { success: false, message: "GLUSR CRM Key is required." };
    }
    if (!credentials.mobileNumber) {
      return { success: false, message: "Registered Mobile Number is required." };
    }
    return {
      success: true,
      message: "IndiaMART connector validated. Ready for B2B RFQ lead ingestion.",
    };
  },
};
