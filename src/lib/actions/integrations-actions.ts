"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { createAuditLog } from "@/lib/services/audit-service";
import {
  getWorkspaceIntegrations,
  getIntegrationDetail,
  getWorkspaceIntegrationSummary,
  configureIntegration,
  disconnectIntegration,
  sendTestLead,
  getIntegrationEvents,
  redactSensitivePayload,
} from "@/lib/services/integration-service";
import { retryFailedEvent } from "@/lib/services/webhook-service";
import { getConnector } from "@/lib/integrations/registry";
import { EventStatus, IntegrationProvider, IntegrationStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NormalizedLead } from "../integrations/types";
import prisma from "@/lib/prisma";

const INTEGRATION_METADATA: Record<
  IntegrationProvider,
  {
    name: string;
    shortName: string;
    category: "LEAD SOURCE" | "MARKETPLACE" | "PROPERTY" | "MARKETING" | "WEBSITE" | "COMMUNICATION" | "DEVELOPER";
    iconColor: string;
    avatarBg: string;
    accentBorder: string;
  }
> = {
  FACEBOOK: {
    name: "Facebook & Instagram Ads",
    shortName: "Meta Lead Ads",
    category: "MARKETING",
    iconColor: "text-blue-400",
    avatarBg: "bg-blue-600/15",
    accentBorder: "border-blue-500/20",
  },
  INDIAMART: {
    name: "IndiaMART B2B Marketplace",
    shortName: "IndiaMART Leads",
    category: "MARKETPLACE",
    iconColor: "text-emerald-400",
    avatarBg: "bg-emerald-600/15",
    accentBorder: "border-emerald-500/20",
  },
  NINETY_NINE_ACRES: {
    name: "99acres Property Portal",
    shortName: "99acres Sync",
    category: "PROPERTY",
    iconColor: "text-sky-400",
    avatarBg: "bg-sky-600/15",
    accentBorder: "border-sky-500/20",
  },
  HOUSING: {
    name: "Housing.com & Makaan",
    shortName: "Housing.com",
    category: "PROPERTY",
    iconColor: "text-rose-400",
    avatarBg: "bg-rose-600/15",
    accentBorder: "border-rose-500/20",
  },
  GOOGLE_ADS: {
    name: "Google Search & Discovery Ads",
    shortName: "Google Ads",
    category: "MARKETING",
    iconColor: "text-amber-400",
    avatarBg: "bg-amber-600/15",
    accentBorder: "border-amber-500/20",
  },
  WEBSITE: {
    name: "Website Embedded Forms",
    shortName: "Web Forms",
    category: "WEBSITE",
    iconColor: "text-indigo-400",
    avatarBg: "bg-indigo-600/15",
    accentBorder: "border-indigo-500/20",
  },
  WHATSAPP: {
    name: "WhatsApp Cloud Business API",
    shortName: "WhatsApp Bot",
    category: "COMMUNICATION",
    iconColor: "text-green-400",
    avatarBg: "bg-green-600/15",
    accentBorder: "border-green-500/20",
  },
  CUSTOM_API: {
    name: "Custom Inbound Webhooks",
    shortName: "REST Webhook",
    category: "DEVELOPER",
    iconColor: "text-purple-400",
    avatarBg: "bg-purple-600/15",
    accentBorder: "border-purple-500/20",
  },
};

/**
 * Retrieves all integration states with configuration, live webhook URLs, and sync statistics.
 * Requires `integrations.read` permission.
 */
export async function getIntegrationsAction() {
  try {
    const { workspaceId, role } = await requirePermission("integrations.read");
    const [integrationViews, summary] = await Promise.all([
      getWorkspaceIntegrations(workspaceId),
      getWorkspaceIntegrationSummary(workspaceId),
    ]);

    const integrations = integrationViews.map((item) => {
      const meta = INTEGRATION_METADATA[item.provider] || {
        name: item.name,
        shortName: item.name,
        category: "DEVELOPER",
        iconColor: "text-primary",
        avatarBg: "bg-primary/15",
        accentBorder: "border-primary/20",
      };
      return {
        ...item,
        shortName: meta.shortName,
        iconColor: meta.iconColor,
        avatarBg: meta.avatarBg,
        accentBorder: meta.accentBorder,
        isConnected: item.status === IntegrationStatus.CONNECTED,
      };
    });

    return {
      success: true,
      data: {
        integrations,
        summary,
        currentUserRole: role,
        connectedCount: summary.connected,
        totalSyncedToday: summary.leadsSyncedToday,
      },
    };
  } catch (err) {
    console.error("getIntegrationsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load integrations",
      data: {
        integrations: [],
        summary: {
          totalConnectors: 0,
          connected: 0,
          leadsSyncedToday: 0,
          totalSynced: 0,
          failedEvents: 0,
          duplicateEvents: 0,
          healthScore: 0,
        },
        connectedCount: 0,
        totalSyncedToday: 0,
      },
    };
  }
}

