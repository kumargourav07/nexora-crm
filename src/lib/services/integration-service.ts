import prisma from "@/lib/prisma";
import { EventStatus, IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { getAllConnectors, getConnector } from "../integrations/registry";
import { decryptSecret, encryptSecret, maskSecret, generateSecureToken } from "../integrations/crypto";
import { ingestLeadFromConnector, IngestionResult } from "./lead-service";
import { NormalizedLead, ConnectorHealth } from "../integrations/types";

export interface WorkspaceIntegrationView {
  id: string;
  provider: IntegrationProvider;
  name: string;
  description: string;
  category: string;
  status: IntegrationStatus;
  health: ConnectorHealth;
  leadsSyncedToday: number;
  totalSynced: number;
  lastSync: string | null;
  lastEventAt: string | null;
  lastError: string | null;
  webhookUrl: string | null;
  webhookSecret: string | null;
  maskedCredentials: Record<string, string>;
  config: Record<string, unknown>;
  defaultOwnerId: string | null;
  defaultOwnerName: string | null;
  requiredFields: unknown[];
  guideSteps: string[];
}

/**
 * Derives health status for an integration.
 */
export function deriveConnectorHealth(
  status: IntegrationStatus,
  lastError: string | null,
  lastEventAt: Date | null
): ConnectorHealth {
  if (status === IntegrationStatus.NOT_CONFIGURED) return "NOT_CONFIGURED";
  if (status === IntegrationStatus.DISCONNECTED) return "DISCONNECTED";
  if (status === IntegrationStatus.ERROR || lastError) return "WARNING";
  if (status === IntegrationStatus.CONNECTED) return "HEALTHY";
  return "NOT_CONFIGURED";
}

/**
 * Safely redacts sensitive keys (tokens, secrets, passwords) from raw payload for display in logs.
 */
export function redactSensitivePayload(rawPayload: string): string {
  if (!rawPayload) return "{}";
  try {
    const obj = JSON.parse(rawPayload);
    const redactObj = (target: unknown): unknown => {
      if (!target || typeof target !== "object") return target;
      if (Array.isArray(target)) return target.map(redactObj);
      const copy: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(target as Record<string, unknown>)) {
        const lowerKey = k.toLowerCase();
        if (
          lowerKey.includes("password") ||
          lowerKey.includes("secret") ||
          lowerKey.includes("token") ||
          lowerKey.includes("authorization") ||
          lowerKey.includes("api_key") ||
          lowerKey.includes("apikey") ||
          lowerKey.includes("appsecret") ||
          lowerKey.includes("key")
        ) {
          copy[k] = "[REDACTED]";
        } else if (typeof v === "object" && v !== null) {
          copy[k] = redactObj(v);
        } else {
          copy[k] = v;
        }
      }
      return copy;
    };
    return JSON.stringify(redactObj(obj), null, 2);
  } catch {
    return rawPayload
      .replace(/"(password|secret|token|key|auth|credential)[^"]*"\s*:\s*"[^"]*"/gi, '"$1": "[REDACTED]"')
      .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [REDACTED]");
  }
}

/**
 * Returns all available integration providers merged with the workspace's configuration status.
 */
export async function getWorkspaceIntegrations(
  workspaceId: string
): Promise<WorkspaceIntegrationView[]> {
  const dbIntegrations = await prisma.integration.findMany({
    where: { workspaceId },
  });

  const dbMap = new Map(dbIntegrations.map((i) => [i.provider, i]));
  const connectors = getAllConnectors();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nexora.app";

  return connectors.map((connector) => {
    const db = dbMap.get(connector.provider);

    let maskedCredentials: Record<string, string> = {};
    let configObj: Record<string, unknown> = {};

    if (db?.encryptedSecrets) {
      try {
        const decrypted = decryptSecret(db.encryptedSecrets);
        const parsed = JSON.parse(decrypted);
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string") {
            maskedCredentials[k] = maskSecret(v);
          }
        }
      } catch {
        maskedCredentials = { status: "encrypted" };
      }
    }

    if (db?.config) {
      try {
        configObj = JSON.parse(db.config);
      } catch {
        configObj = {};
      }
    }

    // Determine custom webhook URL
    let webhookUrl: string | null = null;
    if (connector.config.webhookSupported) {
      if (connector.provider === IntegrationProvider.FACEBOOK) {
        webhookUrl = `${baseUrl}/api/webhooks/facebook`;
      } else if (connector.provider === IntegrationProvider.WEBSITE) {
        webhookUrl = `${baseUrl}/api/webhooks/website`;
      } else if (connector.provider === IntegrationProvider.INDIAMART) {
        webhookUrl = `${baseUrl}/api/webhooks/indiamart`;
      } else if (connector.provider === IntegrationProvider.NINETY_NINE_ACRES) {
        webhookUrl = `${baseUrl}/api/webhooks/ninety-nine-acres`;
      } else if (connector.provider === IntegrationProvider.HOUSING) {
        webhookUrl = `${baseUrl}/api/webhooks/housing`;
      } else if (db?.id) {
        webhookUrl = `${baseUrl}/api/webhooks/custom/${db.id}`;
      } else {
        webhookUrl = `${baseUrl}/api/webhooks/custom/[configure-to-generate]`;
      }
    }

    const currentStatus = db?.status || IntegrationStatus.NOT_CONFIGURED;
    const health = deriveConnectorHealth(currentStatus, db?.lastError || null, db?.lastEventAt || null);

    return {
      id: db?.id || `unconfigured_${connector.provider}`,
      provider: connector.provider,
      name: connector.name,
      description: connector.description,
      category: connector.config.category,
      status: currentStatus,
      health,
      leadsSyncedToday: db?.leadsSyncedToday || 0,
      totalSynced: db?.totalSynced || 0,
      lastSync: db?.lastSync ? db.lastSync.toISOString() : null,
      lastEventAt: db?.lastEventAt ? db.lastEventAt.toISOString() : null,
      lastError: db?.lastError || null,
      webhookUrl: db?.webhookUrl || webhookUrl,
      webhookSecret: db?.webhookSecret || null,
      maskedCredentials,
      config: configObj,
      defaultOwnerId: db?.defaultOwnerId || null,
      defaultOwnerName: db?.defaultOwnerName || "Alex Chen",
      requiredFields: connector.config.requiredFields,
      guideSteps: connector.config.guideSteps,
    };
  });
}

