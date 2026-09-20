import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";

interface WebsiteFormPayload {
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  company?: string;
  companyName?: string;
  message?: string;
  notes?: string;
  budget?: string | number;
  value?: number;
  sourceUrl?: string;
  formName?: string;
  formId?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  id?: string;
  externalId?: string;
}

export const websiteConnector: LeadConnector = {
  provider: IntegrationProvider.WEBSITE,
  name: "Website Forms & Landing Pages",
  description: "Capture inbound inquiries from your marketing website, landing pages, and Webflow/WordPress forms.",
  config: {
    provider: IntegrationProvider.WEBSITE,
    name: "Website Forms & Landing Pages",
    description: "Capture inbound inquiries from your marketing website, landing pages, and Webflow/WordPress forms.",
    category: "Inbound",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "formKey",
        label: "Form Public Key / Token",
        type: "text",
        placeholder: "nex_form_pk_live_xxxxxxxx",
        description: "Public key placed in website forms to authorize inbound submissions.",
        required: false,
      },
      {
        key: "allowedDomains",
        label: "Allowed Website Domains",
        type: "text",
        placeholder: "nexora.com, yourcompany.com",
        description: "Comma-separated list of allowed origin domains (CORS protection).",
        required: false,
      },
    ],
    guideSteps: [
      "Embed standard HTML form or AJAX submit to NEXORA's Website Form endpoint (/api/webhooks/website).",
      "Include standard fields: name, email, phone, company, message.",
      "Optionally pass UTM tags (utm_source, utm_medium, utm_campaign) for attribution tracking.",
      "Leads appear instantly in your pipeline with NEW status.",
    ],
  },

  verifyWebhook(
    _payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    // If a form key is configured, verify header or token
    if (secret) {
      const auth =
        (headers["x-nexora-form-key"] as string) ||
        (headers["x-form-key"] as string) ||
        (headers["authorization"] as string)?.replace("Bearer ", "");

      if (auth && auth !== secret) {
        return { isValid: false, error: "Invalid website form key" };
      }
    }

    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as WebsiteFormPayload;
    const extId =
      raw.externalId ||
      raw.id ||
      `web_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const name = raw.name || raw.fullName || "Website Visitor";
    const email = raw.email || "";
    const phone = raw.phone || raw.mobile || "";
    const company = raw.company || raw.companyName || "Direct Website Inbound";

    let value = 0;
    if (raw.budget || raw.value) {
      const v = typeof raw.budget === "number" ? raw.budget : parseFloat(String(raw.budget || raw.value).replace(/[^0-9.]/g, ""));
      if (!isNaN(v)) value = v;
    }

    let notes = raw.message || raw.notes || "Inbound inquiry submitted via website form.";
    if (raw.sourceUrl) notes += `\nSubmitted from: ${raw.sourceUrl}`;
    if (raw.formName) notes += `\nForm: ${raw.formName}`;
    if (raw.utm_source) notes += `\nUTM: ${raw.utm_source} / ${raw.utm_medium || "none"} / ${raw.utm_campaign || "none"}`;

    const tags = ["Website Inbound"];
    if (raw.formName) tags.push(raw.formName);
    if (raw.utm_campaign) tags.push(`Campaign: ${raw.utm_campaign}`);

    return [
      {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        source: LeadSource.WEBSITE,
        externalId: extId,
        value,
        notes: notes.trim(),
        tags,
        metadata: raw as Record<string, unknown>,
      },
    ];
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      fullName: "Deepak Rastogi",
      email: "deepak.rastogi@innovatecloud.test",
      phone: "+91 99887 11223",
      companyName: "Innovate Cloud Solutions Pvt Ltd",
      budget: "450000",
      formName: "Request Demo & Pricing",
      message: "We are evaluating NEXORA CRM for a 25-person sales and account management team. Need quotation for annual plan.",
      sourceUrl: "https://nexora.com/pricing",
      utm_source: "google_search",
      utm_medium: "cpc",
      utm_campaign: "crm_competitor_switch",
      submitted_at: new Date().toISOString(),
    };
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: "Website Forms connector active and ready to receive submissions.",
    };
  },
};
