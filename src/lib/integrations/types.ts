import { IntegrationProvider, LeadSource } from "@prisma/client";

export type ConnectorCapability = "WEBHOOK" | "PULL_SYNC" | "OAUTH" | "API_KEY" | "MANUAL_IMPORT";

export type ConnectorHealth = "HEALTHY" | "WARNING" | "DISCONNECTED" | "NOT_CONFIGURED";

export interface NormalizedLead {
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: LeadSource;
  externalId: string;
  value?: number;
  notes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  ownerName?: string;
  // UTM & Attribution Tracking
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
}

export interface VerificationResult {
  isValid: boolean;
  error?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ConfigField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  placeholder?: string;
  description?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

export interface ConnectorConfig {
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: "Advertising" | "B2B Marketplace" | "Real Estate" | "Inbound" | "Messaging" | "Custom";
  capabilities?: ConnectorCapability[];
  requiredFields: ConfigField[];
  webhookSupported: boolean;
  pollingSupported: boolean;
  supportsTestLead: boolean;
  guideSteps: string[];
}

export interface LeadConnector {
  provider: IntegrationProvider;
  name: string;
  description: string;
  config: ConnectorConfig;

  /**
   * Validates incoming webhook authenticity, signature, or token.
   */
  verifyWebhook(
    payload: string,
    headers: Record<string, string | string[] | undefined>,
    secret?: string | null
  ): Promise<VerificationResult> | VerificationResult;

  /**
   * Normalizes arbitrary third-party payload into standard NormalizedLead array.
   */
  normalize(
    payload: unknown,
    integrationConfig?: Record<string, unknown>
  ): Promise<NormalizedLead[]> | NormalizedLead[];

  /**
   * Generates a sample mock payload for testing and documentation.
   */
  generateSamplePayload(): Record<string, unknown>;

  /**
   * Tests connection with provider using credentials.
   */
  testConnection(
    credentials: Record<string, string>,
    integrationConfig?: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }>;

  /**
   * Optional lead pull/fetch method for polling providers.
   */
  fetchLeads?(
    credentials: Record<string, string>,
    since?: Date
  ): Promise<{ leads: NormalizedLead[]; rawCount: number }>;
}