/**
 * Returns single integration view by ID or Provider.
 */
export async function getIntegrationDetail(
  workspaceId: string,
  idOrProvider: string
): Promise<WorkspaceIntegrationView | null> {
  const all = await getWorkspaceIntegrations(workspaceId);
  const matched = all.find(
    (i) => i.id === idOrProvider || i.provider === idOrProvider.toUpperCase()
  );
  return matched || null;
}

/**
 * Returns workspace-wide integration summary KPIs.
 */
export async function getWorkspaceIntegrationSummary(workspaceId: string) {
  const integrations = await getWorkspaceIntegrations(workspaceId);
  const totalConnectors = integrations.length;
  const connected = integrations.filter((i) => i.status === IntegrationStatus.CONNECTED).length;
  const leadsSyncedToday = integrations.reduce((acc, curr) => acc + curr.leadsSyncedToday, 0);
  const totalSynced = integrations.reduce((acc, curr) => acc + curr.totalSynced, 0);

  const [failedCount, ignoredCount] = await Promise.all([
    prisma.integrationEvent.count({
      where: { workspaceId, status: EventStatus.FAILED },
    }),
    prisma.integrationEvent.count({
      where: { workspaceId, status: EventStatus.IGNORED },
    }),
  ]);

  return {
    totalConnectors,
    connected,
    leadsSyncedToday,
    totalSynced,
    failedEvents: failedCount,
    duplicateEvents: ignoredCount,
    healthScore: connected > 0 ? Math.round((connected / totalConnectors) * 100) : 0,
  };
}

/**
 * Saves/updates credentials (encrypted) and configuration for an integration.
 */
export async function configureIntegration(
  workspaceId: string,
  provider: IntegrationProvider,
  credentials: Record<string, string>,
  configData?: Record<string, unknown>,
  defaultOwnerId?: string,
  defaultOwnerName?: string
) {
  const connector = getConnector(provider);

  // Validate test connection
  const testResult = await connector.testConnection(credentials, configData);
  if (!testResult.success) {
    throw new Error(testResult.message);
  }

  const encryptedSecrets = encryptSecret(JSON.stringify(credentials));
  const configString = configData ? JSON.stringify(configData) : null;
  const webhookSecret = credentials.secretKey || credentials.appSecret || credentials.webhookSecret || generateSecureToken(16);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nexora.app";

  const integration = await prisma.integration.upsert({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider,
      },
    },
    create: {
      workspaceId,
      provider,
      status: IntegrationStatus.CONNECTED,
      encryptedSecrets,
      config: configString,
      webhookSecret,
      defaultOwnerId,
      defaultOwnerName: defaultOwnerName || "Alex Chen",
      lastError: null,
    },
    update: {
      status: IntegrationStatus.CONNECTED,
      encryptedSecrets,
      config: configString,
      webhookSecret,
      defaultOwnerId,
      defaultOwnerName: defaultOwnerName || "Alex Chen",
      lastError: null,
    },
  });

  // Set real webhook URL
  let finalWebhookUrl = `${baseUrl}/api/webhooks/custom/${integration.id}`;
  if (provider === IntegrationProvider.FACEBOOK) {
    finalWebhookUrl = `${baseUrl}/api/webhooks/facebook`;
  } else if (provider === IntegrationProvider.WEBSITE) {
    finalWebhookUrl = `${baseUrl}/api/webhooks/website`;
  } else if (provider === IntegrationProvider.INDIAMART) {
    finalWebhookUrl = `${baseUrl}/api/webhooks/indiamart`;
  } else if (provider === IntegrationProvider.NINETY_NINE_ACRES) {
    finalWebhookUrl = `${baseUrl}/api/webhooks/ninety-nine-acres`;
  } else if (provider === IntegrationProvider.HOUSING) {
    finalWebhookUrl = `${baseUrl}/api/webhooks/housing`;
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: { webhookUrl: finalWebhookUrl },
  });

  // Audit activity
  await prisma.activity.create({
    data: {
      workspaceId,
      type: "integration_configured",
      title: `${connector.name} Configured`,
      description: `Integration connection established and credentials verified.`,
      author: "System",
    },
  });

  return integration;
}

