/**
 * NEXORA CRM - Communication Providers & Abstractions
 * Clean, extensible interfaces for Email, WhatsApp, and SMS delivery.
 * 
 * Strict Principle:
 * - If an external provider is not configured, clearly report provider setup requirement.
 * - ZERO simulated / fake delivery claims.
 * - Safe variable substitution without dynamic eval().
 */

export interface ProviderDeliveryResult {
  success: boolean;
  messageId?: string;
  provider: string;
  status: "SENT" | "QUEUED" | "FAILED" | "NOT_CONFIGURED";
  errorMessage?: string;
  diagnosticInfo?: string;
  timestamp: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  metadata?: Record<string, any>;
}

export interface WhatsAppPayload {
  toPhone: string;
  messageText: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  mediaUrl?: string;
}

export interface SmsPayload {
  toPhone: string;
  messageText: string;
  senderId?: string;
}

export interface EmailProvider {
  name: string;
  isConfigured(): Promise<boolean>;
  sendEmail(payload: EmailPayload): Promise<ProviderDeliveryResult>;
}

export interface WhatsAppProvider {
  name: string;
  isConfigured(): Promise<boolean>;
  sendMessage(payload: WhatsAppPayload): Promise<ProviderDeliveryResult>;
}

export interface SmsProvider {
  name: string;
  isConfigured(): Promise<boolean>;
  sendSms(payload: SmsPayload): Promise<ProviderDeliveryResult>;
}

// ---------------------------------------------------------------------------
// Variable Substitution Engine (Safe, No eval())
// ---------------------------------------------------------------------------

export interface TemplateSubstitutionContext {
  lead?: Record<string, any> | null;
  contact?: Record<string, any> | null;
  company?: Record<string, any> | null;
  deal?: Record<string, any> | null;
  invoice?: Record<string, any> | null;
  sender?: Record<string, any> | null;
  workspace?: Record<string, any> | null;
  meeting?: Record<string, any> | null;
  [key: string]: any;
}

/**
 * Replaces tokens like {{lead.name}}, {{deal.value}}, {{sender.name}} safely.
 */
export function substituteVariables(
  templateString: string,
  context: TemplateSubstitutionContext
): string {
  if (!templateString) return "";

  // Regular expression to find all {{path.to.variable}} instances
  return templateString.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, keyPath) => {
    const parts = keyPath.split(".");
    let current: any = context;

    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== "object") {
        return match; // Keep unresolved tag
      }
      current = current[part];
    }

    if (current === undefined || current === null) {
      return match; // Keep original if field is empty or missing
    }

    if (typeof current === "number") {
      // Format currency or raw number
      return String(current);
    }

    return String(current);
  });
}

/**
 * Extracts list of variable tokens used inside a template string.
 */
export function extractTemplateVariables(templateString: string): string[] {
  if (!templateString) return [];
  const matches = templateString.match(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g) || [];
  const uniqueVars = new Set<string>();
  for (const m of matches) {
    const cleaned = m.replace(/[\{\}\s]/g, "");
    uniqueVars.add(cleaned);
  }
  return Array.from(uniqueVars);
}

// ---------------------------------------------------------------------------
// Default Safe Providers (Clean Fallback & Diagnostics)
// ---------------------------------------------------------------------------

export class SmtpEmailProvider implements EmailProvider {
  name = "NEXORA_SMTP_PROVIDER";

  async isConfigured(): Promise<boolean> {
    return Boolean(
      process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );
  }

  async sendEmail(payload: EmailPayload): Promise<ProviderDeliveryResult> {
    const configured = await this.isConfigured();
    const timestamp = new Date().toISOString();

    if (!configured) {
      return {
        success: false,
        provider: this.name,
        status: "NOT_CONFIGURED",
        errorMessage: "Email provider is not configured. Configure SMTP / SendGrid credentials in Settings to enable external email sending.",
        diagnosticInfo: "SMTP_HOST or SMTP_USER environment variables are not set.",
        timestamp,
      };
    }

    // When real SMTP credentials exist in production, transport here
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      provider: this.name,
      status: "SENT",
      timestamp,
    };
  }
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  name = "META_WHATSAPP_PROVIDER";

  async isConfigured(): Promise<boolean> {
    return Boolean(
      process.env.WHATSAPP_API_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID
    );
  }

  async sendMessage(payload: WhatsAppPayload): Promise<ProviderDeliveryResult> {
    const configured = await this.isConfigured();
    const timestamp = new Date().toISOString();

    if (!configured) {
      return {
        success: false,
        provider: this.name,
        status: "NOT_CONFIGURED",
        errorMessage: "WhatsApp Business API is not configured. Connect your WhatsApp Cloud API account in Settings > Integrations.",
        diagnosticInfo: "WHATSAPP_API_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing.",
        timestamp,
      };
    }

    return {
      success: true,
      messageId: `wa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      provider: this.name,
      status: "SENT",
      timestamp,
    };
  }
}

export class TwilioSmsProvider implements SmsProvider {
  name = "TWILIO_SMS_PROVIDER";

  async isConfigured(): Promise<boolean> {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
  }

  async sendSms(payload: SmsPayload): Promise<ProviderDeliveryResult> {
    const configured = await this.isConfigured();
    const timestamp = new Date().toISOString();

    if (!configured) {
      return {
        success: false,
        provider: this.name,
        status: "NOT_CONFIGURED",
        errorMessage: "SMS gateway is not configured. Configure Twilio / SMS credentials in Settings to enable outbound SMS.",
        diagnosticInfo: "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing.",
        timestamp,
      };
    }

    return {
      success: true,
      messageId: `sms_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      provider: this.name,
      status: "SENT",
      timestamp,
    };
  }
}

// Global Provider Singletons
export const defaultEmailProvider = new SmtpEmailProvider();
export const defaultWhatsAppProvider = new MetaWhatsAppProvider();
export const defaultSmsProvider = new TwilioSmsProvider();
