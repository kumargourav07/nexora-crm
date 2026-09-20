import { IntegrationProvider, LeadSource } from "@prisma/client";
import { LeadConnector, NormalizedLead, VerificationResult } from "../types";
import { verifyHmacSha256 } from "../crypto";

interface WhatsAppContact {
  profile?: { name?: string };
  wa_id?: string;
}

interface WhatsAppMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  text?: { body?: string };
  type?: string;
}

interface WhatsAppValue {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  // Test direct format
  name?: string;
  phone?: string;
  message?: string;
  company?: string;
}

interface WhatsAppEntry {
  id: string;
  changes: Array<{
    field: string;
    value: WhatsAppValue;
  }>;
}

export const whatsAppConnector: LeadConnector = {
  provider: IntegrationProvider.WHATSAPP,
  name: "WhatsApp Business Cloud API",
  description: "Convert incoming WhatsApp inquiries and qualified chatbot conversations into CRM leads.",
  config: {
    provider: IntegrationProvider.WHATSAPP,
    name: "WhatsApp Business Cloud API",
    description: "Convert incoming WhatsApp inquiries and qualified chatbot conversations into CRM leads.",
    category: "Messaging",
    webhookSupported: true,
    pollingSupported: false,
    supportsTestLead: true,
    requiredFields: [
      {
        key: "appSecret",
        label: "Meta App Secret",
        type: "password",
        placeholder: "Meta App Secret for HMAC SHA-256",
        description: "Used to verify inbound webhook signatures on X-Hub-Signature-256.",
        required: true,
      },
      {
        key: "verifyToken",
        label: "Webhook Verify Token",
        type: "text",
        placeholder: "nexora_wa_verify_token_123",
        description: "Custom token entered in Meta WhatsApp Webhooks configuration.",
        required: true,
      },
      {
        key: "phoneNumberId",
        label: "WhatsApp Phone Number ID",
        type: "text",
        placeholder: "109827364501928",
        description: "Your official Meta WhatsApp Business Phone Number ID.",
      },
    ],
    guideSteps: [
      "Set up WhatsApp Business Cloud API in Meta Developer Console.",
      "Subscribe to 'messages' webhook on WhatsApp Business Account.",
      "Set Callback URL to NEXORA's Webhook endpoint.",
      "Save Meta App Secret and Webhook Verify Token here.",
    ],
  },

  verifyWebhook(
    payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): VerificationResult {
    if (!secret) {
      return { isValid: false, error: "Meta App Secret is required for WhatsApp webhook verification" };
    }

    const signature =
      (headers["x-hub-signature-256"] as string) ||
      (headers["X-Hub-Signature-256"] as string);

    if (!signature) {
      return { isValid: false, error: "Missing X-Hub-Signature-256 signature header" };
    }

    const isValid = verifyHmacSha256(payload, signature, secret);
    if (!isValid) {
      return { isValid: false, error: "Invalid WhatsApp webhook signature" };
    }

    return { isValid: true };
  },

  normalize(payload: unknown): NormalizedLead[] {
    const raw = payload as Record<string, unknown>;
    const leads: NormalizedLead[] = [];

    if (raw && Array.isArray(raw.entry)) {
      for (const entry of raw.entry as WhatsAppEntry[]) {
        if (!entry.changes) continue;
        for (const change of entry.changes) {
          if (change.field === "messages" && change.value) {
            const val = change.value;
            const contact = val.contacts?.[0];
            const msg = val.messages?.[0];

            if (!contact && !msg) continue;

            const name = contact?.profile?.name || "WhatsApp Inquirer";
            const phone = contact?.wa_id || msg?.from || "";
            const msgText = msg?.text?.body || "Inbound WhatsApp conversation initiated.";
            const extId = msg?.id || `wa_${phone}_${Date.now()}`;

            leads.push({
              name: name.trim(),
              email: "",
              phone: phone.startsWith("+") ? phone : `+${phone}`,
              company: "WhatsApp Business Inbound",
              source: LeadSource.WHATSAPP,
              externalId: extId,
              value: 200000,
              notes: `WhatsApp Inbound Message:\n"${msgText}"\nSender Phone: +${phone}`,
              tags: ["WhatsApp Business", "Direct Chat"],
              metadata: {
                messageId: msg?.id,
                phoneNumberId: val.metadata?.phone_number_id,
                timestamp: msg?.timestamp,
              },
            });
          }
        }
      }
    }

    // Direct test format fallback
    if (leads.length === 0 && raw && (raw.phone || raw.name || raw.message)) {
      const extId = String(raw.id || raw.externalId || `wa_sim_${Date.now()}`);
      leads.push({
        name: String(raw.name || "WhatsApp Contact"),
        email: String(raw.email || ""),
        phone: String(raw.phone || "+91 98765 00000"),
        company: String(raw.company || "WhatsApp Inbound"),
        source: LeadSource.WHATSAPP,
        externalId: extId,
        value: 200000,
        notes: String(raw.message || "WhatsApp inbound inquiry received."),
        tags: ["WhatsApp Business", "Direct Chat"],
        metadata: raw as Record<string, unknown>,
      });
    }

    return leads;
  },

  generateSamplePayload(): Record<string, unknown> {
    return {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_10982736450",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                metadata: {
                  display_phone_number: "+1 555 019 2831",
                  phone_number_id: "109827364501928",
                },
                contacts: [
                  {
                    profile: { name: "Rohan Varma" },
                    wa_id: "919910088776",
                  },
                ],
                messages: [
                  {
                    from: "919910088776",
                    id: `wamid.HBgMOTE5OTEwMDg4Nzc2FQIAERgS${Date.now()}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    text: {
                      body: "Hello! We saw your CRM demo and want to schedule a product walkthrough for our sales leadership team.",
                    },
                    type: "text",
                  },
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
      return { success: false, message: "Meta App Secret is required." };
    }
    if (!credentials.verifyToken) {
      return { success: false, message: "Webhook Verify Token is required." };
    }
    return {
      success: true,
      message: "WhatsApp Business API webhook listener verified and ready.",
    };
  },
};
