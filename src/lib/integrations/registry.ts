import { IntegrationProvider } from "@prisma/client";
import { LeadConnector } from "./types";
import { facebookConnector } from "./adapters/facebook";
import { indiamartConnector } from "./adapters/indiamart";
import { ninetyNineAcresConnector } from "./adapters/ninety-nine-acres";
import { housingConnector } from "./adapters/housing";
import { websiteConnector } from "./adapters/website";
import { customWebhookConnector } from "./adapters/custom-webhook";
import { googleAdsConnector } from "./adapters/google-ads";
import { whatsAppConnector } from "./adapters/whatsapp";

const CONNECTORS: Record<IntegrationProvider, LeadConnector> = {
  [IntegrationProvider.FACEBOOK]: facebookConnector,
  [IntegrationProvider.INDIAMART]: indiamartConnector,
  [IntegrationProvider.NINETY_NINE_ACRES]: ninetyNineAcresConnector,
  [IntegrationProvider.HOUSING]: housingConnector,
  [IntegrationProvider.WEBSITE]: websiteConnector,
  [IntegrationProvider.CUSTOM_API]: customWebhookConnector,
  [IntegrationProvider.GOOGLE_ADS]: googleAdsConnector,
  [IntegrationProvider.WHATSAPP]: whatsAppConnector,
};

/**
 * Returns the LeadConnector implementation for a given provider.
 */
export function getConnector(provider: IntegrationProvider): LeadConnector {
  const connector = CONNECTORS[provider];
  if (!connector) {
    throw new Error(`Unsupported integration provider: ${provider}`);
  }
  return connector;
}

/**
 * Returns list of all available connector providers and metadata.
 */
export function getAllConnectors(): LeadConnector[] {
  return Object.values(CONNECTORS);
}
