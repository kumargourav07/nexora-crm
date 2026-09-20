import prisma from "@/lib/prisma";
import { EventStatus, IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { getConnector } from "../integrations/registry";
import { decryptSecret } from "../integrations/crypto";
import { ingestLeadFromConnector, IngestionResult } from "./lead-service";

export interface WebhookProcessResult {
  success: boolean;
  statusCode: number;
  message: string;
  eventId?: string;
  results?: IngestionResult[];
}

/**
 * Universally processes incoming webhook requests for all providers.
 */
export async function processIncomingWebhook(
  workspaceId: string,
  provider: IntegrationProvider,
  rawPayload: string,
  headers: Record<string, string | string[] | undefined>,
  integrationId?: string
): Promise<WebhookProcessResult> {
  const connector = getConnector(provider);

  // 1. Find integration
  let integration = null;
  if (integrationId) {
    integration = await prisma.integration.findUnique({
      where: { id: integrationId },
    });
  } else {
    integration = await prisma.integration.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider,
        },
      },
    });
  }

  // 2. Parse JSON payload
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(rawPayload);
  } catch {
    return {
      success: false,
      statusCode: 400,
      message: "Malformed JSON payload in request body",
    };
  }

  // 3. Extract secrets if integration is configured
  let secretKey: string | null = null;
  if (integration && integration.encryptedSecrets) {
    try {
      const decrypted = decryptSecret(integration.encryptedSecrets);
      const creds = JSON.parse(decrypted);
      secretKey = creds.secretKey || creds.appSecret || creds.glusrCrmKey || creds.apiKey || creds.webhookSecret || creds.googleKey || null;
    } catch (e) {
      console.error(`[WebhookService] Failed to decrypt secrets for ${provider}:`, e);
    }
  }

  // Fallback to integration.webhookSecret if present
  if (!secretKey && integration?.webhookSecret) {
    secretKey = integration.webhookSecret;
  }

  // 4. Create IntegrationEvent log record in RECEIVED status
  const event = await prisma.integrationEvent.create({
    data: {
      workspaceId,
      integrationId: integration?.id || null,
      provider,
      eventType: "webhook_inbound",
      payload: rawPayload,
      status: EventStatus.RECEIVED,
    },
  });

  // 5. Verify webhook signature/authenticity
  // Skip verification if connector allows public submissions (like internal website forms without mandatory secret)
  const isWebsiteForm = provider === IntegrationProvider.WEBSITE;
  if (!isWebsiteForm && secretKey) {
    const verification = await connector.verifyWebhook(rawPayload, headers, secretKey);
    if (!verification.isValid) {
      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: EventStatus.FAILED,
          errorMessage: verification.error || "Authentication / Signature verification failed",
          processedAt: new Date(),
        },
      });

      if (integration) {
        await prisma.integration.update({
          where: { id: integration.id },
          data: {
            lastError: verification.error || "Signature verification failed",
            status: IntegrationStatus.ERROR,
          },
        });
      }

      return {
        success: false,
        statusCode: 401,
        message: verification.error || "Webhook signature verification failed",
        eventId: event.id,
      };
    }
  }

  // 6. Update event to PROCESSING
  await prisma.integrationEvent.update({
    where: { id: event.id },
    data: { status: EventStatus.PROCESSING },
  });

  // 7. Parse integration config if present
  let integrationConfig: Record<string, unknown> = {};
  if (integration?.config) {
    try {
      integrationConfig = JSON.parse(integration.config);
    } catch {
      integrationConfig = {};
    }
  }

  // 8. Normalize payload to standard NormalizedLead[]
  try {
    const normalizedLeads = await connector.normalize(parsedPayload, integrationConfig);

    if (!normalizedLeads || normalizedLeads.length === 0) {
      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: EventStatus.IGNORED,
          errorMessage: "Payload normalized to 0 leads (e.g. non-leadgen webhook event)",
          processedAt: new Date(),
        },
      });
      return {
        success: true,
        statusCode: 200,
        message: "Webhook event processed (no leads to ingest)",
        eventId: event.id,
        results: [],
      };
    }

    // 9. Ingest normalized leads
    const results: IngestionResult[] = [];
    for (const leadData of normalizedLeads) {
      const result = await ingestLeadFromConnector(
        workspaceId,
        integration?.id || null,
        provider,
        leadData,
        event.id
      );
      results.push(result);
    }

    // 10. Update Integration status to CONNECTED if currently in PENDING/NOT_CONFIGURED/ERROR
    if (integration && integration.status !== IntegrationStatus.CONNECTED) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          status: IntegrationStatus.CONNECTED,
          lastError: null,
        },
      });
    }

    return {
      success: true,
      statusCode: 200,
      message: `Successfully processed ${results.length} lead(s)`,
      eventId: event.id,
      results,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown ingestion error";
    await prisma.integrationEvent.update({
      where: { id: event.id },
      data: {
        status: EventStatus.FAILED,
        errorMessage: errorMsg,
        processedAt: new Date(),
      },
    });

    if (integration) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastError: errorMsg,
          status: IntegrationStatus.ERROR,
        },
      });
    }

    return {
      success: false,
      statusCode: 500,
      message: `Ingestion failed: ${errorMsg}`,
      eventId: event.id,
    };
  }
}

/**
 * Re-runs ingestion on a previously failed or ignored event.
 */
export async function retryFailedEvent(
  workspaceId: string,
  eventId: string
): Promise<WebhookProcessResult> {
  const event = await prisma.integrationEvent.findFirst({
    where: { id: eventId, workspaceId },
  });

  if (!event) {
    return {
      success: false,
      statusCode: 404,
      message: "Event not found or access denied",
    };
  }

  const connector = getConnector(event.provider);
  let parsedPayload: unknown;
  try {
    parsedPayload = JSON.parse(event.payload);
  } catch {
    return {
      success: false,
      statusCode: 400,
      message: "Event payload contains invalid JSON",
    };
  }

  // Update status to PROCESSING
  await prisma.integrationEvent.update({
    where: { id: event.id },
    data: { status: EventStatus.PROCESSING, errorMessage: null },
  });

  try {
    const normalizedLeads = await connector.normalize(parsedPayload);
    const results: IngestionResult[] = [];

    for (const leadData of normalizedLeads) {
      const res = await ingestLeadFromConnector(
        workspaceId,
        event.integrationId,
        event.provider,
        leadData,
        event.id
      );
      results.push(res);
    }

    return {
      success: true,
      statusCode: 200,
      message: `Event reprocessed successfully (${results.length} leads)`,
      eventId: event.id,
      results,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Retry failed";
    await prisma.integrationEvent.update({
      where: { id: event.id },
      data: {
        status: EventStatus.FAILED,
        errorMessage: errorMsg,
        processedAt: new Date(),
      },
    });
    return {
      success: false,
      statusCode: 500,
      message: `Retry error: ${errorMsg}`,
      eventId: event.id,
    };
  }
}
