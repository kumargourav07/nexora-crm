"use server";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/permissions";

export interface SearchResultItem {
  id: string;
  type: "lead" | "deal" | "contact" | "company" | "task" | "invoice" | "employee" | "workflow" | "communication" | "followup";
  title: string;
  subtitle: string;
  badge?: string;
  url: string;
}

export interface GlobalSearchResponse {
  results: Record<string, SearchResultItem[]>;
  totalCount: number;
}

/**
 * Searches across Leads, Deals, Contacts, Companies, Tasks, Invoices, Employees, Workflows, Communications, Follow-ups strictly scoped to the workspace.
 */
export async function globalSearchAction(query: string): Promise<{
  success: boolean;
  data?: GlobalSearchResponse;
  error?: string;
}> {
  try {
    const { workspaceId } = await requirePermission("workspace.read");

    if (!query || query.trim().length < 2) {
      return {
        success: true,
        data: {
          results: {
            leads: [],
            deals: [],
            contacts: [],
            companies: [],
            communications: [],
            followups: [],
            tasks: [],
            invoices: [],
            employees: [],
            workflows: [],
          },
          totalCount: 0,
        },
      };
    }

    const term = query.trim();

    const [leads, deals, contacts, companies, communications, followups, tasks, invoices, employees, workflows] =
      await Promise.all([
        // Leads
        prisma.lead.findMany({
          where: {
            workspaceId,
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { company: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Deals
        prisma.deal.findMany({
          where: {
            workspaceId,
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { contact: { firstName: { contains: term, mode: "insensitive" } } },
              { company: { name: { contains: term, mode: "insensitive" } } },
            ],
          },
          include: {
            stage: { select: { name: true } },
          },
          take: 5,
        }),
        // Contacts
        prisma.contact.findMany({
          where: {
            workspaceId,
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { phone: { contains: term, mode: "insensitive" } },
            ],
          },
          include: {
            company: { select: { name: true } },
          },
          take: 5,
        }),
        // Companies
        prisma.company.findMany({
          where: {
            workspaceId,
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { industry: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Communications
        prisma.communication.findMany({
          where: {
            workspaceId,
            OR: [
              { subject: { contains: term, mode: "insensitive" } },
              { content: { contains: term, mode: "insensitive" } },
              { recipientEmail: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Follow-ups
        prisma.followUp.findMany({
          where: {
            workspaceId,
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { notes: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Tasks
        prisma.task.findMany({
          where: {
            workspaceId,
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Invoices
        prisma.invoice.findMany({
          where: {
            workspaceId,
            OR: [
              { invoiceNumber: { contains: term, mode: "insensitive" } },
              { customerName: { contains: term, mode: "insensitive" } },
              { customerCompany: { contains: term, mode: "insensitive" } },
              { customerEmail: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Employees
        prisma.employee.findMany({
          where: {
            workspaceId,
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
              { role: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
        // Workflows
        prisma.workflow.findMany({
          where: {
            workspaceId,
            status: { not: "ARCHIVED" as any },
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { description: { contains: term, mode: "insensitive" } },
            ],
          },
          take: 5,
        }),
      ]);

    const leadItems: SearchResultItem[] = leads.map((l) => ({
      id: l.id,
      type: "lead",
      title: l.name,
      subtitle: `${l.company} • ${l.email}`,
      badge: l.status,
      url: `/app/leads/${l.id}`,
    }));

    const dealItems: SearchResultItem[] = deals.map((d) => ({
      id: d.id,
      type: "deal",
      title: d.name,
      subtitle: `${d.stage?.name || "Deal"} • ₹${Number(d.value).toLocaleString("en-IN")}`,
      badge: d.status,
      url: `/app/deals/${d.id}`,
    }));

    const contactItems: SearchResultItem[] = contacts.map((c) => ({
      id: c.id,
      type: "contact",
      title: `${c.firstName} ${c.lastName || ""}`.trim(),
      subtitle: `${c.jobTitle ? `${c.jobTitle} • ` : ""}${c.company?.name || c.email || "Contact"}`,
      url: `/app/contacts/${c.id}`,
    }));

    const companyItems: SearchResultItem[] = companies.map((comp) => ({
      id: comp.id,
      type: "company",
      title: comp.name,
      subtitle: `${comp.industry || "Company"} • ${comp.email || ""}`,
      url: `/app/companies/${comp.id}`,
    }));

    const commItems: SearchResultItem[] = communications.map((comm) => ({
      id: comm.id,
      type: "communication",
      title: comm.subject || `${comm.type} Interaction`,
      subtitle: `${comm.type} • ${comm.ownerName} • ${comm.content.substring(0, 50)}`,
      badge: comm.status,
      url: `/app/communications`,
    }));

    const followUpItems: SearchResultItem[] = followups.map((fu) => ({
      id: fu.id,
      type: "followup",
      title: fu.title,
      subtitle: `Due: ${new Date(fu.dueAt).toLocaleDateString()} • ${fu.type}`,
      badge: fu.status,
      url: `/app/follow-ups`,
    }));

    const taskItems: SearchResultItem[] = tasks.map((t) => ({
      id: t.id,
      type: "task",
      title: t.title,
      subtitle: `Due: ${new Date(t.dueDate).toLocaleDateString()} • Priority: ${t.priority}`,
      badge: t.status,
      url: `/app/dashboard`,
    }));

    const invoiceItems: SearchResultItem[] = invoices.map((inv) => ({
      id: inv.id,
      type: "invoice",
      title: `Invoice #${inv.invoiceNumber}`,
      subtitle: `${inv.customerName} • ₹${Number(inv.total).toLocaleString("en-IN")}`,
      badge: inv.status,
      url: `/app/invoices/${inv.id}`,
    }));

    const employeeItems: SearchResultItem[] = employees.map((e) => ({
      id: e.id,
      type: "employee",
      title: e.name,
      subtitle: `${e.role} • ${e.department}`,
      badge: e.status,
      url: `/app/employees`,
    }));

    const workflowItems: SearchResultItem[] = workflows.map((wf) => ({
      id: wf.id,
      type: "workflow",
      title: wf.name,
      subtitle: `${wf.triggerType} • ${wf.description || "Automation Workflow"}`,
      badge: wf.status,
      url: `/app/automations/${wf.id}`,
    }));

    const totalCount =
      leadItems.length +
      dealItems.length +
      contactItems.length +
      companyItems.length +
      commItems.length +
      followUpItems.length +
      taskItems.length +
      invoiceItems.length +
      employeeItems.length +
      workflowItems.length;

    return {
      success: true,
      data: {
        results: {
          deals: dealItems,
          contacts: contactItems,
          companies: companyItems,
          leads: leadItems,
          communications: commItems,
          followups: followUpItems,
          tasks: taskItems,
          invoices: invoiceItems,
          employees: employeeItems,
          workflows: workflowItems,
        },
        totalCount,
      },
    };
  } catch (err) {
    console.error("globalSearchAction error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Global search failed",
    };
  }
}