/**
 * Disconnects an integration and clears credentials.
 */
export async function disconnectIntegration(
  workspaceId: string,
  provider: IntegrationProvider
) {
  const existing = await prisma.integration.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider,
      },
    },
  });

  if (!existing) {
    throw new Error("Integration not found");
  }

  const updated = await prisma.integration.update({
    where: { id: existing.id },
    data: {
      status: IntegrationStatus.DISCONNECTED,
      encryptedSecrets: null,
      lastError: null,
    },
  });

  await prisma.activity.create({
    data: {
      workspaceId,
      type: "integration_disconnected",
      title: `${provider} Disconnected`,
      description: `Integration was disconnected. Inbound webhooks are now halted.`,
      author: "System",
    },
  });

  return updated;
}

/**
 * Sends a realistic live test lead through the entire normalization and ingestion pipeline.
 */
export async function sendTestLead(
  workspaceId: string,
  provider: IntegrationProvider,
  customData?: Partial<NormalizedLead>
): Promise<IngestionResult> {
  const connector = getConnector(provider);

  // 1. Get sample payload from connector
  const samplePayload = connector.generateSamplePayload();

  // 2. Fetch or create integration record
  let integration = await prisma.integration.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider,
      },
    },
  });

  if (!integration) {
    integration = await prisma.integration.create({
      data: {
        workspaceId,
        provider,
        status: IntegrationStatus.PENDING,
      },
    });
  }

  // 3. Create IntegrationEvent in RECEIVED status
  const event = await prisma.integrationEvent.create({
    data: {
      workspaceId,
      integrationId: integration.id,
      provider,
      eventType: "test_lead_simulated",
      payload: JSON.stringify(samplePayload),
      status: EventStatus.RECEIVED,
    },
  });

  // 4. Normalize sample payload
  const normalized = await connector.normalize(samplePayload);
  if (!normalized || normalized.length === 0) {
    throw new Error("Sample payload could not be normalized");
  }

  const leadToIngest = {
    ...normalized[0],
    ...customData,
    // Add unique test suffix so test runs don't collide if desired
    externalId: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
  };

  // 5. Ingest into database
  const result = await ingestLeadFromConnector(
    workspaceId,
    integration.id,
    provider,
    leadToIngest,
    event.id
  );

  return result;
}

/**
 * Fetches recent integration events with pagination and filters.
 */
export async function getIntegrationEvents(
  workspaceId: string,
  options?: {
    page?: number;
    limit?: number;
    provider?: IntegrationProvider;
    status?: EventStatus;
    search?: string;
  }
) {
  const page = Math.max(1, options?.page || 1);
  const limit = Math.min(100, Math.max(1, options?.limit || 50));
  const skip = (page - 1) * limit;

  const where: {
    workspaceId: string;
    provider?: IntegrationProvider;
    status?: EventStatus;
    OR?: Array<{ [key: string]: unknown }>;
  } = { workspaceId };

  if (options?.provider) where.provider = options.provider;
  if (options?.status) where.status = options.status;

  if (options?.search && options.search.trim()) {
    const term = options.search.trim();
    where.OR = [
      { eventType: { contains: term, mode: "insensitive" } },
      { errorMessage: { contains: term, mode: "insensitive" } },
      { lead: { name: { contains: term, mode: "insensitive" } } },
      { lead: { email: { contains: term, mode: "insensitive" } } },
      { lead: { company: { contains: term, mode: "insensitive" } } },
    ];
  }

  const [total, events] = await Promise.all([
    prisma.integrationEvent.count({ where }),
    prisma.integrationEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            company: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return {
    events: events.map((e) => ({
      id: e.id,
      provider: e.provider,
      eventType: e.eventType,
      status: e.status,
      errorMessage: e.errorMessage,
      payloadRedacted: redactSensitivePayload(e.payload),
      leadId: e.leadId,
      lead: e.lead,
      createdAt: e.createdAt.toISOString(),
      processedAt: e.processedAt ? e.processedAt.toISOString() : null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
