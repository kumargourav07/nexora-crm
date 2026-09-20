"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";
import { convertLeadSchema, ConvertLeadInput } from "@/lib/validations/sales";
import { LeadStatus, DealStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Executes atomic conversion of a Lead into Contact, Company, and Deal.
 */
export async function convertLeadAction(input: ConvertLeadInput) {
  try {
    const { workspaceId, userId, session } = await requirePermission("leads.update");

    const validation = convertLeadSchema.safeParse(input);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues[0]?.message || "Invalid conversion payload",
      };
    }

    const data = validation.data;

    // 1. Fetch lead
    const lead = await prisma.lead.findFirst({
      where: { id: data.leadId, workspaceId },
    });

    if (!lead) {
      return { success: false, error: "Lead not found in workspace" };
    }

    if (lead.isConverted) {
      return {
        success: false,
        error: "Lead already converted.",
      };
    }

    // 2. Execute conversion in an atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      let companyId: string | null = data.useExistingCompanyId || null;
      let companyName = "";

      // Handle Company Creation / Association
      if (!companyId && data.createCompany && data.companyData?.name?.trim()) {
        const compData = data.companyData;
        const normalizedName = compData.name.trim();

        // Check duplicate within workspace
        const existingCompany = await tx.company.findFirst({
          where: {
            workspaceId,
            name: { equals: normalizedName, mode: "insensitive" as Prisma.QueryMode },
          },
        });

        if (existingCompany) {
          companyId = existingCompany.id;
          companyName = existingCompany.name;
        } else {
          const newCompany = await tx.company.create({
            data: {
              workspaceId,
              name: compData.name.trim(),
              website: compData.website || null,
              industry: compData.industry || null,
              phone: compData.phone || lead.phone || null,
              email: compData.email || lead.email || null,
              address: compData.address || null,
              ownerId: lead.ownerId || userId,
            },
          });
          companyId = newCompany.id;
          companyName = newCompany.name;
        }
      }

      // Handle Contact Creation / Association
      let contactId: string | null = data.useExistingContactId || null;
      let contactName = "";

      if (!contactId && data.createContact && data.contactData?.firstName?.trim()) {
        const cData = data.contactData;
        const email = cData.email?.trim() || null;
        const phone = cData.phone?.trim() || null;

        // Check duplicate contact by email or phone
        let existingContact = null;
        if (email || phone) {
          existingContact = await tx.contact.findFirst({
            where: {
              workspaceId,
              OR: [
                ...(email ? [{ email: { equals: email, mode: "insensitive" as Prisma.QueryMode } }] : []),
                ...(phone ? [{ phone: { equals: phone } }] : []),
              ],
            },
          });
        }

        if (existingContact) {
          contactId = existingContact.id;
          contactName = [existingContact.firstName, existingContact.lastName]
            .filter(Boolean)
            .join(" ");
          // If existing contact has no company and companyId is now known, update it
          if (!existingContact.companyId && companyId) {
            await tx.contact.update({
              where: { id: existingContact.id },
              data: { companyId },
            });
          }
        } else {
          const newContact = await tx.contact.create({
            data: {
              workspaceId,
              firstName: cData.firstName.trim(),
              lastName: cData.lastName?.trim() || null,
              email,
              phone,
              jobTitle: cData.jobTitle?.trim() || null,
              companyId,
              ownerId: lead.ownerId || userId,
            },
          });
          contactId = newContact.id;
          contactName = [newContact.firstName, newContact.lastName].filter(Boolean).join(" ");
        }
      }

      // Handle Deal Creation
      let dealId: string | null = null;
      let dealName = "";

      if (data.createDeal && data.dealData?.name?.trim() && data.dealData.pipelineId && data.dealData.stageId) {
        const dData = data.dealData;

        // Validate stage
        const stage = await tx.pipelineStage.findFirst({
          where: {
            id: dData.stageId,
            pipelineId: dData.pipelineId,
            workspaceId,
          },
        });

        if (!stage) {
          throw new Error("Target pipeline stage not found");
        }

        const newDeal = await tx.deal.create({
          data: {
            workspaceId,
            name: dData.name.trim(),
            contactId,
            companyId,
            ownerId: lead.ownerId || userId,
            ownerName: lead.ownerName || session.name,
            pipelineId: dData.pipelineId,
            stageId: dData.stageId,
            value: new Prisma.Decimal(dData.value || Number(lead.value) || 0),
            currency: "INR",
            probability: dData.probability ?? stage.probability,
            expectedCloseDate: dData.expectedCloseDate ? new Date(dData.expectedCloseDate) : null,
            source: lead.source, // Preserve original source!
            description: dData.description || lead.notes || null,
            status: DealStatus.OPEN,
          },
        });

        dealId = newDeal.id;
        dealName = newDeal.name;
      }

      // Mark Lead as converted
      const now = new Date();
      await tx.lead.update({
        where: { id: lead.id },
        data: {
          isConverted: true,
          convertedAt: now,
          convertedContactId: contactId,
          convertedCompanyId: companyId,
          convertedDealId: dealId,
          status: LeadStatus.QUALIFIED,
        },
      });

      // Activities on Lead, Deal, Contact, Company
      const conversionSummary = [
        contactName ? `Contact (${contactName})` : null,
        companyName ? `Company (${companyName})` : null,
        dealName ? `Deal (${dealName})` : null,
      ]
        .filter(Boolean)
        .join(", ");

      await tx.activity.create({
        data: {
          workspaceId,
          leadId: lead.id,
          dealId,
          contactId,
          companyId,
          userId,
          type: "lead_converted",
          title: "Lead Converted",
          description: `Converted lead "${lead.name}" to: ${conversionSummary}`,
          metadata: JSON.stringify({ contactId, companyId, dealId }),
          author: session.name,
        },
      });

      // Compliance Audit Log
      await tx.auditLog.create({
        data: {
          workspaceId,
          userId,
          action: "LEAD_CONVERTED",
          entityType: "LEAD",
          entityId: lead.id,
          metadata: JSON.stringify({
            leadName: lead.name,
            contactId,
            companyId,
            dealId,
            dealValue: data.dealData?.value || Number(lead.value),
          }),
        },
      });

      return {
        contactId,
        companyId,
        dealId,
        contactName,
        companyName,
        dealName,
      };
    });

    revalidatePath("/app/leads");
    revalidatePath(`/app/leads/${lead.id}`);
    revalidatePath("/app/contacts");
    revalidatePath("/app/companies");
    revalidatePath("/app/deals");
    revalidatePath("/app/pipeline");
    revalidatePath("/app/forecast");
    revalidatePath("/app/dashboard");

    // Publish event bus triggers
    if (result.dealId) {
      eventBus.publish(
        eventBus.createEvent({
          workspaceId,
          type: WorkflowTriggerType.DEAL_CREATED,
          entityType: "DEAL",
          entityId: result.dealId,
          payload: {
            id: result.dealId,
            name: result.dealName,
            leadId: lead.id,
            contactId: result.contactId,
            companyId: result.companyId,
          },
          context: { source: "LEAD_CONVERSION" },
        })
      );
    }

    eventBus.publish(
      eventBus.createEvent({
        workspaceId,
        type: WorkflowTriggerType.LEAD_STATUS_CHANGED,
        entityType: "LEAD",
        entityId: lead.id,
        payload: {
          id: lead.id,
          name: lead.name,
          status: LeadStatus.QUALIFIED,
          isConverted: true,
          convertedDealId: result.dealId,
        },
        context: { source: "CONVERSION" },
      })
    );

    return {
      success: true,
      data: result,
      message: "Lead converted successfully.",
    };
  } catch (err) {
    console.error("convertLeadAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to convert lead",
    };
  }
}