/**
 * Retrieves single integration detail by ID or Provider.
 * Requires `integrations.read` permission.
 */
export async function getIntegrationByIdAction(idOrProvider: string) {
  try {
    const { workspaceId, role } = await requirePermission("integrations.read");
    const detail = await getIntegrationDetail(workspaceId, idOrProvider);
    if (!detail) {
      return { success: false, error: "Integration not found" };
    }

    const meta = INTEGRATION_METADATA[detail.provider] || {
      name: detail.name,
      shortName: detail.name,
      category: "DEVELOPER",
      iconColor: "text-primary",
      avatarBg: "bg-primary/15",
      accentBorder: "border-primary/20",
    };

    // Fetch recent events for this connector
    const recentEvents = await prisma.integrationEvent.findMany({
      where: { workspaceId, provider: detail.provider },
      orderBy: { createdAt: "desc" },
      take: 10,
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
    });

    const connector = getConnector(detail.provider);
    const samplePayload = connector.generateSamplePayload();

    return {
      success: true,
      data: {
        integration: {
          ...detail,
          shortName: meta.shortName,
          iconColor: meta.iconColor,
          avatarBg: meta.avatarBg,
          accentBorder: meta.accentBorder,
          isConnected: detail.status === IntegrationStatus.CONNECTED,
        },
        samplePayload,
        recentEvents: recentEvents.map((e) => ({
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
        currentUserRole: role,
      },
    };
  } catch (err) {
    console.error("getIntegrationByIdAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unable to load integration details",
    };
  }
}

/**
 * Tests connection with provider using credentials before saving.
 * Requires `integrations.connect` permission.
 */
export async function testConnectionAction(
  provider: IntegrationProvider,
  credentials: Record<string, string>,
  config?: Record<string, unknown>
) {
  try {
    await requirePermission("integrations.connect");
    const connector = getConnector(provider);
    const result = await connector.testConnection(credentials, config);
    return result;
  } catch (err) {
    console.error("testConnectionAction error:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Connection test failed",
    };
  }
}

/**
 * Saves and validates integration credentials with AES-256-GCM encryption.
 * Requires `integrations.create` / `integrations.update` permission.
 */
export async function configureIntegrationAction(
  provider: IntegrationProvider,
  credentials: Record<string, string>,
  config?: Record<string, unknown>,
  defaultOwnerId?: string,
  defaultOwnerName?: string
) {
  try {
    const { workspaceId, userId } = await requirePermission("integrations.create");

    const result = await configureIntegration(
      workspaceId,
      provider,
      credentials,
      config,
      defaultOwnerId,
      defaultOwnerName
    );

    // Audit Log (Credentials explicitly stripped by createAuditLog)
    await createAuditLog({
      workspaceId,
      userId,
      action: "INTEGRATION_CONFIGURED",
      entityType: "INTEGRATION",
      entityId: result.id,
      metadata: {
        provider,
        status: result.status,
        hasDefaultOwner: !!defaultOwnerId,
      },
    });

    revalidatePath("/app/integrations");
    revalidatePath(`/app/integrations/${provider.toLowerCase()}`);
    revalidatePath("/app/dashboard");
    revalidatePath("/app/leads");
    revalidatePath("/app/settings/audit-log");

    return { success: true, data: { id: result.id, status: result.status } };
  } catch (err) {
    console.error("configureIntegrationAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to configure integration",
    };
  }
}

/**
 * Disconnects an integration and revokes credentials.
 * Requires `integrations.disconnect` / `integrations.delete` permission.
 */
export async function disconnectIntegrationAction(provider: IntegrationProvider) {
  try {
    const { workspaceId, userId } = await requirePermission("integrations.disconnect");
    await disconnectIntegration(workspaceId, provider);

    await createAuditLog({
      workspaceId,
      userId,
      action: "INTEGRATION_DISCONNECTED",
      entityType: "INTEGRATION",
      metadata: {
        provider,
      },
    });

    revalidatePath("/app/integrations");
    revalidatePath(`/app/integrations/${provider.toLowerCase()}`);
    revalidatePath("/app/dashboard");
    revalidatePath("/app/settings/audit-log");

    return { success: true };
  } catch (err) {
    console.error("disconnectIntegrationAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to disconnect integration",
    };
  }
}

/**
 * Executes an end-to-end live test lead injection through real normalization and DB ingestion.
 * Requires `integrations.create` permission.
 */
export async function sendTestLeadAction(
  provider: IntegrationProvider,
  customData?: Partial<NormalizedLead>
) {
  try {
    const { workspaceId, userId } = await requirePermission("integrations.create");
    const result = await sendTestLead(workspaceId, provider, customData);

    await createAuditLog({
      workspaceId,
      userId,
      action: "INTEGRATION_TEST_EXECUTED",
      entityType: "INTEGRATION",
      metadata: {
        provider,
        leadId: result.leadId,
        isNew: result.isNew,
        isDuplicate: result.isDuplicate,
      },
    });

    revalidatePath("/app/integrations");
    revalidatePath(`/app/integrations/${provider.toLowerCase()}`);
    revalidatePath("/app/integrations/logs");
    revalidatePath("/app/leads");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/dashboard");

    return { success: true, result };
  } catch (err) {
    console.error("sendTestLeadAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Test lead ingestion failed",
    };
  }
}

/**
 * Fetches paginated integration events with advanced filters.
 * Requires `integration_logs.read` permission.
 */
export async function getIntegrationLogsAction(params: {
  page?: number;
  limit?: number;
  provider?: IntegrationProvider;
  status?: EventStatus;
  search?: string;
} = {}) {
  try {
    const { workspaceId } = await requirePermission("integration_logs.read");
    const result = await getIntegrationEvents(workspaceId, params);
    return { success: true, data: result };
  } catch (err) {
    console.error("getIntegrationLogsAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load integration logs",
      data: { events: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } },
    };
  }
}

/**
 * Fetches recent audit events for the workspace integration activity log.
 * Requires `integration_logs.read` permission.
 */
export async function getIntegrationEventsAction(
  limit = 50,
  provider?: IntegrationProvider,
  status?: EventStatus
) {
  try {
    const { workspaceId } = await requirePermission("integration_logs.read");
    const result = await getIntegrationEvents(workspaceId, { limit, provider, status });
    return { success: true, data: result.events };
  } catch (err) {
    console.error("getIntegrationEventsAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load events", data: [] };
  }
}

/**
 * Fetches a single event with redacted payload and full metadata.
 * Requires `integration_logs.read` permission.
 */
export async function getIntegrationLogByIdAction(eventId: string) {
  try {
    const { workspaceId } = await requirePermission("integration_logs.read");
    const event = await prisma.integrationEvent.findFirst({
      where: { id: eventId, workspaceId },
      include: {
        lead: true,
        integration: true,
      },
    });

    if (!event) {
      return { success: false, error: "Event not found" };
    }

    return {
      success: true,
      data: {
        id: event.id,
        provider: event.provider,
        eventType: event.eventType,
        status: event.status,
        errorMessage: event.errorMessage,
        payloadRedacted: redactSensitivePayload(event.payload),
        leadId: event.leadId,
        lead: event.lead,
        integration: event.integration ? {
          id: event.integration.id,
          provider: event.integration.provider,
          status: event.integration.status,
        } : null,
        createdAt: event.createdAt.toISOString(),
        processedAt: event.processedAt ? event.processedAt.toISOString() : null,
      },
    };
  } catch (err) {
    console.error("getIntegrationLogByIdAction error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Failed to load log detail" };
  }
}

/**
 * Retries a previously failed or ignored integration event.
 * Requires `integration_logs.retry` permission.
 */
export async function retryIntegrationEventAction(eventId: string) {
  try {
    const { workspaceId, userId } = await requirePermission("integration_logs.retry");
    const result = await retryFailedEvent(workspaceId, eventId);

    await createAuditLog({
      workspaceId,
      userId,
      action: "INTEGRATION_EVENT_RETRIED",
      entityType: "INTEGRATION_EVENT",
      entityId: eventId,
      metadata: {
        success: result.success,
        statusCode: result.statusCode,
      },
    });

    revalidatePath("/app/integrations");
    revalidatePath("/app/integrations/logs");
    revalidatePath("/app/leads");

    return { success: result.success, message: result.message };
  } catch (err) {
    console.error("retryIntegrationEventAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to retry event",
    };
  }
}

/**
 * Legacy toggle action compatibility.
 */
export async function toggleIntegrationAction(
  provider: IntegrationProvider,
  status: IntegrationStatus
) {
  if (status === IntegrationStatus.DISCONNECTED) {
    return disconnectIntegrationAction(provider);
  }
  return { success: true };
}

/**
 * Trigger manual sync now (runs live pipeline sample).
 */
export async function syncIntegrationNowAction(provider: IntegrationProvider) {
  return sendTestLeadAction(provider);
}
