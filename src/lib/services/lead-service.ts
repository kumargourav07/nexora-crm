import prisma from "@/lib/prisma";
import { EventStatus, IntegrationProvider, LeadStatus } from "@prisma/client";
import { NormalizedLead } from "../integrations/types";
import { eventBus } from "@/lib/events/event-bus";
import { WorkflowTriggerType } from "@/lib/validations/automations";

export interface IngestionResult {
  success: boolean;
  leadId: string;
  isNew: boolean;
  isDuplicate: boolean;
  isMerged: boolean;
  message: string;
}

/**
 * Normalizes email by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalizes name by trimming excessive whitespace.
 */
export function normalizeName(name?: string | null): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ");
}

/**
 * Normalizes phone numbers consistently.
 * For India: supports +91 XXXXX XXXXX and standard 10-digit formats.
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.trim().replace(/[^\d+]/g, "");

  // If 10 digits starting with 6-9, standard Indian mobile
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }

  // If 11 digits starting with 0 followed by 6-9
  if (/^0[6-9]\d{9}$/.test(cleaned)) {
    const raw = cleaned.slice(1);
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  }

  // If starts with 91 and has 12 digits
  if (/^91[6-9]\d{9}$/.test(cleaned)) {
    const raw = cleaned.slice(2);
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  }

  // If starts with +91 and has 13 chars
  if (/^\+91[6-9]\d{9}$/.test(cleaned)) {
    const raw = cleaned.slice(3);
    return `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  }

  // Fallback: return cleaned string with spaces
  return cleaned || phone.trim();
}

/**
 * Validates normalized lead payload.
 */
export function validateLead(data: NormalizedLead): { isValid: boolean; error?: string } {
  if (!data.name || data.name.trim().length === 0) {
    return { isValid: false, error: "Lead name is required" };
  }
  if (!data.email && !data.phone) {
    return { isValid: false, error: "At least one contact method (email or phone) is required" };
  }
  if (!data.externalId) {
    return { isValid: false, error: "External ID is required for deduplication tracking" };
  }
  return { isValid: true };
}

/**
 * Robust, atomic lead ingestion engine with multi-level deduplication and UTM preservation.
 */
export async function ingestLeadFromConnector(
  workspaceId: string,
  integrationId: string | null,
  provider: IntegrationProvider,
  data: NormalizedLead,
  eventId?: string
): Promise<IngestionResult> {
  const validation = validateLead(data);
  if (!validation.isValid) {
    if (eventId) {
      await prisma.integrationEvent.update({
        where: { id: eventId },
        data: {
          status: EventStatus.FAILED,
          errorMessage: validation.error,
          processedAt: new Date(),
        },
      });
    }
    throw new Error(`Lead Validation Error: ${validation.error}`);
  }

  const cleanName = normalizeName(data.name);
  const cleanEmail = normalizeEmail(data.email);
  const cleanPhone = normalizePhone(data.phone);
  const extId = String(data.externalId).trim();

  // -------------------------------------------------------------
  // LEVEL 1 DEDUPLICATION: External Identity Check (Idempotency)
  // -------------------------------------------------------------
  const existingIdentity = await prisma.leadExternalIdentity.findUnique({
    where: {
      workspaceId_provider_externalId: {
        workspaceId,
        provider,
        externalId: extId,
      },
    },
    include: { lead: true },
  });

  if (existingIdentity && existingIdentity.lead) {
    const lead = existingIdentity.lead;

    // Record activity for repeat webhook/submission
    await prisma.activity.create({
      data: {
        workspaceId,
        leadId: lead.id,
        type: "lead_sync",
        title: `Duplicate Lead Event Ignored (${provider})`,
        description: `Received duplicate webhook with external ID ${extId}. Lead record preserved.`,
        author: "Connector Engine",
      },
    });

    if (eventId) {
      await prisma.integrationEvent.update({
        where: { id: eventId },
        data: {
          status: EventStatus.IGNORED,
          leadId: lead.id,
          errorMessage: "Duplicate external ID already ingested",
          processedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      leadId: lead.id,
      isNew: false,
      isDuplicate: true,
      isMerged: false,
      message: `Duplicate lead ignored (External ID: ${extId})`,
    };
  }

  // -------------------------------------------------------------
  // LEVEL 2 DEDUPLICATION: Email or Phone Match in Workspace
  // -------------------------------------------------------------
  let matchingLead = null;

  if (cleanEmail || cleanPhone) {
    const conditions = [];
    if (cleanEmail) conditions.push({ email: { equals: cleanEmail, mode: "insensitive" as const } });
    if (cleanPhone) conditions.push({ phone: { contains: cleanPhone.slice(-8) } });

    matchingLead = await prisma.lead.findFirst({
      where: {
        workspaceId,
        OR: conditions,
      },
    });
  }

  // Prepare tags including UTM tags
  const inboundTags = Array.isArray(data.tags) ? [...data.tags] : [`Source: ${provider}`];
  if (data.utmSource) inboundTags.push(`UTM Source: ${data.utmSource}`);
  if (data.utmCampaign) inboundTags.push(`Campaign: ${data.utmCampaign}`);

  if (matchingLead) {
    // Merge into existing lead
    await prisma.$transaction(async (tx) => {
      // 1. Create external identity link
      await tx.leadExternalIdentity.create({
        data: {
          workspaceId,
          leadId: matchingLead.id,
          integrationId,
          provider,
          externalId: extId,
          metadata: JSON.stringify({
            ...(data.metadata || {}),
            utmSource: data.utmSource,
            utmMedium: data.utmMedium,
            utmCampaign: data.utmCampaign,
            utmTerm: data.utmTerm,
            utmContent: data.utmContent,
          }),
        },
      });

      // 2. Append notes and merge tags
      const currentTags: string[] = matchingLead.tags ? JSON.parse(matchingLead.tags) : [];
      const newTags = Array.from(new Set([...currentTags, ...inboundTags]));

      let updatedNotes = matchingLead.notes || "";
      if (data.notes) {
        updatedNotes += `\n\n[Touchpoint from ${provider} - ${new Date().toLocaleDateString()}]:\n${data.notes}`;
      }

      await tx.lead.update({
        where: { id: matchingLead.id },
        data: {
          tags: JSON.stringify(newTags),
          notes: updatedNotes.trim(),
          updatedAt: new Date(),
          ...(matchingLead.value.toNumber() === 0 && data.value ? { value: data.value } : {}),
        },
      });

      // 3. Log audit activity
      await tx.activity.create({
        data: {
          workspaceId,
          leadId: matchingLead.id,
          type: "lead_merged",
          title: `Inbound Touchpoint Linked (${provider})`,
          description: `Contact matched existing lead via ${cleanEmail ? "email" : "phone"}. Appended touchpoint details.`,
          author: "Connector Engine",
        },
      });

      // 4. Update Integration counters if integration exists
      if (integrationId) {
        await tx.integration.update({
          where: { id: integrationId },
          data: {
            leadsSyncedToday: { increment: 1 },
            totalSynced: { increment: 1 },
            lastSync: new Date(),
            lastEventAt: new Date(),
          },
        });
      }

      // 5. Update event if provided
      if (eventId) {
        await tx.integrationEvent.update({
          where: { id: eventId },
          data: {
            status: EventStatus.PROCESSED,
            leadId: matchingLead.id,
            processedAt: new Date(),
          },
        });
      }
    });

    return {
      success: true,
      leadId: matchingLead.id,
      isNew: false,
      isDuplicate: false,
      isMerged: true,
      message: `Inbound touchpoint merged with existing lead ${matchingLead.name}`,
    };
  }

  // -------------------------------------------------------------
  // LEVEL 3: CREATE NEW LEAD
  // -------------------------------------------------------------
  const createdLead = await prisma.$transaction(async (tx) => {
    // 1. Determine owner
    let defaultOwnerName = data.ownerName || "Alex Chen";
    let defaultOwnerId: string | null = null;

    if (integrationId) {
      const integration = await tx.integration.findUnique({
        where: { id: integrationId },
      });
      if (integration?.defaultOwnerName) {
        defaultOwnerName = integration.defaultOwnerName;
      }
      if (integration?.defaultOwnerId) {
        defaultOwnerId = integration.defaultOwnerId;
      }
    }

    // 2. Create Lead
    const newLead = await tx.lead.create({
      data: {
        workspaceId,
        name: cleanName,
        company: (data.company || `${cleanName}'s Organization`).trim(),
        email: cleanEmail || `${extId.toLowerCase().replace(/[^a-z0-9]/g, "")}@inbound.lead`,
        phone: cleanPhone || "+91 00000 00000",
        source: data.source,
        status: LeadStatus.NEW,
        ownerId: defaultOwnerId,
        ownerName: defaultOwnerName,
        value: data.value || 0,
        tags: JSON.stringify(inboundTags),
        notes: data.notes || `Auto-ingested from ${provider} connector.`,
      },
    });

    // 3. Create External Identity
    await tx.leadExternalIdentity.create({
      data: {
        workspaceId,
        leadId: newLead.id,
        integrationId,
        provider,
        externalId: extId,
        metadata: JSON.stringify({
          ...(data.metadata || {}),
          utmSource: data.utmSource,
          utmMedium: data.utmMedium,
          utmCampaign: data.utmCampaign,
          utmTerm: data.utmTerm,
          utmContent: data.utmContent,
        }),
      },
    });

    // 4. Create Activity
    await tx.activity.create({
      data: {
        workspaceId,
        leadId: newLead.id,
        type: "lead_created",
        title: `Lead Ingested from ${provider}`,
        description: `New lead created with NEW status in sales pipeline. Source: ${provider}.`,
        author: "Connector Engine",
      },
    });

    // 5. Create Notification
    await tx.notification.create({
      data: {
        workspaceId,
        title: `New Lead: ${newLead.name}`,
        description: `Received from ${provider} (${newLead.company}). Value: ₹${(newLead.value.toNumber()).toLocaleString("en-IN")}`,
        type: "lead",
      },
    });

    // 6. Update Integration counters
    if (integrationId) {
      await tx.integration.update({
        where: { id: integrationId },
        data: {
          leadsSyncedToday: { increment: 1 },
          totalSynced: { increment: 1 },
          lastSync: new Date(),
          lastEventAt: new Date(),
        },
      });
    }

    // 7. Update Integration Event
    if (eventId) {
      await tx.integrationEvent.update({
        where: { id: eventId },
        data: {
          status: EventStatus.PROCESSED,
          leadId: newLead.id,
          processedAt: new Date(),
        },
      });
    }

    return newLead;
  });

  // Emit domain events
  eventBus.publish(
    eventBus.createEvent({
      workspaceId,
      type: WorkflowTriggerType.LEAD_SOURCE_RECEIVED,
      entityType: "LEAD",
      entityId: createdLead.id,
      payload: {
        id: createdLead.id,
        name: createdLead.name,
        company: createdLead.company,
        email: createdLead.email,
        phone: createdLead.phone,
        source: createdLead.source,
        provider,
        value: Number(createdLead.value),
      },
      context: { source: "CONNECTOR" },
    })
  );

  eventBus.publish(
    eventBus.createEvent({
      workspaceId,
      type: WorkflowTriggerType.LEAD_CREATED,
      entityType: "LEAD",
      entityId: createdLead.id,
      payload: {
        id: createdLead.id,
        name: createdLead.name,
        company: createdLead.company,
        email: createdLead.email,
        phone: createdLead.phone,
        source: createdLead.source,
        status: createdLead.status,
        value: Number(createdLead.value),
        ownerName: createdLead.ownerName,
      },
      context: { source: "CONNECTOR" },
    })
  );

  return {
    success: true,
    leadId: createdLead.id,
    isNew: true,
    isDuplicate: false,
    isMerged: false,
    message: `New lead created successfully: ${createdLead.name}`,
  };
}
